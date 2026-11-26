const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const KEY = "mygym_21";\nconst LEGACY_KEY = "mygym_pre21";
const defaults = {
  routines: [], history: [],
  widgets: ["sessions", "streak", "minutes", "goal"],
  settings: { name: "", units: "kg", theme: "dark", accent: "lime", weeklyGoal: 3, reminderTime: "" }
};

function readData() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return JSON.parse(JSON.stringify(defaults));
    const parsed = JSON.parse(raw);
    return {
      ...defaults, ...parsed,
      routines: Array.isArray(parsed.routines) ? parsed.routines : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
      widgets: Array.isArray(parsed.widgets) ? parsed.widgets : defaults.widgets.slice(),
      settings: { ...defaults.settings, ...(parsed.settings || {}) }
    };
  } catch (error) {
    console.warn("No se pudieron leer los datos guardados:", error);
    return structuredClone(defaults);
  }
}
let data = readData();
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("No se pudieron guardar los datos:", error);
    toast("No se pudieron guardar los cambios en este navegador");
    return false;
  }
}
function toast(message) {
  const node = $("#toast");
  if (!node) return;
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 2400);
}
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

function navigate(id) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === id));
  $$("[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === id));
  render();
}
$$("[data-tab]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.tab)));
$("#dialog-form").addEventListener("submit", (event) => event.preventDefault());

function openDialog(markup) {
  $("#dialog-content").innerHTML = markup;
  const dialog = $("#dialog");
  if (!dialog.open) dialog.showModal();
}
function closeDialog() {
  const dialog = $("#dialog");
  if (dialog.open) dialog.close();
}

const EXERCISES = [
  { name: "Flexiones", muscle: "Pecho", equipment: "Peso corporal" },
  { name: "Press de pecho", muscle: "Pecho", equipment: "Mancuernas o máquina" },
  { name: "Remo", muscle: "Espalda", equipment: "Mancuerna o máquina" },
  { name: "Jalón al pecho", muscle: "Espalda", equipment: "Polea" },
  { name: "Sentadilla", muscle: "Piernas", equipment: "Peso corporal o barra" },
  { name: "Zancadas", muscle: "Piernas", equipment: "Peso corporal" },
  { name: "Curl de bíceps", muscle: "Brazos", equipment: "Mancuernas" },
  { name: "Extensión de tríceps", muscle: "Brazos", equipment: "Polea" },
  { name: "Plancha", muscle: "Core", equipment: "Peso corporal" }
];

function render() {
  const sessions = data.history.length;
  const minutes = data.history.reduce((total, item) => total + (Number(item.duration) || 0), 0);
  const widgetData = {
    sessions: ["Sesiones", sessions, "entrenamientos completados"],
    streak: ["Racha", sessions ? 1 : 0, "días activos registrados"],
    minutes: ["Tiempo total", Math.round(minutes / 60) + " h", "tiempo entrenando"],
    goal: ["Objetivo semanal", Math.min(sessions, Number(data.settings.weeklyGoal || 3)) + "/" + Number(data.settings.weeklyGoal || 3), "sesiones objetivo"]
  };
  $("#widgets").innerHTML = data.widgets.map((key) => widgetData[key]).filter(Boolean)
    .map(([title, value, description]) => `<div class="widget"><span>${title}</span><strong>${value}</strong><span>${description}</span></div>`).join("");

  const routineCards = data.routines.map((routine, index) => `
    <div class="routine"><div><b>${esc(routine.name)}</b><p>${routine.exercises.length} ejercicios · ${esc(routine.day || "Sin día")}</p></div>
    <div class="row"><button type="button" data-edit="${index}">Editar</button><button type="button" data-start="${index}">Iniciar</button><button type="button" data-delete="${index}" aria-label="Eliminar rutina">✕</button></div></div>
  `).join("") || '<p class="muted">Aún no tienes rutinas. Crea la primera.</p>';
  $("#routine-list").innerHTML = routineCards;
  $("#home-routines").innerHTML = routineCards;
  $$("[data-edit]").forEach((button) => button.addEventListener("click", () => editRoutine(Number(button.dataset.edit))));
  $("[data-start]").forEach((button) => button.addEventListener("click", () => startWorkout(Number(button.dataset.start))));
  $("[data-delete]").forEach((button) => button.addEventListener("click", () => {
    const index = Number(button.dataset.delete);
    if (!Number.isInteger(index) || !data.routines[index]) return;
    if (!confirm("¿Eliminar esta rutina?")) return;
    data.routines.splice(index, 1); save(); render(); toast("Rutina eliminada");
  }));

  $("#stats").innerHTML = `<div class="widget"><span>Sesiones</span><strong>${sessions}</strong></div><div class="widget"><span>Tiempo total</span><strong>${Math.round(minutes / 60)} h</strong></div>`;
  $("#history-list").innerHTML = data.history.slice().reverse().map((item) => `
    <article><b>${esc(item.name)}</b><p class="muted small">${new Date(item.date).toLocaleString()} · ${Math.round((Number(item.duration) || 0) / 60)} min</p></article>
  `).join("") || '<p class="muted">Tu historial aparecerá aquí.</p>';

  const query = ($("#search").value || "").trim().toLowerCase();
  $("#exercise-list").innerHTML = EXERCISES.filter((exercise) => (exercise.name + " " + exercise.muscle).toLowerCase().includes(query))
    .map((exercise) => `<article><b>${exercise.name}</b><p class="muted small">${exercise.muscle} · ${exercise.equipment}</p><button type="button" data-add-ex="${esc(exercise.name)}">＋ Añadir a rutina</button></article>`).join("");
  $$("[data-add-ex]").forEach((button) => button.addEventListener("click", () => {
    if (!data.routines.length) return toast("Crea una rutina primero");
    data.routines[0].exercises.push(button.dataset.addEx);
    save(); render(); toast("Ejercicio añadido a " + data.routines[0].name);
  }));
}

function editRoutine(index = -1) {
  const routine = index < 0 ? { name: "", day: "", exercises: [] } : data.routines[index];
  openDialog(`
    <h2>${index < 0 ? "Nueva rutina" : "Editar rutina"}</h2>
    <label>Nombre<input id="r-name" maxlength="45" value="${esc(routine.name)}" placeholder="Ej. Tren superior"></label>
    <label>Día<input id="r-day" maxlength="20" value="${esc(routine.day)}" placeholder="Ej. Lunes"></label>
    <label>Ejercicios (uno por línea)<textarea id="r-ex" rows="5">${esc(routine.exercises.join("\n"))}</textarea></label>
    <div class="row"><button type="button" id="cancel">Cancelar</button><button type="button" id="save-r" class="primary">Guardar</button></div>
  `);
  $("#cancel").addEventListener("click", closeDialog);
  $("#save-r").addEventListener("click", () => {
    const name = $("#r-name").value.trim();
    if (!name) return toast("Escribe un nombre para la rutina");
    const updated = {
      name, day: $("#r-day").value.trim(),
      exercises: $("#r-ex").value.split("\n").map((line) => line.trim()).filter(Boolean)
    };
    if (index < 0) data.routines.push(updated);
    else data.routines[index] = updated;
    save(); closeDialog(); render(); toast("Rutina guardada");
  });
}

function formatTime(seconds) {
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
}
let restInterval = null;
function startWorkout(index) {
  const routine = data.routines[index];
  if (!routine) return;
  let exerciseIndex = 0;
  const startedAt = Date.now();

  function drawWorkout() {
    clearInterval(restInterval);
    openDialog(`
      <p class="eyebrow">MODO ENTRENAMIENTO</p><h2>${esc(routine.name)}</h2>
      <p class="muted">${routine.exercises.length ? exerciseIndex + 1 : 0} / ${routine.exercises.length} ejercicios</p>
      <article><h2>${esc(routine.exercises[exerciseIndex] || "Añade ejercicios a esta rutina")}</h2>
        <label>Series<input id="sets" type="number" min="1" value="3"></label>
        <label>Repeticiones<input id="reps" type="number" min="1" value="10"></label>
        <label>Peso (${esc(data.settings.units)})<input id="weight" type="number" min="0" step="0.5" value="0"></label>
        <label>Descanso (segundos)<input id="rest" type="number" min="0" value="60"></label>
        <div class="timer-panel"><span class="muted">Descanso</span><div id="clock" style="font-size:27px;font-weight:900;color:var(--a)">01:00</div>
        <button type="button" id="rest-start">Iniciar descanso</button></div>
      </article>
      <div class="row"><button type="button" id="skip">Siguiente</button><button type="button" id="finish" class="primary">Finalizar sesión</button></div>
    `);
    $("#skip").addEventListener("click", () => {
      if (exerciseIndex < routine.exercises.length - 1) { exerciseIndex++; drawWorkout(); }
      else toast("Has llegado al último ejercicio");
    });
    $("#finish").addEventListener("click", () => {
      clearInterval(restInterval);
      data.history.push({ name: routine.name, date: new Date().toISOString(), duration: Math.floor((Date.now() - startedAt) / 1000), exercises: routine.exercises.slice(), records: routine.exercises.map((exercise, i) => ({ exercise, sets: Number($("#sets")?.value || 3), reps: Number($("#reps")?.value || 10), weight: Number($("#weight")?.value || 0) })) });
      save(); closeDialog(); render(); toast("Sesión guardada en el historial");
    });
    $("#rest-start").addEventListener("click", () => {
      clearInterval(restInterval);
      let remaining = Math.max(0, Number($("#rest").value) || 0);
      $("#clock").textContent = formatTime(remaining);
      if (remaining === 0) return toast("Pon un tiempo de descanso");
      restInterval = setInterval(() => {
        remaining--;
        const clock = $("#clock");
        if (clock) clock.textContent = formatTime(Math.max(0, remaining));
        if (remaining <= 0) {
          clearInterval(restInterval); restInterval = null;
          if ("Notification" in window && Notification.permission === "granted") new Notification("Descanso terminado", { body: "¡Siguiente serie!" });
          toast("¡Descanso terminado!");
        }
      }, 1000);
    });
  }
  drawWorkout();
}

$("#new-routine").addEventListener("click", () => editRoutine());
$("#quick-add").addEventListener("click", () => editRoutine());
$("#customize").addEventListener("click", () => {
  openDialog('<h2>Personalizar inicio</h2>' +
    [["sessions", "Sesiones"], ["streak", "Racha"], ["minutes", "Tiempo total"], ["goal", "Objetivo semanal"]]
      .map(([id, label]) => `<label><input type="checkbox" data-widget="${id}" ${data.widgets.includes(id) ? "checked" : ""}>${label}</label>`).join("") +
    '<button type="button" id="widget-save" class="primary">Guardar widgets</button>');
  $("#widget-save").addEventListener("click", () => {
    data.widgets = $$("[data-widget]:checked").map((input) => input.dataset.widget);
    save(); closeDialog(); render(); toast("Inicio personalizado");
  });
});
$("#search").addEventListener("input", render);

function applySettings() {
  data.settings = {
    name: $("#username").value,
    units: $("#units").value,
    theme: $("#theme").value,
    accent: $("#accent").value
  };
  document.body.dataset.theme = data.settings.theme;
  document.body.dataset.accent = data.settings.accent;
  save();
}
$("#username").value = data.settings.name;
$("#units").value = data.settings.units;
$("#theme").value = data.settings.theme;
$("#accent").value = data.settings.accent;\nif ($("#weekly-goal")) $("#weekly-goal").value = data.settings.weeklyGoal || 3;\nif ($("#reminder-time")) $("#reminder-time").value = data.settings.reminderTime || "";
["username", "units", "theme", "accent", "weekly-goal", "reminder-time"].forEach((id) => $("#" + id).addEventListener("change", applySettings));
applySettings();

$("#export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = "my-gym-2.1-backup.json"; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$("#import").addEventListener("click", () => $("#file").click());
$("#file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!imported || !Array.isArray(imported.routines) || !Array.isArray(imported.history)) throw new Error("Formato incorrecto");
    data = { ...defaults, ...imported, settings: { ...defaults.settings, ...(imported.settings || {}) } };
    save(); applySettings(); render(); toast("Copia importada correctamente");
  } catch {
    toast("El archivo no es una copia válida de My GYM");
  }
  event.target.value = "";
});
$("#pdf").addEventListener("click", () => window.print());\n$("#notify").addEventListener("click", async () => {
  if (!("Notification" in window)) return toast("Notificaciones no disponibles en este navegador");
  const permission = await Notification.requestPermission();
  toast(permission === "granted" ? "Notificaciones activadas" : "Permiso no concedido");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js?v=2.1.1", { updateViaCache: "none" }).then(reg => reg.update()).catch((error) => console.warn("Service worker:", error)));
}
render();
