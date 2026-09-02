let cloudReady = false;
let cloudTimer = 0;
let skipCloudPush = false;
let lastCloudError = "";
let cloudDirty = false;
let cloudUnsub = null;
let cloudHydrated = false;
let firebaseAuthReady = false;

function cloudEnabled() {
  return Boolean(window.firebase && firebaseConfig?.projectId);
}

function cloudUser() {
  try {
    return firebase.auth().currentUser;
  } catch {
    return null;
  }
}

function cloudStatus() {
  if (!cloudEnabled()) return "sin-sdk";
  if (!firebaseAuthReady) return "cargando";
  if (cloudUser()) return "ok";
  return "pendiente";
}

function cloudInit() {
  if (!cloudEnabled()) {
    firebaseAuthReady = true;
    return;
  }
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  cloudReady = true;
  firebase
    .auth()
    .setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((err) => console.warn(err));
  firebase.auth().onAuthStateChanged(async (user) => {
    firebaseAuthReady = true;
    if (cloudUnsub) {
      cloudUnsub();
      cloudUnsub = null;
    }
    cloudHydrated = false;
    if (user && isAuthed()) {
      cloudListen();
      await cloudReconcile();
    }
    route();
  });
  window.addEventListener("online", () => cloudFlush(true));
}

function cloudListen() {
  const ref = cloudDoc();
  if (!ref) return;
  cloudUnsub = ref.onSnapshot(
    (snap) => {
      if (skipCloudPush) return;
      if (!snap.exists) {
        cloudHydrated = true;
        if (richness(state) > 0) cloudFlush(true);
        return;
      }
      const remote = snap.data() || {};
      const cloudAt = Number(remote.updatedAt || 0);
      const localAt = Number(state.updatedAt || 0);
      const remoteRich = richness(remote.data);
      const localRich = richness(state);
      if (localRich > remoteRich) {
        cloudFlush(true);
        cloudHydrated = true;
        return;
      }
      if (cloudDirty && localAt > cloudAt) return;
      if (remote.data && (cloudAt > localAt || !cloudHydrated)) {
        applyRemote(remote);
      }
      cloudHydrated = true;
    },
    (err) => {
      lastCloudError = err?.message || "No se pudo escuchar Firestore.";
      console.warn(err);
    }
  );
}

function applyRemote(remote) {
  const typing =
    document.activeElement &&
    /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
  skipCloudPush = true;
  cloudDirty = false;
  state = { ...defaultState(), ...remote.data, updatedAt: Number(remote.updatedAt || 0) };
  if (state.personal?.gcalClientId) gcalSaveClient(state.personal.gcalClientId);
  localStorage.setItem(KEY, JSON.stringify(state));
  skipCloudPush = false;
  lastCloudError = "";
  if (!typing && isAuthed() && cloudUser()) route();
}

function richness(s) {
  if (!s) return 0;
  const p = s.personal || {};
  const days = Object.values(s.days || {});
  const months = Object.values(s.months || {});
  const events = Object.values(s.events || {}).flat();
  return [
    p.nombre,
    p.sueno,
    p.telefono,
    p.emergencia,
    ...days.map((d) => (typeof d === "string" ? d : [d?.plan, d?.log].join(" "))),
    ...months.map((m) => [m?.objetivos, m?.tareas, m?.logros].join(" ")),
    ...events.map((e) => e?.title || "")
  ].join("").length;
}

async function cloudLogin(email, password) {
  if (!cloudEnabled()) return false;
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    lastCloudError = "";
    return true;
  } catch (err) {
    const code = err?.code || "";
    if (
      code === "auth/user-not-found" ||
      code === "auth/invalid-credential" ||
      code === "auth/invalid-login-credentials"
    ) {
      try {
        await firebase.auth().createUserWithEmailAndPassword(email, password);
        lastCloudError = "";
        return true;
      } catch (createErr) {
        if (createErr?.code === "auth/email-already-in-use") {
          try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
            lastCloudError = "";
            return true;
          } catch {
            lastCloudError = "La clave de Firebase no coincide. Entra con la misma clave en todos los aparatos.";
          }
        } else if (createErr?.code === "auth/unauthorized-domain") {
          lastCloudError = "En Firebase → Authentication → Settings → Authorized domains agrega raimundoibieta.github.io";
        } else {
          lastCloudError = createErr?.message || "No se pudo crear la cuenta en la nube.";
        }
        console.warn(createErr);
        return false;
      }
    }
    if (code === "auth/unauthorized-domain") {
      lastCloudError = "En Firebase → Authentication → Settings → Authorized domains agrega raimundoibieta.github.io";
    } else {
      lastCloudError = err?.message || "La nube no conectó.";
    }
    console.warn(err);
    return false;
  }
}

async function cloudLogout() {
  try {
    if (cloudUnsub) {
      cloudUnsub();
      cloudUnsub = null;
    }
    firebaseAuthReady = true;
    if (cloudEnabled()) await firebase.auth().signOut();
  } catch (err) {
    console.warn(err);
  }
}

function cloudDoc() {
  const user = cloudUser();
  if (!user) return null;
  return firebase.firestore().collection("captains").doc(user.uid);
}

function cloudPayload() {
  return JSON.parse(
    JSON.stringify({
      updatedAt: Number(state.updatedAt || Date.now()),
      email: AUTH_EMAIL,
      data: state
    })
  );
}

function cloudSchedulePush() {
  if (skipCloudPush || !cloudUser() || !cloudDirty) return;
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => {
    cloudPush().catch((err) => console.warn(err));
  }, 120);
}

async function cloudFlush(force = false) {
  clearTimeout(cloudTimer);
  if (force) {
    cloudDirty = true;
    if (!state.updatedAt) state.updatedAt = Date.now();
  }
  if (!cloudDirty) return false;
  return cloudPush();
}

async function cloudPush() {
  const ref = cloudDoc();
  if (!ref) return false;
  skipCloudPush = true;
  try {
    await ref.set(cloudPayload());
    cloudDirty = false;
    lastCloudError = "";
    return true;
  } catch (err) {
    lastCloudError = err?.message || "No se pudo guardar en la nube.";
    console.warn(err);
    return false;
  } finally {
    skipCloudPush = false;
  }
}

async function cloudReconcile() {
  const ref = cloudDoc();
  if (!ref) return false;
  try {
    const snap = await ref.get();
    const localRich = richness(state);
    if (!snap.exists) {
      cloudHydrated = true;
      if (localRich > 0) await cloudFlush(true);
      return false;
    }
    const remote = snap.data() || {};
    const remoteRich = richness(remote.data);
    if (localRich > remoteRich) {
      cloudHydrated = true;
      await cloudFlush(true);
      return false;
    }
    if (remote.data) applyRemote(remote);
    cloudHydrated = true;
    return true;
  } catch (err) {
    lastCloudError = err?.message || "No se pudo leer Firestore.";
    console.warn(err);
    return false;
  }
}

async function cloudPull() {
  return cloudReconcile();
}
