let cloudReady = false;
let cloudTimer = 0;
let skipCloudPush = false;
let lastCloudError = "";

function cloudEnabled() {
  return Boolean(window.firebase?.apps && firebaseConfig?.projectId);
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
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user || !isAuthed()) return;
    const changed = await cloudPull();
    if (changed) route();
  });
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
  if (skipCloudPush || !cloudUser()) return;
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => {
    cloudPush().catch((err) => console.warn(err));
  }, 800);
}

async function cloudPush() {
  const ref = cloudDoc();
  if (!ref) return false;
  state.updatedAt = Date.now();
  localStorage.setItem(KEY, JSON.stringify(state));
  await ref.set(cloudPayload());
  lastCloudError = "";
  return true;
}

async function cloudPull() {
  const ref = cloudDoc();
  if (!ref) return false;
  try {
    const snap = await ref.get();
    const localAt = Number(state.updatedAt || 0);
    if (!snap.exists) {
      if (localAt || JSON.stringify(state) !== JSON.stringify(defaultState())) {
        await cloudPush();
      }
      return false;
    }
    const remote = snap.data() || {};
    const cloudAt = Number(remote.updatedAt || 0);
    if (cloudAt > localAt && remote.data) {
      skipCloudPush = true;
      state = { ...defaultState(), ...remote.data, updatedAt: cloudAt };
      localStorage.setItem(KEY, JSON.stringify(state));
      skipCloudPush = false;
      return true;
    }
    if (localAt > cloudAt) await cloudPush();
    return false;
  } catch (err) {
    lastCloudError = err?.message || "No se pudo leer Firestore.";
    console.warn(err);
    return false;
  }
}

async function cloudSyncNow() {
  if (!cloudUser()) {
    toast("Pulsa Salir y entra otra vez para conectar la nube.");
    return;
  }
  const changed = await cloudPull();
  await cloudPush();
  if (changed) route();
  toast("Bitácora sincronizada");
}
