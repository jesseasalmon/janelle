/* ─────────────────────────────────────────
   Hormone Phase Tracker — app.js
   All data stored in localStorage so entries
   persist across sessions without a backend.
   ───────────────────────────────────────── */

'use strict';

// ── State ────────────────────────────────
let currentDate = new Date();
let selectedPhase  = '';
let selectedMucus  = '';
let selectedPeriod = '';
let ratings = { energy: 0, mood: 0, fog: 0, anxiety: 0 };
let tasks   = [];         // [{ text, checked }]

const STORAGE_KEY = 'hormone_tracker_entries';

// ── Phase metadata ────────────────────────
const phaseData = {
  menstruation: { moon: '🌑', name: 'Menstruation',  hint: 'Honor your limits'           },
  follicular:   { moon: '🌒', name: 'Follicular',    hint: 'Start new projects'           },
  ovulation:    { moon: '🌕', name: 'Ovulation',     hint: 'Speak up + collaborate'       },
  luteal:       { moon: '🌗', name: 'Luteal',        hint: 'Plan, organise + finish tasks' },
};

// ── Date helpers ──────────────────────────
function dateKey(d) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatDate(d) {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function changeDate(n) {
  currentDate.setDate(currentDate.getDate() + n);
  document.getElementById('dateDisplay').textContent = formatDate(currentDate);
  loadEntryForDate(dateKey(currentDate));
}

// ── Phase ─────────────────────────────────
function setPhase(p) {
  selectedPhase = p;
  document.querySelectorAll('.cycle-phase').forEach(b => b.classList.remove('active'));
  document.getElementById('ph-' + p).classList.add('active');
  const d = phaseData[p];
  document.getElementById('phaseMoon').textContent = d.moon;
  document.getElementById('phaseName').textContent  = d.name;
  document.getElementById('phaseHint').textContent  = d.hint;
}

// ── Star ratings ──────────────────────────
function initStars() {
  ['energy', 'mood', 'fog', 'anxiety'].forEach(key => {
    const container = document.getElementById('stars-' + key);
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement('button');
      btn.className   = 'star';
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
  if (group === 'mucus')  selectedMucus  = val;
  if (group === 'period') selectedPeriod = val;
  document.querySelectorAll('[data-group="' + group + '"]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ── Section toggle ────────────────────────
function toggle(id) {
  const body   = document.getElementById(id);
  const tog    = document.getElementById('tog-' + id);
  const header = tog.closest('.section-header');
  const hidden = body.classList.toggle('hidden');
  tog.textContent = hidden ? '▼' : '▲';
  tog.classList.toggle('open', !hidden);
  if (header) header.setAttribute('aria-expanded', String(!hidden));
}

// ── Tasks ─────────────────────────────────
function renderTasks() {
  const area = document.getElementById('tasksArea');
  area.innerHTML = '';
  tasks.forEach((task, idx) => {
    const row    = document.createElement('div');
    row.className = 'task-item';

    const check  = document.createElement('div');
    check.className = 'task-check' + (task.checked ? ' checked' : '');
    check.textContent = task.checked ? '✓' : '';
    check.setAttribute('role', 'checkbox');
    check.setAttribute('aria-checked', String(task.checked));
    check.addEventListener('click', () => {
      tasks[idx].checked = !tasks[idx].checked;
      renderTasks();
    });

    const inp = document.createElement('input');
    inp.type        = 'text';
    inp.className   = 'task-input' + (task.checked ? ' done' : '');
    inp.value       = task.text;
    inp.placeholder = 'Task...';
    inp.addEventListener('input', () => { tasks[idx].text = inp.value; });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') addTask();
    });

    const del = document.createElement('button');
    del.className   = 'task-remove';
    del.textContent = '×';
    del.setAttribute('aria-label', 'Remove task');
    del.addEventListener('click', () => {
      tasks.splice(idx, 1);
      renderTasks();
    });

    row.appendChild(check);
    row.appendChild(inp);
    row.appendChild(del);
    area.appendChild(row);
  });
}

function addTask(text = '', checked = false) {
  tasks.push({ text, checked });
  renderTasks();
  // Focus the new input
  const inputs = document.querySelectorAll('.task-input');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

// ── Read all field values ──────────────────
function readFields() {
  const get = id => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };
  return {
    date:       dateKey(currentDate),
    phase:      selectedPhase,
    // Sleep
    bedtime:    get('bedtime'),
    waketime:   get('waketime'),
    totalhours: get('totalhours'),
    nightwakings: get('nightwakings'),
    wakefeeling:  get('wakefeeling'),
    // Energy & Mood
    ratings:    { ...ratings },
    crash:      get('crash'),
    herself:    get('herself'),
    // Food
    breakfast:  get('breakfast'),
    lunch:      get('lunch'),
    dinner:     get('dinner'),
    snacks:     get('snacks'),
    caffeine:   get('caffeine'),
    water:      get('water'),
    alcohol:    get('alcohol'),
    // Cycle
    cycleday:   get('cycleday'),
    mucus:      selectedMucus,
    period:     selectedPeriod,
    sensations: get('sensations'),
    // Misc
    tasks:      tasks.map(t => ({ ...t })),
    notes:      get('notesText'),
  };
}

// ── Write values back to fields ────────────
function writeFields(entry) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  };
  set('bedtime',     entry.bedtime);
  set('waketime',    entry.waketime);
  set('totalhours',  entry.totalhours);
  set('nightwakings',entry.nightwakings);
  set('wakefeeling', entry.wakefeeling);
  set('crash',       entry.crash);
  set('herself',     entry.herself);
  set('breakfast',   entry.breakfast);
  set('lunch',       entry.lunch);
  set('dinner',      entry.dinner);
  set('snacks',      entry.snacks);
  set('caffeine',    entry.caffeine);
  set('water',       entry.water);
  set('alcohol',     entry.alcohol);
  set('cycleday',    entry.cycleday);
  set('sensations',  entry.sensations);
  set('notesText',   entry.notes);

  // Ratings
  ratings = entry.ratings ? { ...entry.ratings } : { energy:0, mood:0, fog:0, anxiety:0 };
  Object.keys(ratings).forEach(k => setRating(k, ratings[k]));

  // Phase
  if (entry.phase) setPhase(entry.phase);

  // Mucus
  selectedMucus = entry.mucus || '';
  document.querySelectorAll('[data-group="mucus"]').forEach(b => {
    b.classList.toggle('active', b.textContent.startsWith(entry.mucus));
  });

  // Period
  selectedPeriod = entry.period || '';
  document.querySelectorAll('[data-group="period"]').forEach(b => {
    b.classList.toggle('active', b.textContent.toLowerCase() === (entry.period || ''));
  });

  // Tasks
  tasks = entry.tasks ? entry.tasks.map(t => ({ ...t })) : [];
  if (tasks.length === 0) { tasks = [{text:'',checked:false},{text:'',checked:false},{text:'',checked:false}]; }
  renderTasks();
}

// ── localStorage helpers ──────────────────
function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadEntryForDate(key) {
  clearFields();
  const entries = loadEntries();
  if (entries[key]) writeFields(entries[key]);
}

// ── Save ──────────────────────────────────
function saveEntry() {
  const entry   = readFields();
  const entries = loadEntries();
  entries[entry.date] = entry;
  saveEntries(entries);
  showToast('Entry saved ✓');
  renderHistory();
}

// ── Clear form ────────────────────────────
function clearFields() {
  [
    'bedtime','waketime','totalhours','nightwakings','wakefeeling',
    'crash','herself','breakfast','lunch','dinner','snacks',
    'caffeine','water','alcohol','cycleday','sensations','notesText',
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ratings = { energy:0, mood:0, fog:0, anxiety:0 };
  ['energy','mood','fog','anxiety'].forEach(k => {
    document.querySelectorAll('#stars-' + k + ' .star').forEach(s => s.classList.remove('active'));
  });
  selectedPhase = ''; selectedMucus = ''; selectedPeriod = '';
  document.querySelectorAll('.cycle-phase,[data-group]').forEach(b => b.classList.remove('active'));
  document.getElementById('phaseName').textContent = 'Select your phase above';
  document.getElementById('phaseMoon').textContent = '🌙';
  document.getElementById('phaseHint').textContent  = '';
  tasks = [{ text:'',checked:false },{ text:'',checked:false },{ text:'',checked:false }];
  renderTasks();
}

function clearAll() {
  clearFields();
}

// ── Toast ─────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ── History panel ─────────────────────────
function renderHistory() {
  const entries = loadEntries();
  const keys    = Object.keys(entries).sort().reverse();
  const list    = document.getElementById('historyList');
  const empty   = document.getElementById('historyEmpty');

  list.innerHTML = '';
  if (keys.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  keys.forEach(key => {
    const e = entries[key];
    const card = document.createElement('div');
    card.className = 'history-card';

    // Header row
    const headerRow = document.createElement('div');
    headerRow.className = 'history-card-header';
    const dateLabel = document.createElement('span');
    dateLabel.className = 'history-date';
    const d = new Date(key + 'T12:00:00');
    dateLabel.textContent = d.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric' });

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:10px;align-items:center';

    if (e.phase) {
      const badge = document.createElement('span');
      badge.className  = 'history-phase-badge';
      badge.textContent = phaseData[e.phase] ? phaseData[e.phase].name : e.phase;
      actions.appendChild(badge);
    }

    const delBtn = document.createElement('button');
    delBtn.className   = 'history-delete';
    delBtn.textContent = '×';
    delBtn.setAttribute('aria-label', 'Delete entry');
    delBtn.addEventListener('click', () => deleteEntry(key));
    actions.appendChild(delBtn);

    headerRow.appendChild(dateLabel);
    headerRow.appendChild(actions);
    card.appendChild(headerRow);

    // Ratings summary
    if (e.ratings) {
      const ratingsRow = document.createElement('div');
      ratingsRow.className = 'history-ratings';
      const labels = { energy:'Energy', mood:'Mood', fog:'Fog', anxiety:'Anxiety' };
      Object.entries(e.ratings).forEach(([k, v]) => {
        if (v > 0) {
          const s = document.createElement('span');
          s.innerHTML = '<span class="dot"></span>' + labels[k] + ' ' + v + '/5';
          ratingsRow.appendChild(s);
        }
      });
      if (ratingsRow.children.length) card.appendChild(ratingsRow);
    }

    // Notes preview
    if (e.notes && e.notes.trim()) {
      const np = document.createElement('div');
      np.className = 'history-notes';
      np.textContent = e.notes.length > 120 ? e.notes.slice(0, 120) + '…' : e.notes;
      card.appendChild(np);
    }

    // Load button
    const loadBtn = document.createElement('button');
    loadBtn.className   = 'btn-clear';
    loadBtn.style.cssText = 'margin-top:10px;font-size:10px;padding:6px 14px;letter-spacing:0.08em';
    loadBtn.textContent = 'Load entry';
    loadBtn.addEventListener('click', () => {
      currentDate = new Date(key + 'T12:00:00');
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
  tasks = [{ text:'',checked:false },{ text:'',checked:false },{ text:'',checked:false }];
  renderTasks();
  renderHistory();
  loadEntryForDate(dateKey(currentDate));
});
