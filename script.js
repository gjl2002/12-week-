const TOTAL_WEEKS = 12;
const REVIEW_WEEKS = 1;
const DAYS_PER_WEEK = 7;
const TOTAL_DAYS = TOTAL_WEEKS * DAYS_PER_WEEK;
const TOTAL_ROWS = TOTAL_WEEKS + REVIEW_WEEKS;

const goalInputEl = document.getElementById("goalInput");
const startInputEl = document.getElementById("startInput");
const pickDateBtnEl = document.getElementById("pickDateBtn");
const modelInputEl = document.getElementById("modelInput");
const safeZoneToggleEl = document.getElementById("safeZoneToggle");
const buildLinkBtnEl = document.getElementById("buildLinkBtn");
const urlOutputEl = document.getElementById("urlOutput");
const copyBtnEl = document.getElementById("copyBtn");

const dotBoardEl = document.getElementById("dotBoard");
const seasonNameEl = document.getElementById("seasonName");
const rangeTextEl = document.getElementById("rangeText");
const progressLineEl = document.getElementById("progressLine");
const dateModalEl = document.getElementById("dateModal");
const monthTitleEl = document.getElementById("monthTitle");
const dateGridEl = document.getElementById("dateGrid");
const prevMonthBtnEl = document.getElementById("prevMonthBtn");
const nextMonthBtnEl = document.getElementById("nextMonthBtn");
const cancelDateBtnEl = document.getElementById("cancelDateBtn");
const todayDateBtnEl = document.getElementById("todayDateBtn");
const SUPPORTED_MODELS = ["iphone-12", "iphone-13", "iphone-14", "iphone-15", "iphone-16", "iphone-17"];
let pickerYear = 0;
let pickerMonth = 0;
const MODEL_SCREEN = {
  "iphone-12": { width: 1170, height: 2532 },
  "iphone-13": { width: 1170, height: 2532 },
  "iphone-14": { width: 1170, height: 2532 },
  "iphone-15": { width: 1179, height: 2556 },
  "iphone-16": { width: 1179, height: 2556 },
  "iphone-17": { width: 1179, height: 2556 }
};

function toISO(date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonday(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date, n) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function formatDotDate(date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function parseISO(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatMonthTitle(year, month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function openDateModal() {
  const selected = parseISO(startInputEl?.value) || getMonday(new Date());
  pickerYear = selected.getFullYear();
  pickerMonth = selected.getMonth();
  renderDateGrid();
  if (!dateModalEl) return;
  dateModalEl.classList.add("open");
  dateModalEl.setAttribute("aria-hidden", "false");
}

function closeDateModal() {
  if (!dateModalEl) return;
  dateModalEl.classList.remove("open");
  dateModalEl.setAttribute("aria-hidden", "true");
}

function renderDateGrid() {
  if (!dateGridEl || !monthTitleEl || !startInputEl) return;
  monthTitleEl.textContent = formatMonthTitle(pickerYear, pickerMonth);
  dateGridEl.innerHTML = "";

  const first = new Date(pickerYear, pickerMonth, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(pickerYear, pickerMonth, 1 - startOffset);
  const selectedISO = startInputEl.value;
  const todayISO = toISO(new Date());

  for (let i = 0; i < 42; i += 1) {
    const d = addDays(gridStart, i);
    const iso = toISO(d);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day-btn";
    if (d.getMonth() !== pickerMonth) btn.classList.add("muted");
    if (iso === selectedISO) btn.classList.add("active");
    if (iso === todayISO) btn.classList.add("today");
    btn.textContent = `${d.getDate()}`;
    btn.addEventListener("click", () => {
      startInputEl.value = iso;
      closeDateModal();
      applyFormToPreview();
    });
    dateGridEl.appendChild(btn);
  }
}

function getParams() {
  const params = new URLSearchParams(window.location.search);
  const fromParam = params.get("start");
  const fromDefault = toISO(getMonday(new Date()));
  const start = /^\d{4}-\d{2}-\d{2}$/.test(fromParam || "") ? fromParam : fromDefault;
  const title = params.get("title") || "";
  const modelRaw = params.get("model") || "iphone-15";
  const model = SUPPORTED_MODELS.includes(modelRaw) ? modelRaw : "iphone-15";
  const safe = params.get("safe") !== "0";
  const wallpaper = params.get("wallpaper") === "1";
  return { start, title, model, safe, wallpaper };
}

function render(startISO) {
  const start = new Date(`${startISO}T00:00:00`);
  const mainEnd = addDays(start, TOTAL_DAYS - 1);
  const todayISO = toISO(new Date());
  dotBoardEl.innerHTML = "";

  for (let rowIndex = 0; rowIndex < TOTAL_ROWS; rowIndex += 1) {
    const rowEl = document.createElement("div");
    rowEl.className = "dot-row";
    const isReviewRow = rowIndex === TOTAL_WEEKS;
    if (isReviewRow) rowEl.classList.add("review");

    const labelEl = document.createElement("div");
    labelEl.className = "dot-label";
    labelEl.textContent = isReviewRow ? "R" : `W${rowIndex + 1}`;
    rowEl.appendChild(labelEl);

    for (let col = 0; col < DAYS_PER_WEEK; col += 1) {
      const dayIndex = rowIndex * DAYS_PER_WEEK + col;
      const date = addDays(start, dayIndex);
      const iso = toISO(date);
      const dotEl = document.createElement("div");
      dotEl.className = "dot-cell";

      if (iso < todayISO) dotEl.classList.add("past");
      if (iso === todayISO) dotEl.classList.add("today");
      dotEl.title = formatDotDate(date);
      rowEl.appendChild(dotEl);
    }
    dotBoardEl.appendChild(rowEl);
  }

  const today = new Date();
  const elapsed = Math.min(
    TOTAL_DAYS,
    Math.max(0, Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1)
  );
  const left = TOTAL_DAYS - elapsed;
  const percent = Math.round((elapsed / TOTAL_DAYS) * 100);
  progressLineEl.textContent = `${left}d left · ${percent}%`;
  rangeTextEl.textContent = `${formatDotDate(start)} - ${formatDotDate(mainEnd)}`;

  if (elapsed >= 1 && elapsed <= TOTAL_DAYS) {
    const currentRowIndex = Math.floor((elapsed - 1) / DAYS_PER_WEEK);
    const row = dotBoardEl.children[currentRowIndex];
    if (row) row.classList.add("current-week");
  }
}

function buildShareUrl({ start, title, model }) {
  const safeModel = MODEL_SCREEN[model] ? model : "iphone-15";
  const size = MODEL_SCREEN[safeModel];
  const target = new URL("/", window.location.origin);
  target.searchParams.set("start", start);
  if ((title || "").trim()) {
    target.searchParams.set("title", title.trim());
  }
  target.searchParams.set("model", safeModel);
  target.searchParams.set("wallpaper", "1");
  target.searchParams.set("safe", "0");
  return `https://image.thum.io/get/png/noanimate/width/${size.width}/crop/${size.height}/${target.toString()}`;
}

function applyFormToPreview() {
  const title = (goalInputEl?.value || "").trim();
  const start = startInputEl?.value || toISO(getMonday(new Date()));
  seasonNameEl.textContent = title || `${new Date(`${start}T00:00:00`).getFullYear()} · 12 Week Season`;
  if (modelInputEl?.value) {
    document.body.dataset.model = modelInputEl.value;
  }
  if (safeZoneToggleEl) {
    document.body.classList.toggle("show-safe-zone", safeZoneToggleEl.checked);
  }
  render(start);
}

function bindSetupEvents(defaultModel) {
  if (!goalInputEl || !startInputEl || !urlOutputEl) return;

  goalInputEl.addEventListener("input", applyFormToPreview);
  modelInputEl?.addEventListener("change", applyFormToPreview);
  safeZoneToggleEl?.addEventListener("change", applyFormToPreview);
  pickDateBtnEl?.addEventListener("click", () => {
    openDateModal();
  });
  startInputEl.addEventListener("click", openDateModal);

  prevMonthBtnEl?.addEventListener("click", () => {
    pickerMonth -= 1;
    if (pickerMonth < 0) {
      pickerMonth = 11;
      pickerYear -= 1;
    }
    renderDateGrid();
  });
  nextMonthBtnEl?.addEventListener("click", () => {
    pickerMonth += 1;
    if (pickerMonth > 11) {
      pickerMonth = 0;
      pickerYear += 1;
    }
    renderDateGrid();
  });
  cancelDateBtnEl?.addEventListener("click", closeDateModal);
  todayDateBtnEl?.addEventListener("click", () => {
    const todayISO = toISO(new Date());
    if (startInputEl) {
      startInputEl.value = todayISO;
      closeDateModal();
      applyFormToPreview();
    }
  });
  dateModalEl?.addEventListener("click", (e) => {
    if (e.target === dateModalEl) closeDateModal();
  });

  buildLinkBtnEl?.addEventListener("click", () => {
    const safeStart = startInputEl.value || toISO(getMonday(new Date()));
    const url = buildShareUrl({
      title: goalInputEl.value,
      start: safeStart,
      model: modelInputEl?.value || defaultModel
    });
    urlOutputEl.value = url;
  });

  copyBtnEl?.addEventListener("click", async () => {
    if (!urlOutputEl.value) return;
    try {
      await navigator.clipboard.writeText(urlOutputEl.value);
    } catch {
      urlOutputEl.select();
      document.execCommand("copy");
    }
    copyBtnEl.textContent = "已复制";
    window.setTimeout(() => {
      copyBtnEl.textContent = "复制";
    }, 1200);
  });
}

function init() {
  const { start, title, model, safe, wallpaper } = getParams();
  document.body.dataset.model = model;
  document.body.classList.toggle("show-safe-zone", safe);
  seasonNameEl.textContent = title || `${new Date(`${start}T00:00:00`).getFullYear()} · 12 Week Season`;
  if (wallpaper) document.body.classList.add("wallpaper");
  render(start);

  if (goalInputEl && startInputEl && modelInputEl && urlOutputEl) {
    goalInputEl.value = title;
    startInputEl.value = start;
    modelInputEl.value = model;
    if (safeZoneToggleEl) safeZoneToggleEl.checked = safe;
    urlOutputEl.value = buildShareUrl({ start, title, model });
    bindSetupEvents(model);
  }
}

init();
