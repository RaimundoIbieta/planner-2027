const YEAR = 2027;
const KEY = "onepiece-planner-2027";
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
const DOW = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DOW_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const AUTH_KEY = "op-planner-2027-auth";

const ui = { month: 1, week: 1, quarter: 1 };
const gcalPulled = new Set();
let state = loadState();
let saveTimer = 0;

function pad(n) {
  return String(n).padStart(2, "0");
}

function iso(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISO(s) {
  const [y, m, d] = String(s).split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return Number.isNaN(date.getTime()) ? plannerDate() : date;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

function buildWeeks() {
  const weeks = [];
  const cursor = new Date(2026, 11, 28);
  const last = new Date(2028, 0, 2);
  let id = 1;
  while (cursor <= last) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push({ id, days, start: days[0], end: days[6] });
    id += 1;
  }
  return weeks;
}

const WEEKS = buildWeeks();

function weekForDate(date) {
  const t = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return WEEKS.find((w) => t >= w.start.getTime() && t <= w.end.getTime()) || WEEKS[0];
}

function monthGrid(month) {
  const first = new Date(YEAR, month - 1, 1);
  const lastDay = new Date(YEAR, month, 0).getDate();
  const start = (first.getDay() + 6) % 7;
  const cells = Array(start).fill(null);
  for (let d = 1; d <= lastDay; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function defaultState() {
  return { personal: {}, quarters: {}, months: {}, weeks: {}, days: {}, events: {} };
}

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 250);
}

function getPath(path) {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), state);
}

function setPath(path, value) {
  const keys = path.split(".");
  let cur = state;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (cur[k] == null || typeof cur[k] !== "object") cur[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  scheduleSave();
}

function personal() {
  state.personal ||= {};
  if (!state.personal.email) state.personal.email = AUTH_EMAIL;
  return state.personal;
}

function Q(n) {
  state.quarters[n] ||= {
    objetivos: "",
    notas: "",
    checklist: Array.from({ length: 10 }, () => ({ done: false, text: "" })),
    resumen: ["", "", ""],
    logros: "",
    pendientes: "",
    aprendizajes: "",
    mejoras: ""
  };
  if (!Array.isArray(state.quarters[n].checklist)) {
    state.quarters[n].checklist = Array.from({ length: 10 }, () => ({ done: false, text: "" }));
  }
  while (state.quarters[n].checklist.length < 10) {
    state.quarters[n].checklist.push({ done: false, text: "" });
  }
  return state.quarters[n];
}

function M(n) {
  state.months[n] ||= {
    objetivos: "",
    pasos: "",
    tareas: "",
    checklist: "",
    notas: "",
    importante: "",
    logros: "",
    aprendizajes: "",
    mejoras: "",
    pendientes: "",
    gracias: "",
    nakama: "",
    animo: "",
    nota: ""
  };
  if (state.months[n].nota == null) state.months[n].nota = "";
  return state.months[n];
}

function monthChar(month) {
  return MONTH_CHAR[month - 1];
}

function charArt(id) {
  const named = ["luffy", "zoro", "nami", "usopp", "sanji", "chopper", "robin", "franky", "brook", "jinbe", "ace", "sabo"];
  return named.includes(id) ? `assets/jolly-${id}.jpg` : `assets/mood-${id}.jpg`;
}

function eventsOn(date) {
  state.events ||= {};
  const k = iso(date);
  if (!Array.isArray(state.events[k])) state.events[k] = [];
  return state.events[k];
}

function dayValue(date) {
  const v = state.days?.[iso(date)];
  if (!v) return { plan: "", log: "" };
  if (typeof v === "string") return { plan: "", log: v };
  return { plan: v.plan || "", log: v.log || "" };
}

function dayHasNote(date) {
  const v = dayValue(date);
  return Boolean((v.plan + " " + v.log).trim());
}

function dayHasEvents(date) {
  return eventsOn(date).length > 0;
}

function today() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function plannerDate() {
  const t = today();
  const start = new Date(YEAR, 0, 1);
  const end = new Date(YEAR, 11, 31);
  if (t < start) return start;
  if (t > end) return end;
  return t;
}

function daysToLaunch() {
  return Math.round((new Date(YEAR, 0, 1) - today()) / 86400000);
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 1400);
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function field(path, placeholder = "", multiline = true) {
  const val = getPath(path) ?? "";
  if (multiline) return `<textarea data-store="${path}" placeholder="${placeholder}">${esc(val)}</textarea>`;
  return `<input class="field" data-store="${path}" value="${esc(val)}" placeholder="${placeholder}">`;
}

function jollyFor(month) {
  return charArt(monthChar(month).id);
}

function moodBar(month, path) {
  const ch = monthChar(month);
  const current = String(getPath(path) || "");
  const hits = [1, 2, 3, 4, 5]
    .map(
      (n) => `<label class="mood-hit ${current === String(n) ? "on" : ""}">
      <input type="radio" name="${path}" data-store="${path}" value="${n}" ${current === String(n) ? "checked" : ""}>
      <span>${n}</span>
    </label>`
    )
    .join("");
  return `<div class="mood-scale">
    <img src="assets/mood-${ch.id}.jpg" alt="Escala de ánimo de ${esc(ch.name)}">
    <div class="mood-hits">${hits}</div>
  </div>
  <p class="hint mood-hint">Toca el nivel de ${esc(ch.name)}</p>`;
}

function gradePicker(path) {
  const current = String(getPath(path) || "");
  return `<div class="grade-row">${[1, 2, 3, 4, 5, 6, 7]
    .map(
      (n) => `<label class="grade ${current === String(n) ? "on" : ""}">
      <input type="radio" name="${path}" data-store="${path}" value="${n}" ${current === String(n) ? "checked" : ""}>
      ${n}
    </label>`
    )
    .join("")}</div>`;
}

function officialArt(month) {
  return `assets/cal-${pad(month)}.jpg`;
}

function heroFrame(src, alt = "") {
  return `<figure class="hero-frame"><img src="${src}" alt="${esc(alt)}"></figure>`;
}

function eventList(date) {
  const dayIso = iso(date);
  const items = eventsOn(date)
    .map(
      (e) => `<li class="event-row">
      <span><strong>${esc(e.start || "Todo el día")}</strong> ${esc(e.title)}</span>
      <button type="button" class="icon-btn" data-act="del-event" data-id="${esc(e.id)}" data-day="${dayIso}" aria-label="Borrar">✕</button>
    </li>`
    )
    .join("");
  const gcalHint = gcalEnabled()
    ? gcalConnected()
      ? `<p class="hint">Este evento también se crea en tu Google Calendar.</p>`
      : `<button class="btn" type="button" data-act="gcal-connect">Conectar Google Calendar</button>`
    : `<p class="hint">Para copiar los eventos a Google Calendar, abre <a href="#/yo">Perfil</a> y sigue los 4 pasos. No es tu correo: es una llave que te da Google una sola vez.</p>`;
  return `<div class="box" style="margin-top:10px">
    <h3>Eventos</h3>
    <ul class="event-list">${items || `<li class="hint">Todavía no hay eventos este día.</li>`}</ul>
    <form id="event-form" data-day="${dayIso}">
      <input name="title" placeholder="Título del evento" required>
      <div class="event-times">
        <label>Inicio <input name="start" type="time" value="09:00"></label>
        <label>Fin <input name="end" type="time" value="10:00"></label>
      </div>
      <button class="btn primary" type="submit">Agregar evento</button>
    </form>
    ${gcalHint}
  </div>`;
}

function monthTabs(month, tab) {
  const q = Math.ceil(month / 3);
  return `<nav class="nav-pills">
    <a class="${tab === "plan" ? "active" : ""}" href="#/mes/${month}">Plan</a>
    <a class="${tab === "cierre" ? "active" : ""}" href="#/cierre/${month}">Cierre de mes</a>
    <a href="#/qcierre/${q}">Cierre Q${q}</a>
  </nav>`;
}

function isAuthed() {
  return localStorage.getItem(AUTH_KEY) === AUTH_HASH;
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function renderLogin(error = "") {
  document.body.classList.add("locked");
  document.getElementById("app").innerHTML = `<section class="login-screen">
    <form class="login-card" id="login-form" autocomplete="on">
      <p class="kicker">Bitácora del capitán</p>
      <img class="hero-logo" src="assets/logo.jpg" alt="One Piece">
      <h1>Planner 2027</h1>
      <p class="hint">Acceso personal</p>
      <div class="login-fields">
        <label for="login-email">Usuario</label>
        <input id="login-email" name="email" type="email" autocomplete="username" value="${esc(AUTH_EMAIL)}" required>
        <label for="login-pass">Contraseña</label>
        <input id="login-pass" name="password" type="password" autocomplete="current-password" required>
      </div>
      <p class="login-error">${esc(error)}</p>
      <button class="btn primary" type="submit">Entrar</button>
    </form>
  </section>`;
}

function fullCalendar(month, selected) {
  const cells = monthGrid(month);
  const now = today();
  const head = DOW_SHORT.map((d, i) => `<th class="${i === 6 ? "sun" : ""}">${d}</th>`).join("");
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(
      "<tr>" +
        cells
          .slice(i, i + 7)
          .map((d, idx) => {
            if (!d) return `<td class="empty"></td>`;
            const date = new Date(YEAR, month - 1, d);
            const evs = eventsOn(date);
            const cls = [
              idx === 6 ? "sun" : "",
              dayHasNote(date) ? "has" : "",
              evs.length ? "busy" : "",
              sameDay(date, now) ? "today" : "",
              selected && sameDay(date, selected) ? "today" : ""
            ]
              .filter(Boolean)
              .join(" ");
            const chips = evs
              .slice(0, 2)
              .map((e) => `<div class="ev-chip">${esc(e.title)}</div>`)
              .join("");
            return `<td class="${cls}" data-go="dia/${iso(date)}"><div class="num">${d}</div>${chips}</td>`;
          })
          .join("") +
        "</tr>"
    );
  }
  return `<div class="box" style="padding:0;background:url('assets/wm-${pad(month)}.jpg') center/contain no-repeat #fff;"><table class="cal"><thead><tr>${head}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}

function renderDay(date) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const month = date.getFullYear() === YEAR ? date.getMonth() + 1 : date.getFullYear() < YEAR ? 1 : 12;
  const saga = SAGAS[month - 1];
  const week = weekForDate(day);
  const prev = addDays(day, -1);
  const next = addDays(day, 1);
  const left = daysToLaunch();
  const countdown =
    left > 0 && sameDay(day, new Date(YEAR, 0, 1))
      ? `<div class="countdown">Faltan ${left} días para el 1 de enero ${YEAR}</div>`
      : "";
  const strip = week.days
    .map((d, i) => {
      const active = sameDay(d, day) ? "active" : "";
      const sun = i === 6 ? "sun" : "";
      const has = dayHasNote(d) || dayHasEvents(d) ? "has" : "";
      return `<a class="${active} ${sun} ${has}" href="#/dia/${iso(d)}">
        <span class="d">${DOW_SHORT[i]}</span>
        <span class="n">${d.getDate()}</span>
      </a>`;
    })
    .join("");
  ui.month = month;
  ui.week = week.id;
  ui.quarter = Math.ceil(month / 3);
  const last = new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate();
  const closeHint =
    day.getFullYear() === YEAR && day.getDate() >= last - 2
      ? `<a class="saga-chip" href="#/cierre/${month}" style="margin-top:12px">
          <img src="${jollyFor(month)}" alt="">
          <span><strong>Cierra ${MONTHS[month - 1]}</strong><span>Logros, aprendizajes y pendientes</span></span>
        </a>`
      : "";
  return `<section class="sheet">
    ${countdown}
    <div class="day-nav">
      <a class="nav-arrow" href="#/dia/${iso(prev)}" aria-label="Día anterior">‹</a>
      <h1>
        <span class="dow-line">${DOW[(day.getDay() + 6) % 7]}</span>
        ${day.getDate()} ${MONTHS[day.getMonth()]}
      </h1>
      <a class="nav-arrow" href="#/dia/${iso(next)}" aria-label="Día siguiente">›</a>
    </div>
    <div class="week-strip">${strip}</div>
    <a class="saga-chip" href="#/mes/${month}">
      <img src="${officialArt(month)}" alt="">
      <span>
        <strong>${esc(saga.title)}</strong>
        <span>${MONTHS[month - 1]} · ${esc(saga.arc)} · ${esc(monthChar(month).name)}</span>
      </span>
    </a>
    <div class="box">
      <h3>¿Cómo vas hoy?</h3>
      ${moodBar(month, `days.${iso(day)}.mood`)}
    </div>
    <div class="box priority" style="margin-top:10px">
      <h3>Lo importante hoy</h3>
      ${field(`days.${iso(day)}.plan`, "1, 2 o 3 cosas. Nada más.", true)}
    </div>
    ${eventList(day)}
    <div class="box grow big-note" style="margin-top:10px">
      <h3>Notas del día</h3>
      ${field(`days.${iso(day)}.log`, "Escribe aquí. Se guarda solo.", true)}
    </div>
    ${closeHint}
  </section>`;
}

function renderMonth(month) {
  M(month);
  const saga = SAGAS[month - 1];
  const prev = month === 1 ? 12 : month - 1;
  const next = month === 12 ? 1 : month + 1;
  ui.month = month;
  ui.quarter = Math.ceil(month / 3);
  return `<section class="sheet">
    ${monthTabs(month, "plan")}
    <div class="day-nav">
      <a class="nav-arrow" href="#/mes/${prev}">‹</a>
      <h1>
        <span class="dow-line">${esc(saga.arc)}</span>
        ${MONTHS[month - 1]}
      </h1>
      <a class="nav-arrow" href="#/mes/${next}">›</a>
    </div>
    ${heroFrame(officialArt(month), saga.title)}
    ${fullCalendar(month)}
    <p class="hint" style="margin:8px 0 12px">Toca un día para escribir o agregar un evento. El punto dorado marca notas; las tiras son eventos.</p>
    <details class="lore">
      <summary>Historia del mes</summary>
      <h2 style="margin-top:10px">${esc(saga.title)}</h2>
      <p class="span">${esc(saga.span)}</p>
      <p class="story">${esc(saga.story)}</p>
    </details>
    <div class="box" style="margin-top:10px">
      <h3>Objetivo del mes</h3>
      ${field(`months.${month}.objetivos`, "¿Qué quieres lograr en " + MONTHS[month - 1] + "?")}
    </div>
    <div class="box" style="margin-top:10px">
      <h3>Tareas</h3>
      ${field(`months.${month}.tareas`, "Lista corta")}
    </div>
    <a class="btn primary" href="#/cierre/${month}" style="display:block;text-align:center;margin-top:14px">Cerrar ${MONTHS[month - 1]}</a>
  </section>`;
}

function renderMonthClose(month) {
  M(month);
  const saga = SAGAS[month - 1];
  const ch = monthChar(month);
  const q = Math.ceil(month / 3);
  ui.month = month;
  ui.quarter = q;
  return `<section class="sheet">
    ${monthTabs(month, "cierre")}
    ${heroFrame(officialArt(month), saga.title)}
    <p class="kicker">${esc(saga.arc)}</p>
    <h1 class="page-title">Cierre de ${MONTHS[month - 1]}</h1>
    <p class="q-blurb">${esc(saga.title)}</p>
    <div class="box char-of-month">
      <div class="char-head">
        <img src="${jollyFor(month)}" alt="">
        <div>
          <h3>${esc(ch.name)}</h3>
          <p class="hint" style="margin:0">${MONTHS[month - 1]} tiene a ${esc(ch.name)} como nakama fijo. Usa su escala de ánimo.</p>
        </div>
      </div>
      ${moodBar(month, `months.${month}.animo`)}
    </div>
    <div class="box" style="margin-top:10px">
      <h3>Nota del mes</h3>
      <p class="hint">Del 1 al 7, ¿cómo fue ${MONTHS[month - 1]}?</p>
      ${gradePicker(`months.${month}.nota`)}
    </div>
    <div class="box" style="margin-top:10px"><h3>Logros</h3>${field(`months.${month}.logros`, "¿Qué conquistaste?")}</div>
    <div class="box" style="margin-top:10px"><h3>Aprendizajes</h3>${field(`months.${month}.aprendizajes`, "¿Qué te dejó este arco?")}</div>
    <div class="box" style="margin-top:10px"><h3>Mejoras</h3>${field(`months.${month}.mejoras`, "¿Qué harías distinto el próximo mes?")}</div>
    <div class="box" style="margin-top:10px"><h3>Pendientes</h3>${field(`months.${month}.pendientes`, "Qué se va al siguiente mes")}</div>
    <div class="box" style="margin-top:10px"><h3>Agradecimientos</h3>${field(`months.${month}.gracias`, "Nakamas, personas, apoyos")}</div>
    ${month % 3 === 0 ? `<a class="btn primary" href="#/qcierre/${q}" style="display:block;text-align:center;margin-top:14px">Seguir al cierre Q${q}</a>` : ""}
  </section>`;
}

function renderQuarterClose(q) {
  Q(q);
  const months = [(q - 1) * 3 + 1, (q - 1) * 3 + 2, (q - 1) * 3 + 3];
  const lore = QUARTERS_LORE[q - 1];
  const peeks = months
    .map((m) => {
      M(m);
      const mm = state.months[m] || {};
      const ch = monthChar(m);
      const nota = mm.nota ? `Nota ${mm.nota} / 7` : "Sin nota todavía";
      return `<div class="month-peek-wrap">
        <a class="month-peek" href="#/cierre/${m}">
          <img src="${officialArt(m)}" alt="">
          <span>
            <strong>${MONTHS[m - 1]} · ${esc(ch.name)}</strong>
            <span class="hint" style="display:block;margin:0">${esc(nota)}</span>
          </span>
          <span class="go">›</span>
        </a>
        <p class="grade-label">Evalúa ${MONTHS[m - 1]}</p>
        ${gradePicker(`months.${m}.nota`)}
      </div>`;
    })
    .join("");
  return `<section class="sheet">
    <nav class="nav-pills">
      <a href="#/ano">Año</a>
      ${[1, 2, 3, 4].map((n) => `<a class="${n === q ? "active" : ""}" href="#/qcierre/${n}">Q${n}</a>`).join("")}
    </nav>
    ${heroFrame(`assets/qend-${pad(q)}.jpg`, `Término Q${q}`)}
    <p class="kicker">Término de arco</p>
    <h1 class="page-title">Cierre Q${q}</h1>
    <p class="q-blurb">${esc(lore.name)}. ${esc(lore.blurb)}</p>
    <h3 class="label">Los tres meses</h3>
    <div class="month-list">${peeks}</div>
    <div class="box" style="margin-top:12px"><h3>Logros del trimestre</h3>${field(`quarters.${q}.logros`, "Las islas que sí tomaste")}</div>
    <div class="box" style="margin-top:10px"><h3>Aprendizajes</h3>${field(`quarters.${q}.aprendizajes`, "Qué te enseñó este arco")}</div>
    <div class="box" style="margin-top:10px"><h3>Mejoras</h3>${field(`quarters.${q}.mejoras`, "Rumbo distinto para el próximo Q")}</div>
    <div class="box" style="margin-top:10px"><h3>Pendientes</h3>${field(`quarters.${q}.pendientes`, "Lo que sigue a bordo")}</div>
    ${q === 4 ? `<div class="box" style="margin-top:10px"><h3>Cierre del año</h3>${field(`quarters.4.notas`, "¿Llegaste más cerca de tu One Piece?")}</div>` : ""}
  </section>`;
}

function renderYear() {
  const groups = [0, 1, 2, 3].map((q) => {
    const months = [q * 3 + 1, q * 3 + 2, q * 3 + 3];
    const lore = QUARTERS_LORE[q];
    const rows = months
      .map((m) => {
        const s = SAGAS[m - 1];
        return `<a href="#/mes/${m}">
          <img src="${officialArt(m)}" alt="">
          <span>
            <strong>${MONTHS[m - 1]} · ${esc(monthChar(m).name)}</strong>
            <span class="hint" style="display:block;margin:0">${esc(s.title)}</span>
          </span>
          <span class="go">›</span>
        </a>`;
      })
      .join("");
    Q(q + 1);
    const items = Q(q + 1)
      .checklist.slice(0, 5)
      .map(
        (item, i) => `<label class="check-row">
          <input type="checkbox" data-store="quarters.${q + 1}.checklist.${i}.done" ${item.done ? "checked" : ""}>
          <input type="text" data-store="quarters.${q + 1}.checklist.${i}.text" value="${esc(item.text || "")}" placeholder="Meta ${i + 1}">
        </label>`
      )
      .join("");
    return `<section class="q-block">
      <h2>Q${q + 1} · ${esc(lore.name)}</h2>
      <p class="hint">${esc(lore.blurb)}</p>
      <div class="month-list">${rows}</div>
      <details class="lore" style="margin-top:8px">
        <summary>Metas del trimestre</summary>
        ${items}
      </details>
      <a class="btn" href="#/qcierre/${q + 1}" style="display:block;text-align:center;margin-top:8px">Cierre Q${q + 1}</a>
    </section>`;
  });
  return `<section class="sheet">
    <p class="kicker">Grand Line ${YEAR}</p>
    <h1 class="page-title">El viaje</h1>
    ${groups.join("")}
  </section>`;
}

function renderProfile() {
  const p = personal();
  return `<section class="sheet">
    <p class="kicker">Capitán</p>
    <h1 class="page-title">Perfil</h1>
    <div class="box">
      <h3>Nombre</h3>
      <input class="field" data-store="personal.nombre" value="${esc(p.nombre || "")}" placeholder="Tu nombre">
      <h3>Sueño / meta del año</h3>
      ${field("personal.sueno", "¿Cuál es tu One Piece?")}
    </div>
    <div class="box" style="margin-top:10px">
      <h3>Correo</h3>
      <input class="field" data-store="personal.email" value="${esc(p.email || "")}">
      <h3>Teléfono</h3>
      <input class="field" data-store="personal.telefono" value="${esc(p.telefono || "")}">
      <h3>Contacto de emergencia</h3>
      ${field("personal.emergencia", "Nombre y teléfono", false)}
    </div>
    <div class="box" style="margin-top:10px">
      <h3>Google Calendar</h3>
      <p class="hint">Esto no es tu Gmail ni tu contraseña. Google pide una llave para que esta página pueda crear eventos en tu calendario. Se hace una sola vez.</p>
      <ol class="hint-list">
        <li>Abre <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noopener">este enlace</a> y pulsa <strong>Habilitar</strong> (o Enable).</li>
        <li>Luego abre <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Credenciales</a> → <strong>Crear credenciales</strong> → <strong>ID de cliente de OAuth</strong> → tipo <strong>Aplicación web</strong>.</li>
        <li>En “Orígenes de JavaScript autorizados” agrega estas dos líneas, tal cual:<br><code>http://127.0.0.1:4173</code><br><code>https://raimundoibieta.github.io</code></li>
        <li>Crea y copia el texto largo que termina en <code>.apps.googleusercontent.com</code>. Eso es la llave. Pégala abajo y pulsa <strong>Guardar llave</strong>. Después pulsa <strong>Conectar Google</strong> y entra con tu Gmail.</li>
      </ol>
      <label class="field-label" for="gcal-client">Llave de Google (no es tu correo)</label>
      <input class="field" id="gcal-client" value="${esc(gcalClientId())}" placeholder="123456789-abc.apps.googleusercontent.com" autocomplete="off">
      <div class="actions" style="margin-top:10px">
        <button class="btn" type="button" data-act="gcal-save-client">Guardar llave</button>
        ${gcalConnected()
          ? `<button class="btn" type="button" data-act="gcal-disconnect">Desconectar</button>`
          : `<button class="btn primary" type="button" data-act="gcal-connect">Conectar Google</button>`}
      </div>
      <p class="hint">${gcalConnected() ? "Listo. Un evento que agregues aquí también aparece en Google Calendar." : "Todavía no está conectado. Mientras tanto, los eventos se guardan solo en el planner."}</p>
    </div>
    <div class="actions">
      <button class="btn" data-act="export">Exportar bitácora</button>
      <button class="btn" data-act="import">Importar</button>
      <input id="import-file" type="file" accept="application/json" hidden>
    </div>
    <p class="hint">Tus notas viven en este celular o computador. Exporta el archivo para pasarlas a otro dispositivo.</p>
  </section>`;
}

function parseHash() {
  const hash = (location.hash || "#/").replace(/^#/, "") || "/";
  return hash.split("?")[0].split("/").filter(Boolean);
}

function setActiveNav(view) {
  document.querySelectorAll(".bottom-nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.view === view);
  });
}

function route() {
  if (!isAuthed()) {
    renderLogin();
    return;
  }
  document.body.classList.remove("locked");
  const parts = parseHash();
  let html = "";
  let view = "hoy";

  if (parts[0] === "mes") {
    const m = Math.min(12, Math.max(1, Number(parts[1]) || ui.month || 1));
    html = renderMonth(m);
    view = "mes";
  } else if (parts[0] === "ano" || parts[0] === "q") {
    html = renderYear();
    view = "ano";
  } else if (parts[0] === "yo") {
    html = renderProfile();
    view = "yo";
  } else if (parts[0] === "cierre") {
    const m = Math.min(12, Math.max(1, Number(parts[1]) || 1));
    html = renderMonthClose(m);
    view = "mes";
  } else if (parts[0] === "qcierre") {
    const q = Math.min(4, Math.max(1, Number(parts[1]) || 1));
    html = renderQuarterClose(q);
    view = "ano";
  } else if (parts[0] === "dia") {
    html = renderDay(parseISO(parts[1]));
    view = "hoy";
  } else if (parts[0] === "semana") {
    const w = WEEKS[Math.min(WEEKS.length, Math.max(1, Number(parts[1]) || 1)) - 1];
    html = renderDay(w.days[0]);
    view = "hoy";
  } else {
    html = renderDay(plannerDate());
    view = "hoy";
  }

  document.getElementById("app").innerHTML = html;
  setActiveNav(view);
  const mLink = document.getElementById("nav-mes");
  if (mLink) mLink.href = `#/mes/${ui.month}`;
  window.scrollTo(0, 0);
  const pullMonth = parts[0] === "mes" || parts[0] === "cierre" || parts[0] === "dia" ? ui.month : 0;
  if (pullMonth && gcalConnected() && !gcalPulled.has(pullMonth)) {
    gcalPulled.add(pullMonth);
    gcalPullMonth(YEAR, pullMonth).then((changed) => {
      if (changed) route();
    });
  }
}

function onStoreInput(e) {
  const el = e.target.closest("[data-store]");
  if (!el) return;
  if (el.type === "checkbox") setPath(el.dataset.store, el.checked);
  else setPath(el.dataset.store, el.value);
  if (el.type === "radio") {
    document.querySelectorAll(`input[name="${el.name}"]`).forEach((r) => {
      r.closest("label")?.classList.toggle("on", r.checked);
    });
  }
}

function exportState() {
  persist();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "bitacora-onepiece-2027.json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Archivo descargado");
}

function importState(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = { ...defaultState(), ...JSON.parse(reader.result) };
      persist();
      route();
      toast("Bitácora importada");
    } catch {
      toast("Archivo inválido");
    }
  };
  reader.readAsText(file);
}

document.addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]");
  if (go) {
    location.hash = `#/${go.dataset.go}`;
    return;
  }
  const act = e.target.closest("[data-act]");
  if (!act) return;
  if (act.dataset.act === "export") exportState();
  if (act.dataset.act === "import") document.getElementById("import-file").click();
  if (act.dataset.act === "logout") {
    localStorage.removeItem(AUTH_KEY);
    location.hash = "#/";
    renderLogin();
  }
  if (act.dataset.act === "gcal-connect") gcalConnect();
  if (act.dataset.act === "gcal-disconnect") gcalDisconnect();
  if (act.dataset.act === "gcal-save-client") {
    const input = document.getElementById("gcal-client");
    gcalSaveClient(input?.value || "");
    toast(gcalEnabled() ? "Llave guardada" : "Llave borrada");
    route();
  }
  if (act.dataset.act === "del-event") {
    const dayIso = act.dataset.day;
    const id = act.dataset.id;
    const list = eventsOn(parseISO(dayIso));
    const found = list.find((e) => e.id === id);
    state.events[dayIso] = list.filter((e) => e.id !== id);
    persist();
    if (found?.gcalId) gcalRemove(found.gcalId);
    route();
    toast("Evento borrado");
  }
});

document.addEventListener("change", (e) => {
  if (e.target.id === "import-file" && e.target.files[0]) importState(e.target.files[0]);
  onStoreInput(e);
});

document.addEventListener("input", onStoreInput);

document.addEventListener("submit", async (e) => {
  const eventForm = e.target.closest("#event-form");
  if (eventForm) {
    e.preventDefault();
    const title = eventForm.title.value.trim();
    if (!title) return;
    const dayIso = eventForm.dataset.day;
    const list = eventsOn(parseISO(dayIso));
    let ev = {
      id: "e-" + Date.now(),
      title,
      start: eventForm.start.value,
      end: eventForm.end.value
    };
    ev = await gcalPush(ev, dayIso);
    list.push(ev);
    persist();
    route();
    toast(gcalConnected() ? "Evento en ambos calendarios" : "Evento guardado");
    return;
  }
  const form = e.target.closest("#login-form");
  if (!form) return;
  e.preventDefault();
  const email = form.email.value.trim().toLowerCase();
  const pass = form.password.value;
  const hash = await sha256Hex(`op-planner-2027|${email}|${pass}`);
  if (email === AUTH_EMAIL && hash === AUTH_HASH) {
    localStorage.setItem(AUTH_KEY, AUTH_HASH);
    location.hash = "#/hoy";
    toast("Listo");
    route();
    return;
  }
  renderLogin("Usuario o contraseña incorrectos");
});

window.addEventListener("hashchange", route);
document.addEventListener("DOMContentLoaded", () => {
  gcalInit();
  route();
});
window.addEventListener("load", gcalInit);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") persist();
});
window.addEventListener("pagehide", persist);
