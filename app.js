/* ─────────────────────────────────────────
   Hormone Phase Tracker — app.js
   ───────────────────────────────────────── */
'use strict';

// ── State ─────────────────────────────────
let currentDate    = new Date();
let selectedPhase  = '';
let selectedMucus  = '';
let selectedPeriod = '';
let selectedOPK    = '';
let selectedIntimacy = '';
let selectedIntensity = '';
let selectedLibido = '';
let ratings = { energy: 0, mood: 0, fog: 0, anxiety: 0, stress: 0 };
let tasks   = [];

const STORAGE_KEY        = 'hormone_tracker_entries';
const PERIOD_STORAGE_KEY = 'hormone_tracker_periods';

// ── Phase metadata ────────────────────────
const phaseData = {
  menstruation: { moon: '🌑', name: 'Menstruation',  hint: 'Honor your limits'            },
  follicular:   { moon: '🌒', name: 'Follicular',    hint: 'Start new projects'            },
  ovulation:    { moon: '🌕', name: 'Ovulation',     hint: 'Speak up + collaborate'        },
  luteal:       { moon: '🌗', name: 'Luteal',        hint: 'Plan, organise + finish tasks'  },
};

// ── Phase wisdom ──────────────────────────
const phaseWisdom = {
  menstruation: {
    moon: '🌑',
    text: 'You are in your most intuitive season. Your body is releasing what no longer serves — honour that clearing with rest, warmth, and gentleness. This is not a time to push; it is a time to listen. The wisdom that surfaces now is some of the clearest you will receive all cycle.',
  },
  follicular: {
    moon: '🌒',
    text: 'Something new is building in you — quietly, steadily, full of potential. Your energy is returning like early morning light, and your mind is open to possibilities it couldn\'t see last week. Nourish this emergence with good food, curiosity, and space to begin. The seeds you plant now grow through the whole cycle.',
  },
  ovulation: {
    moon: '🌕',
    text: 'You are at your fullest expression. Your body is doing something extraordinary — offering the gift of life, connection, and creativity all at once. Let yourself be seen, heard, and felt. This window is precious: be present in your body, present with your partner, and trust the intelligence of this moment.',
  },
  luteal: {
    moon: '🌗',
    text: 'Your body is preparing — either to welcome new life, or to release and begin again. Both are sacred. What rises to the surface now — emotions, clarity, needs — deserves to be heard rather than suppressed. Tend to yourself with warmth, boundaries, and deep rest. You are not too much; you are in exactly the right phase.',
  },
};

// ── Date helpers ──────────────────────────
function dateKey(d) {
  // Use local date parts to avoid timezone shifting
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocalDate(str) {
  // Parse YYYY-MM-DD as local time (not UTC)
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d) {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatShortDate(str) {
  const d = parseLocalDate(str);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysBetween(dateStrA, dateStrB) {
  const a = parseLocalDate(dateStrA);
  const b = parseLocalDate(dateStrB);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function addDays(dateStr, n) {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

function changeDate(n) {
  currentDate.setDate(currentDate.getDate() + n);
  document.getElementById('dateDisplay').textContent = formatDate(currentDate);
  loadEntryForDate(dateKey(currentDate));
  updateCycleIntel();
}

// ── Period logging ────────────────────────
function loadPeriods() {
  try {
    return JSON.parse(localStorage.getItem(PERIOD_STORAGE_KEY)) || [];
  } catch { return []; }
}

function savePeriods(periods) {
  localStorage.setItem(PERIOD_STORAGE_KEY, JSON.stringify(periods));
}

function logPeriod() {
  const startEl = document.getElementById('periodStart');
  const endEl   = document.getElementById('periodEnd');
  const start   = startEl.value;
  const end     = endEl.value;

  if (!start) {
    showToast('Please enter a period start date');
    return;
  }

  const periods = loadPeriods();

  // Check for duplicate start date
  const existing = periods.findIndex(p => p.start === start);
  if (existing !== -1) {
    // Update existing entry
    periods[existing].end = end || periods[existing].end;
    savePeriods(periods);
    showToast('Period entry updated ✓');
  } else {
    // Add new entry, keep sorted by date
    periods.push({ start, end: end || '' });
    periods.sort((a, b) => a.start.localeCompare(b.start));
    savePeriods(periods);
    showToast('Period logged ✓');
  }

  // Clear inputs
  startEl.value = '';
  endEl.value   = '';

  renderPeriodHistory();
  updateCycleIntel();
}

function deletePeriod(start) {
  const periods = loadPeriods().filter(p => p.start !== start);
  savePeriods(periods);
  renderPeriodHistory();
  updateCycleIntel();
  showToast('Period entry removed');
}

function renderPeriodHistory() {
  const el = document.getElementById('periodHistory');
  if (!el) return;
  const periods = loadPeriods();

  if (periods.length === 0) {
    el.innerHTML = '<p style="font-size:12px;color:var(--muted);font-style:italic;margin:6px 0">No periods logged yet.</p>';
    return;
  }

  // Show most recent 6
  const recent = [...periods].reverse().slice(0, 6);
  el.innerHTML = recent.map(p => {
    const endLabel = p.end ? ` → ${formatShortDate(p.end)}` : '';
    const durLabel = (p.start && p.end)
      ? ` <span style="color:var(--muted);font-size:11px">(${daysBetween(p.start, p.end)} days)</span>`
      : '';
    return `
      <div class="period-log-item">
        <span class="period-log-date">🌑 ${formatShortDate(p.start)}${endLabel}${durLabel}</span>
        <button class="period-log-del" onclick="deletePeriod('${p.start}')" aria-label="Delete">×</button>
      </div>`;
  }).join('');
}

// ── Cycle intelligence ────────────────────
function getCycleStats() {
  const periods = loadPeriods();
  if (periods.length === 0) return null;

  const today = dateKey(currentDate);

  // Average cycle length from last 3+ cycles
  let avgCycleLen = 28;
  if (periods.length >= 2) {
    const lengths = [];
    for (let i = 1; i < periods.length; i++) {
      const len = daysBetween(periods[i - 1].start, periods[i].start);
      if (len >= 20 && len <= 45) lengths.push(len); // sanity check
    }
    if (lengths.length > 0) {
      avgCycleLen = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
    }
  }

  // Most recent period
  const lastPeriod = periods[periods.length - 1];
  const daysSincePeriod = daysBetween(lastPeriod.start, today);

  // Predicted next period
  const nextPeriodDate = addDays(lastPeriod.start, avgCycleLen);

  // Ovulation: typically 14 days before next period
  const ovulationDay = avgCycleLen - 14; // cycle day of ovulation
  const ovulationDate = addDays(lastPeriod.start, ovulationDay);

  // Fertile window: 5 days before ovulation + ovulation day
  const fertileStart = addDays(ovulationDate, -5);
  const fertileEnd   = addDays(ovulationDate, 1);

  // Current cycle day (1-indexed)
  const cycleDay = daysSincePeriod + 1;

  // Determine phase
  let phase = 'luteal';
  if (cycleDay <= 6)               phase = 'menstruation';
  else if (cycleDay <= ovulationDay - 1) phase = 'follicular';
  else if (cycleDay <= ovulationDay + 2) phase = 'ovulation';
  else                              phase = 'luteal';

  // Days until next period
  const daysUntilNext = daysBetween(today, nextPeriodDate);

  // Days until ovulation
  const daysUntilOvulation = daysBetween(today, ovulationDate);

  // Is today in fertile window?
  const inFertileWindow = today >= fertileStart && today <= fertileEnd;

  return {
    cycleDay,
    avgCycleLen,
    phase,
    lastPeriodStart: lastPeriod.start,
    nextPeriodDate,
    ovulationDate,
    fertileStart,
    fertileEnd,
    daysUntilNext,
    daysUntilOvulation,
    inFertileWindow,
  };
}

function updateCycleIntel() {
  const stats = getCycleStats();
  const intelName  = document.getElementById('intelName');
  const intelMoon  = document.getElementById('intelMoon');
  const intelStats = document.getElementById('intelStats');
  const predCard   = document.getElementById('predictionCard');

  if (!stats) {
    intelName.textContent  = 'Log a period start to begin tracking';
    intelMoon.textContent  = '🌙';
    intelStats.innerHTML   = '';
    if (predCard) predCard.style.display = 'none';
    return;
  }

  const pd = phaseData[stats.phase];
  intelMoon.textContent = pd.moon;
  intelName.textContent = `${pd.name} · Day ${stats.cycleDay} of ${stats.avgCycleLen}`;

  // Auto-set phase selector
  if (!selectedPhase) {
    setPhase(stats.phase);
  }

  // Stats pills
  const pills = [];
  if (stats.daysUntilNext >= 0) {
    pills.push(`<span class="intel-pill">Period in ${stats.daysUntilNext}d</span>`);
  }
  if (stats.daysUntilOvulation > 0) {
    pills.push(`<span class="intel-pill">Ovulation in ${stats.daysUntilOvulation}d</span>`);
  } else if (stats.daysUntilOvulation === 0) {
    pills.push(`<span class="intel-pill fertile-pill">Ovulation today ✦</span>`);
  }
  if (stats.inFertileWindow) {
    pills.push(`<span class="intel-pill fertile-pill">Fertile window ✦</span>`);
  }
  intelStats.innerHTML = pills.join('');

  // Prediction card
  if (predCard) {
    predCard.style.display = 'block';
    document.getElementById('predCycleLen').innerHTML =
      `<span class="pred-label">Avg cycle length</span><span class="pred-val">${stats.avgCycleLen} days</span>`;
    document.getElementById('predNextPeriod').innerHTML =
      `<span class="pred-label">Next period expected</span><span class="pred-val">${formatShortDate(stats.nextPeriodDate)}</span>`;
    document.getElementById('predFertileWindow').innerHTML =
      `<span class="pred-label">Fertile window</span><span class="pred-val">${formatShortDate(stats.fertileStart)} – ${formatShortDate(stats.fertileEnd)}</span>`;
    document.getElementById('predOvulation').innerHTML =
      `<span class="pred-label">Estimated ovulation</span><span class="pred-val">${formatShortDate(stats.ovulationDate)}</span>`;
  }

  // Auto-fill cycle day if empty
  const cycleDayEl = document.getElementById('cycleday');
  if (cycleDayEl && !cycleDayEl.value) {
    cycleDayEl.value = stats.cycleDay;
  }
}

// ── Phase ─────────────────────────────────
function setPhase(p) {
  selectedPhase = p;
  document.querySelectorAll('.cycle-phase').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('ph-' + p);
  if (btn) btn.classList.add('active');
  const d = phaseData[p];
  const moonEl = document.getElementById('phaseMoon');
  const nameEl = document.getElementById('phaseName');
  const hintEl = document.getElementById('phaseHint');
  if (moonEl) moonEl.textContent = d.moon;
  if (nameEl) nameEl.textContent = d.name;
  if (hintEl) hintEl.textContent = d.hint;
  updateWisdom(p);
}

function updateWisdom(phase) {
  const card = document.getElementById('phaseWisdom');
  const moon = document.getElementById('wisdomMoon');
  const text = document.getElementById('wisdomText');
  if (!card) return;
  if (!phase || !phaseWisdom[phase]) { card.style.display = 'none'; return; }
  moon.textContent = phaseWisdom[phase].moon;
  text.textContent = phaseWisdom[phase].text;
  card.style.display = 'flex';
}

// ── Star ratings ──────────────────────────
function initStars() {
  ['energy', 'mood', 'fog', 'anxiety', 'stress'].forEach(key => {
    const container = document.getElementById('stars-' + key);
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement('button');
      btn.className = 'star';
      btn.textContent = '●';
      btn.setAttribute('aria-label', i + ' out of 5');
      btn.dataset.val = i;
      btn.dataset.key = key;
      btn.addEventListener('click', () => setRating(key, i));
      container.appendChild(btn);
    }
  });
}

function setRating(key, val) {
  ratings[key] = val;
  document.querySelectorAll('#stars-' + key + ' .star').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.val) <= val);
  });
}

// ── Pill selectors ────────────────────────
function selectPill(btn, group, val) {
  if (group === 'mucus')     selectedMucus     = val;
  if (group === 'period')    selectedPeriod    = val;
  if (group === 'opk')       selectedOPK       = val;
  if (group === 'intimacy')  selectedIntimacy  = val;
  if (group === 'intensity') selectedIntensity = val;
  if (group === 'libido')    selectedLibido    = val;
  document.querySelectorAll('[data-group="' + group + '"]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ── Section toggle ────────────────────────
function toggle(id) {
  const body   = document.getElementById(id);
  const tog    = document.getElementById('tog-' + id);
  if (!body || !tog) return;
  const header = tog.closest('.section-header');
  const hidden = body.classList.toggle('hidden');
  tog.textContent = hidden ? '▼' : '▲';
  tog.classList.toggle('open', !hidden);
  if (header) header.setAttribute('aria-expanded', String(!hidden));
}

// ── Tasks ─────────────────────────────────
function renderTasks() {
  const area = document.getElementById('tasksArea');
  if (!area) return;
  area.innerHTML = '';
  tasks.forEach((task, idx) => {
    const row = document.createElement('div');
    row.className = 'task-item';

    const check = document.createElement('div');
    check.className = 'task-check' + (task.checked ? ' checked' : '');
    check.textContent = task.checked ? '✓' : '';
    check.setAttribute('role', 'checkbox');
    check.setAttribute('aria-checked', String(task.checked));
    check.addEventListener('click', () => { tasks[idx].checked = !tasks[idx].checked; renderTasks(); });

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'task-input' + (task.checked ? ' done' : '');
    inp.value = task.text;
    inp.placeholder = 'Task...';
    inp.addEventListener('input', () => { tasks[idx].text = inp.value; });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

    const del = document.createElement('button');
    del.className = 'task-remove';
    del.textContent = '×';
    del.setAttribute('aria-label', 'Remove task');
    del.addEventListener('click', () => { tasks.splice(idx, 1); renderTasks(); });

    row.appendChild(check); row.appendChild(inp); row.appendChild(del);
    area.appendChild(row);
  });
}

function addTask(text = '', checked = false) {
  tasks.push({ text, checked });
  renderTasks();
  const inputs = document.querySelectorAll('.task-input');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

// ── Read / write fields ───────────────────
function readFields() {
  const get = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  return {
    date: dateKey(currentDate),
    phase: selectedPhase,
    bedtime: get('bedtime'), waketime: get('waketime'),
    totalhours: get('totalhours'), nightwakings: get('nightwakings'), wakefeeling: get('wakefeeling'),
    ratings: { ...ratings },
    crash: get('crash'), herself: get('herself'),
    breakfast: get('breakfast'), lunch: get('lunch'), dinner: get('dinner'),
    snacks: get('snacks'), caffeine: get('caffeine'), water: get('water'), alcohol: get('alcohol'),
    cycleday: get('cycleday'), mucus: selectedMucus, period: selectedPeriod,
    sensations: get('sensations'), skinHair: get('skinHair'), libido: selectedLibido,
    bbt: get('bbt'), bbtTime: get('bbtTime'), bbtNotes: get('bbtNotes'),
    opk: selectedOPK, intimacy: selectedIntimacy,
    supplements: get('supplements'), exercise: get('exercise'), intensity: selectedIntensity,
    fertilityNotes: get('fertilityNotes'),
    tasks: tasks.map(t => ({ ...t })),
    notes: get('notesText'),
  };
}

function writeFields(entry) {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
  set('bedtime', entry.bedtime); set('waketime', entry.waketime);
  set('totalhours', entry.totalhours); set('nightwakings', entry.nightwakings); set('wakefeeling', entry.wakefeeling);
  set('crash', entry.crash); set('herself', entry.herself);
  set('breakfast', entry.breakfast); set('lunch', entry.lunch); set('dinner', entry.dinner);
  set('snacks', entry.snacks); set('caffeine', entry.caffeine); set('water', entry.water); set('alcohol', entry.alcohol);
  set('cycleday', entry.cycleday); set('sensations', entry.sensations); set('skinHair', entry.skinHair);
  set('bbt', entry.bbt); set('bbtTime', entry.bbtTime); set('bbtNotes', entry.bbtNotes);
  set('supplements', entry.supplements); set('exercise', entry.exercise);
  set('fertilityNotes', entry.fertilityNotes); set('notesText', entry.notes);

  ratings = entry.ratings ? { ...entry.ratings } : { energy:0, mood:0, fog:0, anxiety:0, stress:0 };
  Object.keys(ratings).forEach(k => setRating(k, ratings[k]));

  if (entry.phase) setPhase(entry.phase);

  selectedMucus = entry.mucus || '';
  document.querySelectorAll('[data-group="mucus"]').forEach(b => {
    b.classList.toggle('active', b.dataset && b.textContent.startsWith(entry.mucus));
  });

  selectedPeriod = entry.period || '';
  document.querySelectorAll('[data-group="period"]').forEach(b => {
    b.classList.toggle('active', b.textContent.toLowerCase() === (entry.period || ''));
  });

  ['opk','intimacy','intensity','libido'].forEach(group => {
    const val = entry[group] || '';
    document.querySelectorAll(`[data-group="${group}"]`).forEach(b => {
      b.classList.toggle('active', b.textContent.toLowerCase().startsWith(val));
    });
    if (group === 'opk')       selectedOPK       = val;
    if (group === 'intimacy')  selectedIntimacy  = val;
    if (group === 'intensity') selectedIntensity = val;
    if (group === 'libido')    selectedLibido    = val;
  });

  tasks = entry.tasks ? entry.tasks.map(t => ({ ...t })) : [];
  if (tasks.length === 0) tasks = [{text:'',checked:false},{text:'',checked:false},{text:'',checked:false}];
  renderTasks();
}

// ── localStorage ──────────────────────────
function loadEntries() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}
function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
function loadEntryForDate(key) {
  clearFields();
  const entries = loadEntries();
  if (entries[key]) writeFields(entries[key]);
  updateCycleIntel();
}

// ── Save ──────────────────────────────────
function saveEntry() {
  const entry = readFields();
  const entries = loadEntries();
  entries[entry.date] = entry;
  saveEntries(entries);
  showToast('Entry saved ✓');
  renderHistory();
}

// ── Clear ─────────────────────────────────
function clearFields() {
  ['bedtime','waketime','totalhours','nightwakings','wakefeeling',
   'crash','herself','breakfast','lunch','dinner','snacks',
   'caffeine','water','alcohol','cycleday','sensations','skinHair',
   'bbt','bbtTime','bbtNotes','supplements','exercise','fertilityNotes','notesText',
  ].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  ratings = { energy:0, mood:0, fog:0, anxiety:0, stress:0 };
  ['energy','mood','fog','anxiety','stress'].forEach(k => {
    document.querySelectorAll('#stars-' + k + ' .star').forEach(s => s.classList.remove('active'));
  });

  selectedPhase = ''; selectedMucus = ''; selectedPeriod = '';
  selectedOPK = ''; selectedIntimacy = ''; selectedIntensity = ''; selectedLibido = '';
  document.querySelectorAll('.cycle-phase,[data-group]').forEach(b => b.classList.remove('active'));

  const nameEl = document.getElementById('phaseName');
  const moonEl = document.getElementById('phaseMoon');
  const hintEl = document.getElementById('phaseHint');
  if (nameEl) nameEl.textContent = 'Select your phase above';
  if (moonEl) moonEl.textContent = '🌙';
  if (hintEl) hintEl.textContent = '';

  const wisdomCard = document.getElementById('phaseWisdom');
  if (wisdomCard) wisdomCard.style.display = 'none';

  tasks = [{text:'',checked:false},{text:'',checked:false},{text:'',checked:false}];
  renderTasks();
}

function clearAll() { clearFields(); }

// ── Toast ─────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

// ── History ───────────────────────────────
function renderHistory() {
  const entries = loadEntries();
  const keys = Object.keys(entries).sort().reverse();
  const list  = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');
  if (!list) return;
  list.innerHTML = '';
  if (keys.length === 0) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  keys.forEach(key => {
    const e = entries[key];
    const card = document.createElement('div');
    card.className = 'history-card';

    const headerRow = document.createElement('div');
    headerRow.className = 'history-card-header';

    const dateLabel = document.createElement('span');
    dateLabel.className = 'history-date';
    const d = parseLocalDate(key);
    dateLabel.textContent = d.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric' });

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:10px;align-items:center';

    if (e.phase && phaseData[e.phase]) {
      const badge = document.createElement('span');
      badge.className = 'history-phase-badge';
      badge.textContent = phaseData[e.phase].name;
      actions.appendChild(badge);
    }

    const delBtn = document.createElement('button');
    delBtn.className = 'history-delete';
    delBtn.textContent = '×';
    delBtn.setAttribute('aria-label', 'Delete entry');
    delBtn.addEventListener('click', () => deleteEntry(key));
    actions.appendChild(delBtn);

    headerRow.appendChild(dateLabel);
    headerRow.appendChild(actions);
    card.appendChild(headerRow);

    if (e.ratings) {
      const ratingsRow = document.createElement('div');
      ratingsRow.className = 'history-ratings';
      const labels = { energy:'Energy', mood:'Mood', fog:'Fog', anxiety:'Anxiety', stress:'Stress' };
      Object.entries(e.ratings).forEach(([k, v]) => {
        if (v > 0) {
          const s = document.createElement('span');
          s.innerHTML = '<span class="dot"></span>' + labels[k] + ' ' + v + '/5';
          ratingsRow.appendChild(s);
        }
      });
      if (ratingsRow.children.length) card.appendChild(ratingsRow);
    }

    if (e.notes && e.notes.trim()) {
      const np = document.createElement('div');
      np.className = 'history-notes';
      np.textContent = e.notes.length > 120 ? e.notes.slice(0, 120) + '…' : e.notes;
      card.appendChild(np);
    }

    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn-clear';
    loadBtn.style.cssText = 'margin-top:10px;font-size:11px;padding:6px 14px';
    loadBtn.textContent = 'Load entry';
    loadBtn.addEventListener('click', () => {
      currentDate = parseLocalDate(key);
      document.getElementById('dateDisplay').textContent = formatDate(currentDate);
      writeFields(e);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    card.appendChild(loadBtn);
    list.appendChild(card);
  });
}

function deleteEntry(key) {
  const entries = loadEntries();
  delete entries[key];
  saveEntries(entries);
  renderHistory();
  showToast('Entry deleted');
}

// ── Init ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('dateDisplay').textContent = formatDate(currentDate);
  initStars();
  tasks = [{text:'',checked:false},{text:'',checked:false},{text:'',checked:false}];
  renderTasks();
  renderHistory();
  renderPeriodHistory();
  updateCycleIntel();
  loadEntryForDate(dateKey(currentDate));
});
