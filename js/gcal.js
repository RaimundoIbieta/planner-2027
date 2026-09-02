const GCAL_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const GCAL_TOKEN_KEY = "op-planner-gcal-token";
const GCAL_EXPIRES_KEY = "op-planner-gcal-expires";
const GCAL_CLIENT_KEY = "op-planner-gcal-client";

let gcalTokenClient = null;
let gcalWaiters = [];

function gcalClientId() {
  const fromFile = typeof GOOGLE_CLIENT_ID === "string" ? GOOGLE_CLIENT_ID.trim() : "";
  const fromCloud = state?.personal?.gcalClientId || "";
  return (localStorage.getItem(GCAL_CLIENT_KEY) || fromCloud || fromFile || "").trim();
}

function gcalEnabled() {
  return Boolean(gcalClientId());
}

function gcalConnected() {
  const token = gcalToken();
  const exp = Number(localStorage.getItem(GCAL_EXPIRES_KEY) || 0);
  return Boolean(token && exp > Date.now() + 15000);
}

function gcalToken() {
  return localStorage.getItem(GCAL_TOKEN_KEY);
}

function gcalSaveClient(id) {
  const value = String(id || "").trim();
  if (value) localStorage.setItem(GCAL_CLIENT_KEY, value);
  else localStorage.removeItem(GCAL_CLIENT_KEY);
  gcalTokenClient = null;
}

function gcalStoreToken(accessToken, expiresIn) {
  localStorage.setItem(GCAL_TOKEN_KEY, accessToken);
  const ms = Math.max(30, Number(expiresIn) || 3600) * 1000;
  localStorage.setItem(GCAL_EXPIRES_KEY, String(Date.now() + ms));
}

function gcalInit() {
  if (!gcalEnabled() || !window.google?.accounts?.oauth2) return;
  gcalTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: gcalClientId(),
    scope: GCAL_SCOPE,
    callback: (resp) => {
      if (resp.error) {
        toast("No se pudo conectar Google Calendar");
        gcalWaiters.splice(0).forEach((w) => w(false));
        return;
      }
      gcalStoreToken(resp.access_token, resp.expires_in);
      toast("Google Calendar conectado");
      gcalWaiters.splice(0).forEach((w) => w(true));
      if (isAuthed()) route();
    }
  });
}

function gcalConnect() {
  return gcalEnsure(true);
}

function gcalEnsure(forcePrompt = false) {
  return new Promise((resolve) => {
    if (gcalConnected() && !forcePrompt) {
      resolve(true);
      return;
    }
    if (!gcalEnabled()) {
      resolve(false);
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      toast("Google aún no carga. Recarga la página.");
      resolve(false);
      return;
    }
    gcalInit();
    if (!gcalTokenClient) {
      resolve(false);
      return;
    }
    gcalWaiters.push(resolve);
    gcalTokenClient.requestAccessToken({
      prompt: forcePrompt || !gcalToken() ? "consent" : ""
    });
  });
}

function gcalDisconnect() {
  const token = gcalToken();
  if (token && window.google?.accounts?.oauth2) {
    google.accounts.oauth2.revoke(token, () => {});
  }
  localStorage.removeItem(GCAL_TOKEN_KEY);
  localStorage.removeItem(GCAL_EXPIRES_KEY);
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
    localStorage.removeItem(GCAL_TOKEN_KEY);
    localStorage.removeItem(GCAL_EXPIRES_KEY);
    throw new Error("expired");
  }
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

function toGcalEvent(local, dateIso) {
  let start = local.start || "09:00";
  let end = local.end || "";
  if (!end || end <= start) {
    const [h, m] = start.split(":").map(Number);
    end = `${String((h + 1) % 24).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
  }
  return {
    summary: local.title,
    description: "Planner 2027",
    start: { dateTime: `${dateIso}T${start}:00`, timeZone: "America/Santiago" },
    end: { dateTime: `${dateIso}T${end}:00`, timeZone: "America/Santiago" }
  };
}

async function gcalPush(local, dateIso, retried = false) {
  const ready = await gcalEnsure(false);
  if (!ready) return local;
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
    if (!retried && String(err.message) === "expired") {
      const ok = await gcalEnsure(true);
      if (ok) return gcalPush(local, dateIso, true);
    }
    console.warn(err);
    toast("En el planner sí. Google no alcanzó a guardar.");
    return local;
  }
}

async function gcalRemove(gcalId) {
  if (!gcalId) return;
  const ready = await gcalEnsure(false);
  if (!ready) return;
  try {
    await gcalFetch(`/calendars/primary/events/${encodeURIComponent(gcalId)}`, { method: "DELETE" });
  } catch (err) {
    console.warn(err);
  }
}

async function gcalPullMonth(year, month) {
  const ready = await gcalEnsure(false);
  if (!ready) return false;
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
    if (added) persist(true);
    return added > 0;
  } catch (err) {
    console.warn(err);
    return false;
  }
}
