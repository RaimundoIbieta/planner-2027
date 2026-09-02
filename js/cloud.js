let cloudReady = false;
let cloudTimer = 0;
let skipCloudPush = false;
let lastCloudError = "";
let cloudDirty = false;
let cloudUnsub = null;
let cloudHydrated = false;

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
  if (cloudUser()) return "ok";
  return "pendiente";
}

function cloudInit() {
  if (!cloudEnabled()) return;
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  cloudReady = true;
  firebase.auth().onAuthStateChanged((user) => {
    if (cloudUnsub) {
      cloudUnsub();
      cloudUnsub = null;
    }
    cloudHydrated = false;
    if (!user || !isAuthed()) return;
    cloudListen();
  });
  window.addEventListener("online", () => {
    cloudFlush();
  });
}

function cloudListen() {
  const ref = cloudDoc();
  if (!ref) return;
  cloudUnsub = ref.onSnapshot(
    (snap) => {
      if (skipCloudPush) return;
      if (!snap.exists) {
        cloudHydrated = true;
        if (cloudDirty || richness(state) > 0) cloudFlush();
        return;
      }
      const remote = snap.data() || {};
      const cloudAt = Number(remote.updatedAt || 0);
      const localAt = Number(state.updatedAt || 0);
      if (cloudDirty && localAt > cloudAt) return;
      if (remote.data && (cloudAt > localAt || (!localAt && !cloudHydrated))) {
        if (cloudAt > localAt && richness(remote.data) < 8 && richness(state) > 8) {
          cloudDirty = true;
          state.updatedAt = Date.now();
          cloudFlush();
          cloudHydrated = true;
          return;
        }
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
  if (!typing && isAuthed()) route();
}

function richness(s) {
  const p = s?.personal || {};
  const days = Object.values(s?.days || {});
  const events = Object.values(s?.events || {}).flat();
  return [p.nombre, p.sueno, p.telefono, p.emergencia, ...days.map((d) => (d && d.log) || d || ""), ...events.map((e) => e.title || "")].join("").length;
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
          lastCloudError = "La cuenta de Firebase existe, pero la clave no coincide.";
        } else if (createErr?.code === "auth/unauthorized-domain") {
          lastCloudError = "Falta agregar raimundoibieta.github.io en Authentication → Settings → Authorized domains.";
        } else {
          lastCloudError = createErr?.message || "No se pudo crear la cuenta en la nube.";
        }
        console.warn(createErr);
        return false;
      }
    }
    if (code === "auth/unauthorized-domain") {
      lastCloudError = "Falta agregar raimundoibieta.github.io en Authentication → Settings → Authorized domains.";
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
    if (cloudEnabled()) await firebase.auth().signOut();
  } catch (err) {
    console.warn(err);
  }
}

function cloudDoc() {
  const user = cloudUser();
  if (!user) return null;
  return firebase.firestore().doc(`captains/${user.uid}`);
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
  }, 180);
}

async function cloudFlush() {
  clearTimeout(cloudTimer);
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

async function cloudPull() {
  const ref = cloudDoc();
  if (!ref) return false;
  try {
    const snap = await ref.get();
    if (!snap.exists) {
      cloudHydrated = true;
      return false;
    }
    const remote = snap.data() || {};
    const cloudAt = Number(remote.updatedAt || 0);
    const localAt = Number(state.updatedAt || 0);
    if (remote.data && cloudAt >= localAt) {
      applyRemote(remote);
      cloudHydrated = true;
      return true;
    }
    cloudHydrated = true;
    return false;
  } catch (err) {
    lastCloudError = err?.message || "No se pudo leer Firestore.";
    console.warn(err);
    return false;
  }
}
