const GCAL_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const GCAL_TOKEN_KEY = "op-planner-gcal-token";
const GCAL_CLIENT_KEY = "op-planner-gcal-client";

let gcalTokenClient = null;

function gcalClientId() {
  const fromFile = typeof GOOGLE_CLIENT_ID === "string" ? GOOGLE_CLIENT_ID.trim() : "";
  return (localStorage.getItem(GCAL_CLIENT_KEY) || fromFile || "").trim();
}

function gcalEnabled() {
  return Boolean(gcalClientId());
}

function gcalConnected() {
  return Boolean(sessionStorage.getItem(GCAL_TOKEN_KEY));
}

function gcalToken() {
  return sessionStorage.getItem(GCAL_TOKEN_KEY);
}

function gcalSaveClient(id) {
  const value = String(id || "").trim();
  if (value) localStorage.setItem(GCAL_CLIENT_KEY, value);
  else localStorage.removeItem(GCAL_CLIENT_KEY);
  gcalTokenClient = null;
}

function gcalInit() {
  if (!gcalEnabled() || !window.google?.accounts?.oauth2) return;
  gcalTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: gcalClientId(),
    scope: GCAL_SCOPE,
    callback: (resp) => {
      if (resp.error) {
        toast("No se pudo conectar Google Calendar");
        return;
      }
      sessionStorage.setItem(GCAL_TOKEN_KEY, resp.access_token);
      toast("Google Calendar conectado");
      route();
    }
  });
}

function gcalConnect() {
  if (!gcalEnabled()) {
    toast("Pega el ID de cliente en Perfil");
    return;
  }
  if (!window.google?.accounts?.oauth2) {
    toast("Google aún no carga. Recarga la página.");
    return;
  }
  gcalInit();
  gcalTokenClient?.requestAccessToken({ prompt: gcalConnected() ? "" : "consent" });
}

function gcalDisconnect() {
  const token = gcalToken();
  if (token && window.google?.accounts?.oauth2) {
    google.accounts.oauth2.revoke(token, () => {});
  }
  sessionStorage.removeItem(GCAL_TOKEN_KEY);
  toast("Google Calendar desconectado");
  route();
}

async function gcalFetch(path, options = {}) {
  const token = gcalToken();
  if (!token) throw new Error("no-token");
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (res.status === 401) {
    sessionStorage.removeItem(GCAL_TOKEN_KEY);
    throw new Error("expired");
  }
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

function toGcalEvent(local, dateIso) {
  const start = local.start || "09:00";
  const end = local.end || local.start || "10:00";
  return {
    summary: local.title,
    description: "Planner 2027",
    start: { dateTime: `${dateIso}T${start}:00`, timeZone: "America/Santiago" },
    end: { dateTime: `${dateIso}T${end}:00`, timeZone: "America/Santiago" }
  };
}

async function gcalPush(local, dateIso) {
  if (!gcalConnected()) return local;
  try {
    if (local.gcalId) {
      await gcalFetch(`/calendars/primary/events/${encodeURIComponent(local.gcalId)}`, {
        method: "PUT",
        body: JSON.stringify(toGcalEvent(local, dateIso))
      });
      return local;
    }
    const created = await gcalFetch("/calendars/primary/events", {
      method: "POST",
      body: JSON.stringify(toGcalEvent(local, dateIso))
    });
    local.gcalId = created.id;
    return local;
  } catch (err) {
    console.warn(err);
    toast("Guardado aquí. Google no respondió.");
    return local;
  }
}

async function gcalRemove(gcalId) {
  if (!gcalConnected() || !gcalId) return;
  try {
    await gcalFetch(`/calendars/primary/events/${encodeURIComponent(gcalId)}`, { method: "DELETE" });
  } catch (err) {
    console.warn(err);
  }
}

async function gcalPullMonth(year, month) {
  if (!gcalConnected()) return false;
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 1).toISOString();
  try {
    const data = await gcalFetch(
      `/calendars/primary/events?timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}&singleEvents=true&orderBy=startTime`
    );
    let added = 0;
    for (const item of data.items || []) {
      const stamp = item.start?.dateTime || item.start?.date;
      if (!stamp) continue;
      const day = stamp.slice(0, 10);
      const list = eventsOn(parseISO(day));
      if (list.some((e) => e.gcalId === item.id)) continue;
      list.push({
        id: "g-" + item.id,
        title: item.summary || "(sin título)",
        start: (item.start?.dateTime || "").slice(11, 16),
        end: (item.end?.dateTime || "").slice(11, 16),
        gcalId: item.id
      });
      added += 1;
    }
    if (added) persist();
    return added > 0;
  } catch (err) {
    console.warn(err);
    return false;
  }
}
