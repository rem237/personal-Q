/* ═══════════════════════════════════════════════════════════
   PersonalQ — Goal Tracker v6
   Multi-year · Real chart data · Pivot system · Daily quotes
   ═══════════════════════════════════════════════════════════ */

const CURRENT_YEAR = new Date().getFullYear();
let activeYear = CURRENT_YEAR;
let goals = [];
let archivedGoals = [];
let progressChart = null;
let lockinGoalId = null;
let pivotGoalId = null;
let chartMode = 'year';
let insightTimers = [];

/* ── Motivational quotes ────────────────────────────────── */
const QUOTES = [
  ["Discipline is choosing between what you want now and what you want most.", "Abraham Lincoln"],
  ["The secret of getting ahead is getting started.", "Mark Twain"],
  ["Small daily improvements over time lead to stunning results.", "Robin Sharma"],
  ["You don't have to be extreme, just consistent.", ""],
  ["The pain of discipline weighs ounces. The pain of regret weighs tons.", "Jim Rohn"],
  ["Success is the sum of small efforts repeated day in and day out.", "Robert Collier"],
  ["Don't watch the clock; do what it does. Keep going.", "Sam Levenson"],
  ["The only way to do great work is to love what you do.", "Steve Jobs"],
  ["It does not matter how slowly you go as long as you do not stop.", "Confucius"],
  ["Start where you are. Use what you have. Do what you can.", "Arthur Ashe"],
  ["Motivation gets you going. Discipline keeps you growing.", "John C. Maxwell"],
  ["What you do today can improve all your tomorrows.", "Ralph Marston"],
  ["Dream big. Start small. Act now.", "Robin Sharma"],
  ["Progress, not perfection.", ""],
  ["Your future is created by what you do today, not tomorrow.", "Robert Kiyosaki"],
  ["Be stronger than your strongest excuse.", ""],
  ["Fall seven times, stand up eight.", "Japanese Proverb"],
  ["The best time to plant a tree was 20 years ago. The second best time is now.", "Chinese Proverb"],
  ["Action is the foundational key to all success.", "Pablo Picasso"],
  ["Believe you can and you're halfway there.", "Theodore Roosevelt"],
  ["A goal without a plan is just a wish.", "Antoine de Saint-Exupéry"],
  ["The distance between your dreams and reality is called discipline.", ""],
  ["Champions keep playing until they get it right.", "Billie Jean King"],
  ["Every expert was once a beginner.", ""],
  ["You are never too old to set another goal or to dream a new dream.", "C.S. Lewis"],
  ["One day or day one. You decide.", ""],
  ["Push yourself because no one else is going to do it for you.", ""],
  ["Great things never come from comfort zones.", ""],
  ["Don't limit your challenges. Challenge your limits.", ""],
  ["The only impossible journey is the one you never begin.", "Tony Robbins"],
];

/* ── Chart colors & bar opacities ──────────────────────── */
const CHART_COLORS = [
  'rgba(0,229,160,0.8)', 'rgba(0,180,216,0.8)', 'rgba(167,139,250,0.8)',
  'rgba(96,165,250,0.8)', 'rgba(251,191,36,0.8)', 'rgba(248,113,113,0.8)'
];
const BAR_OPACITIES = [0.72, 0.52, 0.38, 0.27, 0.19, 0.14];

/* ── Glow plugin ────────────────────────────────────────── */
const glowPlugin = {
  id: 'glowLines',
  beforeDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    chart.data.datasets.forEach((ds, i) => {
      if (!ds.borderColor || ds.borderDash || typeof ds.borderColor !== 'string') return;
      const meta = chart.getDatasetMeta(i);
      if (!meta.visible) return;
      ctx.shadowColor = ds.borderColor;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.strokeStyle = ds.borderColor;
      ctx.globalAlpha = 0.18;
      const path = new Path2D();
      let started = false;
      meta.data.forEach(pt => {
        if (pt.skip) return;
        if (!started) { path.moveTo(pt.x, pt.y); started = true; }
        else path.lineTo(pt.x, pt.y);
      });
      ctx.stroke(path);
    });
    ctx.restore();
  }
};

/* ═══════════════════════════════════════════════════════════
   INITIALIZATION
   ═══════════════════════════════════════════════════════════ */
(function init() {
  const savedYear = parseInt(localStorage.getItem('personalq_active_year'));
  activeYear = (!isNaN(savedYear) && savedYear > 2000 && savedYear < 2100) ? savedYear : CURRENT_YEAR;

  if (localStorage.getItem('personalq_first_login') === 'true') {
    localStorage.removeItem('personalq_first_login');
    const wo = document.getElementById('welcome-overlay');
    if (wo) wo.classList.remove('hidden');
  }

  try {
    const session = JSON.parse(localStorage.getItem('personalq_session') || '{}');
    if (session.name) {
      const el = document.getElementById('nav-username');
      if (el) el.textContent = session.name;
    }
  } catch(e) {}

  showCurrentDate();
  showDailyQuote();
  loadGoals();
  loadArchived();
  updateYearUI();
  // Set smart welcome for assistant panel
  var welcomeEl = document.getElementById('qa-welcome');
  if (welcomeEl) welcomeEl.textContent = getSmartWelcome();
})();

/* ═══════════════════════════════════════════════════════════
   FLOATING ASSISTANT TOGGLE
   ═══════════════════════════════════════════════════════════ */
var assistantOpen = false;
function toggleAssistant() {
  assistantOpen = !assistantOpen;
  var panel = document.getElementById('qa-panel');
  var fab = document.getElementById('bot-fab');
  var overlay = document.getElementById('qa-panel-overlay');
  if (assistantOpen) {
    panel.classList.add('open');
    fab.classList.add('open');
    overlay.classList.remove('hidden');
    var inp = document.getElementById('qa-input');
    if (inp) setTimeout(function(){ inp.focus(); }, 300);
  } else {
    panel.classList.remove('open');
    fab.classList.remove('open');
    overlay.classList.add('hidden');
  }
}

/* ═══════════════════════════════════════════════════════════
   DAILY QUOTE
   ═══════════════════════════════════════════════════════════ */
function showDailyQuote() {
  const textEl = document.getElementById('quote-text');
  const authEl = document.getElementById('quote-author');
  if (!textEl) return;

  let quoteIdx = Math.floor(Math.random() * QUOTES.length);

  function setQuote(idx) {
    const q = QUOTES[idx];
    textEl.textContent = '\u201c' + q[0] + '\u201d';
    if (authEl) authEl.textContent = q[1] ? '\u2014 ' + q[1] : '';
  }

  setQuote(quoteIdx);

  // Rotate quotes every 8 seconds with fade
  setInterval(function() {
    quoteIdx = (quoteIdx + 1) % QUOTES.length;
    textEl.style.transition = 'opacity 0.4s';
    if (authEl) authEl.style.transition = 'opacity 0.4s';
    textEl.style.opacity = '0';
    if (authEl) authEl.style.opacity = '0';
    setTimeout(function() {
      setQuote(quoteIdx);
      textEl.style.opacity = '1';
      if (authEl) authEl.style.opacity = '1';
    }, 400);
  }, 8000);
}

function showCurrentDate() {
  const quoteEl = document.getElementById('daily-quote');
  if (!quoteEl) return;
  const now = new Date();
  const formatted = now.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const dateDiv = document.createElement('div');
  dateDiv.className = 'current-date';
  dateDiv.textContent = formatted;
  quoteEl.parentNode.insertBefore(dateDiv, quoteEl);
}

/* ═══════════════════════════════════════════════════════════
   YEAR MANAGEMENT
   ═══════════════════════════════════════════════════════════ */
function getYears() {
  try {
    const y = JSON.parse(localStorage.getItem('personalq_years'));
    if (Array.isArray(y) && y.length) return y.sort((a,b) => a - b);
  } catch(e) {}
  return [CURRENT_YEAR];
}

function ensureYear(year) {
  const years = getYears();
  if (!years.includes(year)) {
    years.push(year);
    years.sort((a,b) => a - b);
    localStorage.setItem('personalq_years', JSON.stringify(years));
  }
}

function changeYear(dir) {
  const years = getYears();
  const idx = years.indexOf(activeYear);
  const ni = idx + dir;
  if (ni < 0 || ni >= years.length) return;
  activeYear = years[ni];
  localStorage.setItem('personalq_active_year', String(activeYear));
  loadGoals();
  loadArchived();
  updateYearUI();
}

function startNextYear() {
  const years = getYears();
  const maxYr = Math.max(...years, CURRENT_YEAR);
  const nextYr = maxYr + 1;
  ensureYear(nextYr);
  activeYear = nextYr;
  localStorage.setItem('personalq_active_year', String(activeYear));
  loadGoals();
  loadArchived();
  updateYearUI();
}

function updateYearUI() {
  const years = getYears();
  const idx = years.indexOf(activeYear);

  const yd = document.getElementById('year-display');
  if (yd) yd.textContent = activeYear;

  const pb = document.getElementById('prev-year-btn');
  const nb = document.getElementById('next-year-btn');
  if (pb) pb.disabled = (idx <= 0);
  if (nb) nb.disabled = (idx >= years.length - 1);

  const badge = document.getElementById('year-badge');
  if (badge) {
    if (activeYear === CURRENT_YEAR) { badge.textContent = 'Current'; badge.className = 'year-badge year-badge-current'; }
    else if (activeYear < CURRENT_YEAR) { badge.textContent = 'Past'; badge.className = 'year-badge year-badge-past'; }
    else { badge.textContent = 'Upcoming'; badge.className = 'year-badge year-badge-future'; }
  }

  const nyb = document.getElementById('new-year-btn');
  if (nyb) {
    const maxYr = Math.max(...years, CURRENT_YEAR);
    if (activeYear === maxYr) {
      nyb.style.display = 'inline-flex';
      nyb.textContent = '+ Start ' + (maxYr + 1);
    } else {
      nyb.style.display = 'none';
    }
  }

  const isPast = activeYear < CURRENT_YEAR;
  const addBtn = document.querySelector('.btn-add-goal');
  if (addBtn) addBtn.style.display = isPast ? 'none' : 'inline-flex';

  const roBanner = document.getElementById('readonly-banner');
  if (roBanner) roBanner.style.display = isPast ? 'flex' : 'none';
}

/* ═══════════════════════════════════════════════════════════
   STORAGE
   ═══════════════════════════════════════════════════════════ */
function storageKey() { return 'personalq_goals_' + activeYear; }
function archiveKey() { return 'personalq_archived_' + activeYear; }
function historyKey(yr) { return 'personalq_history_' + (yr != null ? yr : activeYear); }

function loadGoals() {
  try { goals = JSON.parse(localStorage.getItem(storageKey())) || []; } catch(e) { goals = []; }
  ensureYear(activeYear);
  renderGoals();
  updateOverall();
  buildChart();
  renderInsights();
  renderBreakdown();
}

function persist() { localStorage.setItem(storageKey(), JSON.stringify(goals)); }

function loadArchived() {
  try { archivedGoals = JSON.parse(localStorage.getItem(archiveKey())) || []; } catch(e) { archivedGoals = []; }
  renderArchived();
}

function persistArchived() { localStorage.setItem(archiveKey(), JSON.stringify(archivedGoals)); }

function getHistory(yr) {
  try { return JSON.parse(localStorage.getItem(historyKey(yr))) || []; } catch(e) { return []; }
}

function recordSnapshot() {
  const history = getHistory(activeYear);
  const today = new Date().toISOString().slice(0, 10);
  const goalMap = {};
  goals.forEach(g => { goalMap[g.id] = g.progress || 0; });
  const total = goals.length;
  const avg = total > 0 ? Math.round(goals.reduce((s,g) => s + (g.progress||0), 0) / total) : 0;
  const snap = { date: today, overall: avg, goals: goalMap };
  const idx = history.findIndex(h => h.date === today);
  if (idx >= 0) history[idx] = snap; else history.push(snap);
  history.sort((a,b) => a.date.localeCompare(b.date));
  localStorage.setItem(historyKey(activeYear), JSON.stringify(history));
}

/* ═══════════════════════════════════════════════════════════
   RENDER GOAL CARDS
   ═══════════════════════════════════════════════════════════ */
function renderGoals() {
  const list = document.getElementById('goals-list');
  if (!list) return;
  const isPast = activeYear < CURRENT_YEAR;

  if (goals.length === 0) {
    list.innerHTML = '<div class="goals-empty"><p>No goals for ' + activeYear + '</p><span>' +
      (isPast ? 'No goals were recorded.' : 'Tap "Add Goal" to get started.') + '</span></div>';
    return;
  }
  list.innerHTML = goals.map((g, i) => renderCard(g, i, isPast)).join('');
}

function renderCard(g, idx, isPast) {
  const pct = g.progress || 0;
  const done = pct >= 100;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = g.deadline && g.deadline < today && !done;
  const hasNextStep = g.nextStep && g.nextStep.trim();

  let deadlineHtml = '';
  if (g.deadline) {
    const dl = new Date(g.deadline + 'T00:00:00');
    const formatted = dl.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    if (overdue) {
      deadlineHtml = '<span class="goal-deadline overdue-text">\u23F1 Overdue \u00B7 ' + formatted + '</span>';
    } else {
      deadlineHtml = '<span class="goal-deadline">\u23F1 ' + formatted + '</span>';
    }
  }

  let nextStepHtml = '';
  if (hasNextStep) {
    nextStepHtml = '<div class="goal-next-step"><span class="next-step-tag">Next step</span> ' + esc(g.nextStep) + '</div>';
  }

  // Last logged timestamp
  let loggedHtml = '';
  if (g.lastLoggedAt) {
    const logDate = new Date(g.lastLoggedAt);
    const logStr = logDate.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }) +
      ' at ' + logDate.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
    loggedHtml = '<div class="goal-logged-time">Last logged: ' + logStr + '</div>';
  }

  // Inline Lock In: input + quick chips directly on card
  let actionsHtml = '';
  if (!isPast) {
    actionsHtml = '<div class="goal-inline-lockin" id="lockin-area-' + g.id + '">' +
      '<input class="inline-pct-input" type="number" min="0" max="100" value="' + pct + '" id="inline-pct-' + g.id + '" ' +
        'onkeydown="if(event.key===\'Enter\')inlineSave(\'' + g.id + '\')" />' +
      '<span class="inline-pct-unit">%</span>' +
      '<div class="inline-quick-chips">' +
        '<button class="inline-chip" onclick="inlineSet(\'' + g.id + '\',25)">25</button>' +
        '<button class="inline-chip" onclick="inlineSet(\'' + g.id + '\',50)">50</button>' +
        '<button class="inline-chip" onclick="inlineSet(\'' + g.id + '\',75)">75</button>' +
        '<button class="inline-chip inline-chip-done" onclick="inlineSet(\'' + g.id + '\',100)">\u2713</button>' +
      '</div>' +
      '<button class="inline-save-btn" onclick="inlineSave(\'' + g.id + '\')">Log</button>' +
      (overdue ? '<button class="btn-ghost btn-pivot" onclick="openPivot(\'' + g.id + '\')" style="padding:5px 8px;font-size:10px">Pivot</button>' : '') +
    '</div>';
  }

  return '<div class="goal-card' + (done ? ' card-done' : '') + (overdue ? ' card-overdue' : '') + '" id="card-' + g.id + '" style="animation-delay:' + (idx * 0.04) + 's">' +
    '<div class="goal-card-top">' +
      '<div class="goal-title-area">' +
        '<div class="goal-title">' + esc(g.title) + '</div>' +
        deadlineHtml +
      '</div>' +
      '<div class="goal-top-right">' +
        (done ? '<span class="badge-done">\u2713</span>' : '') +
        (!isPast ? '<button class="btn-icon-sm" onclick="deleteGoal(\'' + g.id + '\')" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>' : '') +
      '</div>' +
    '</div>' +
    nextStepHtml +
    '<div class="goal-bar-row">' +
      '<div class="goal-bar-track"><div class="goal-bar-fill" style="width:' + pct + '%"></div></div>' +
      '<span class="goal-pct">' + pct + '%</span>' +
    '</div>' +
    loggedHtml +
    renderSubgoals(g, isPast) +
    actionsHtml +
  '</div>';
}

/* ── Inline Lock In functions ──────────────────────────────── */
function inlineSet(id, val) {
  var inp = document.getElementById('inline-pct-' + id);
  if (inp) inp.value = val;
}

function inlineSave(id) {
  var inp = document.getElementById('inline-pct-' + id);
  if (!inp) return;
  var val = Math.max(0, Math.min(100, parseInt(inp.value) || 0));
  var goal = goals.find(function(g){ return g.id === id; });
  if (!goal) return;
  var wasDone = (goal.progress || 0) >= 100;
  goal.prevProgress = goal.progress;
  goal.progress = val;
  goal.lastLoggedAt = new Date().toISOString();
  if (val > 0) goal.nextStep = null;
  persist();
  renderGoals(); updateOverall(); recordSnapshot(); buildChart(); renderInsights();
  flashCard(goal.id);
  if (val >= 100 && !wasDone) showCongrats(goal.title);
}

/* ═══════════════════════════════════════════════════════════
   SUB-GOALS (Checklist) with auto-progress
   ═══════════════════════════════════════════════════════════ */
function toggleSubgoals(id) {
  var list = document.getElementById('subgoals-' + id);
  var btn = document.getElementById('subtoggle-' + id);
  if (!list || !btn) return;
  var isHidden = list.style.display === 'none';
  list.style.display = isHidden ? 'block' : 'none';
  btn.classList.toggle('open', isHidden);
}

function addSubgoal(id) {
  var inp = document.getElementById('subadd-' + id);
  if (!inp) return;
  var text = inp.value.trim();
  if (!text) { inp.focus(); return; }

  var goal = goals.find(function(g){ return g.id === id; });
  if (!goal) return;
  if (!goal.subgoals) goal.subgoals = [];
  goal.subgoals.push({ id: Date.now().toString(36), text: text, done: false });
  inp.value = '';
  autoUpdateProgress(goal);
  persist(); renderGoals(); updateOverall(); recordSnapshot(); buildChart(); renderInsights(); renderBreakdown();
}

function toggleSubgoalDone(goalId, subId) {
  var goal = goals.find(function(g){ return g.id === goalId; });
  if (!goal || !goal.subgoals) return;
  var sub = goal.subgoals.find(function(s){ return s.id === subId; });
  if (!sub) return;
  sub.done = !sub.done;
  autoUpdateProgress(goal);
  persist(); renderGoals(); updateOverall(); recordSnapshot(); buildChart(); renderInsights(); renderBreakdown();
  flashCard(goalId);
}

function removeSubgoal(goalId, subId) {
  var goal = goals.find(function(g){ return g.id === goalId; });
  if (!goal || !goal.subgoals) return;
  goal.subgoals = goal.subgoals.filter(function(s){ return s.id !== subId; });
  autoUpdateProgress(goal);
  persist(); renderGoals(); updateOverall(); recordSnapshot(); buildChart(); renderInsights(); renderBreakdown();
}

function autoUpdateProgress(goal) {
  if (!goal.subgoals || goal.subgoals.length === 0) return;
  var total = goal.subgoals.length;
  var done = goal.subgoals.filter(function(s){ return s.done; }).length;
  var wasDone = (goal.progress || 0) >= 100;
  goal.prevProgress = goal.progress;
  goal.progress = Math.round((done / total) * 100);
  goal.lastLoggedAt = new Date().toISOString();
  if (goal.progress >= 100 && !wasDone) showCongrats(goal.title);
}

function renderSubgoals(g, isPast) {
  var subs = g.subgoals || [];
  if (subs.length === 0 && isPast) return '';
  var doneCount = subs.filter(function(s){ return s.done; }).length;
  var label = subs.length > 0 ? doneCount + '/' + subs.length + ' steps' : 'Add steps';

  var html = '<div class="subgoals-section">';
  html += '<button class="subgoals-toggle' + (subs.length ? ' open' : '') + '" id="subtoggle-' + g.id + '" onclick="toggleSubgoals(\'' + g.id + '\')">';
  html += '<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg> ';
  html += label + '</button>';

  html += '<div id="subgoals-' + g.id + '" style="display:' + (subs.length ? 'block' : 'none') + '">';
  html += '<div class="subgoals-list">';
  subs.forEach(function(s) {
    html += '<div class="subgoal-item">';
    html += '<div class="subgoal-check' + (s.done ? ' checked' : '') + '"' + (!isPast ? ' onclick="toggleSubgoalDone(\'' + g.id + '\',\'' + s.id + '\')"' : '') + '>' + (s.done ? '\u2713' : '') + '</div>';
    html += '<span class="subgoal-text' + (s.done ? ' done' : '') + '">' + esc(s.text) + '</span>';
    if (!isPast) html += '<button class="subgoal-remove" onclick="removeSubgoal(\'' + g.id + '\',\'' + s.id + '\')">\u00D7</button>';
    html += '</div>';
  });
  html += '</div>';
  if (!isPast) {
    html += '<div class="subgoal-add-row">';
    html += '<input class="subgoal-add-input" type="text" id="subadd-' + g.id + '" placeholder="Add a step..." maxlength="100" onkeydown="if(event.key===\'Enter\')addSubgoal(\'' + g.id + '\')" />';
    html += '<button class="subgoal-add-btn" onclick="addSubgoal(\'' + g.id + '\')">+ Add</button>';
    html += '</div>';
  }
  html += '</div></div>';
  return html;
}

/* ═══════════════════════════════════════════════════════════
   QUARTERLY / MONTHLY BREAKDOWN
   ═══════════════════════════════════════════════════════════ */
var breakdownView = 'quarterly';

function setBreakdown(view) {
  breakdownView = view;
  document.querySelectorAll('.breakdown-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.view === view);
  });
  renderBreakdown();
}

function renderBreakdown() {
  var grid = document.getElementById('breakdown-grid');
  if (!grid) return;
  if (goals.length === 0) {
    var sec = document.getElementById('breakdown-section');
    if (sec) sec.style.display = 'none';
    return;
  }
  var sec = document.getElementById('breakdown-section');
  if (sec) sec.style.display = 'block';

  var today = new Date();
  var currentMonth = today.getMonth();
  var currentQuarter = Math.floor(currentMonth / 3);
  var history = getHistory(activeYear);
  var isCurrent = activeYear === CURRENT_YEAR;

  if (breakdownView === 'quarterly') {
    var quarters = [
      { label: 'Q1', months: 'Jan — Mar', idx: 0 },
      { label: 'Q2', months: 'Apr — Jun', idx: 1 },
      { label: 'Q3', months: 'Jul — Sep', idx: 2 },
      { label: 'Q4', months: 'Oct — Dec', idx: 3 }
    ];

    grid.innerHTML = quarters.map(function(q) {
      var isCur = isCurrent && q.idx === currentQuarter;
      var isPast = isCurrent ? q.idx < currentQuarter : activeYear < CURRENT_YEAR;
      var qStart = new Date(activeYear, q.idx * 3, 1).toISOString().slice(0,10);
      var qEnd = new Date(activeYear, q.idx * 3 + 3, 0).toISOString().slice(0,10);

      // Find snapshots in this quarter
      var qSnaps = history.filter(function(h) { return h.date >= qStart && h.date <= qEnd; });
      var pct = 0;
      if (qSnaps.length > 0) {
        pct = qSnaps[qSnaps.length - 1].overall || 0;
      } else if (isCur || (isCurrent && q.idx > currentQuarter)) {
        // Use current progress for current/future quarters
        pct = goals.length > 0 ? Math.round(goals.reduce(function(s,g){return s+(g.progress||0);},0)/goals.length) : 0;
      }
      if (!isCurrent && activeYear < CURRENT_YEAR && qSnaps.length === 0) pct = 0;

      var detail = '';
      if (isCur) detail = 'In progress';
      else if (isPast && pct > 0) detail = 'Completed';
      else if (!isPast) detail = 'Upcoming';
      else detail = 'No data';

      return '<div class="breakdown-card' + (isCur ? ' breakdown-card-current' : '') + '">' +
        '<div class="breakdown-period' + (isCur ? ' breakdown-period-current' : '') + '">' + q.label + ' <span style="font-weight:500;text-transform:none;letter-spacing:0">' + q.months + '</span></div>' +
        '<div class="breakdown-pct">' + pct + '%</div>' +
        '<div class="breakdown-bar-track"><div class="breakdown-bar-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="breakdown-detail">' + detail + '</div>' +
      '</div>';
    }).join('');
  } else {
    // Monthly view
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    grid.innerHTML = months.map(function(m, i) {
      var isCur = isCurrent && i === currentMonth;
      var isPast = isCurrent ? i < currentMonth : activeYear < CURRENT_YEAR;
      var mStart = new Date(activeYear, i, 1).toISOString().slice(0,10);
      var mEnd = new Date(activeYear, i + 1, 0).toISOString().slice(0,10);

      var mSnaps = history.filter(function(h) { return h.date >= mStart && h.date <= mEnd; });
      var pct = 0;
      if (mSnaps.length > 0) {
        pct = mSnaps[mSnaps.length - 1].overall || 0;
      } else if (isCur) {
        pct = goals.length > 0 ? Math.round(goals.reduce(function(s,g){return s+(g.progress||0);},0)/goals.length) : 0;
      }

      return '<div class="breakdown-card' + (isCur ? ' breakdown-card-current' : '') + '">' +
        '<div class="breakdown-period' + (isCur ? ' breakdown-period-current' : '') + '">' + m + '</div>' +
        '<div class="breakdown-pct">' + pct + '%</div>' +
        '<div class="breakdown-bar-track"><div class="breakdown-bar-fill" style="width:' + pct + '%"></div></div>' +
      '</div>';
    }).join('');
  }
}

/* ═══════════════════════════════════════════════════════════
   LOCK IN MODAL
   ═══════════════════════════════════════════════════════════ */
function openLockin(id) {
  lockinGoalId = id;
  const goal = goals.find(g => g.id === id);
  if (!goal) return;
  const pct = goal.progress || 0;
  document.getElementById('lockin-sub').textContent = goal.title;
  document.getElementById('lockin-pct').value = pct;
  updateLockinPreview(pct);
  document.getElementById('lockin-modal').classList.remove('hidden');
  setTimeout(() => { const inp = document.getElementById('lockin-pct'); inp.focus(); inp.select(); }, 80);
}

function closeLockin() {
  document.getElementById('lockin-modal').classList.add('hidden');
  lockinGoalId = null;
}

function updateLockinPreview(val) {
  val = Math.max(0, Math.min(100, parseInt(val) || 0));
  const fill = document.getElementById('lockin-preview-fill');
  const label = document.getElementById('lockin-preview-label');
  if (fill) fill.style.width = val + '%';
  if (label) label.textContent = val + '%';
  document.querySelectorAll('.pct-chip').forEach(c => c.classList.toggle('active', parseInt(c.dataset.pct) === val));
}

function stepPct(delta) {
  const inp = document.getElementById('lockin-pct');
  const nv = Math.max(0, Math.min(100, (parseInt(inp.value) || 0) + delta));
  inp.value = nv;
  updateLockinPreview(nv);
}

function setPct(val) {
  document.getElementById('lockin-pct').value = val;
  updateLockinPreview(val);
}

function confirmLockin() {
  if (!lockinGoalId) return;
  const val = Math.max(0, Math.min(100, parseInt(document.getElementById('lockin-pct').value) || 0));
  const goal = goals.find(g => g.id === lockinGoalId);
  if (!goal) return;
  goal.prevProgress = goal.progress;
  goal.progress = val;
  goal.lastLoggedAt = new Date().toISOString();
  if (val > 0) goal.nextStep = null;
  persist(); closeLockin();
  renderGoals(); updateOverall(); recordSnapshot(); buildChart(); renderInsights(); renderBreakdown();
  flashCard(goal.id);
}

function undoProgress(id) {
  const goal = goals.find(g => g.id === id);
  if (!goal || goal.prevProgress == null) return;
  goal.progress = goal.prevProgress;
  goal.prevProgress = undefined;
  persist(); renderGoals(); updateOverall(); recordSnapshot(); buildChart();
}

function flashCard(id) {
  const card = document.getElementById('card-' + id);
  if (card) { card.classList.add('card-flash'); setTimeout(() => card.classList.remove('card-flash'), 700); }
}

/* ── Congratulations celebration ───────────────────────── */
function showCongrats(goalTitle) {
  // Create overlay
  var overlay = document.createElement('div');
  overlay.className = 'congrats-overlay';
  overlay.innerHTML =
    '<div class="congrats-content">' +
      '<div class="congrats-emoji">&#127881;</div>' +
      '<h2 class="congrats-title">Congratulations!</h2>' +
      '<p class="congrats-goal">' + esc(goalTitle) + '</p>' +
      '<p class="congrats-sub">You crushed this goal! Keep the momentum going.</p>' +
      '<button class="btn-primary congrats-btn" onclick="dismissCongrats()">Let\'s go!</button>' +
    '</div>';
  document.body.appendChild(overlay);
  // Confetti particles
  for (var i = 0; i < 40; i++) {
    var p = document.createElement('div');
    p.className = 'confetti-particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDelay = Math.random() * 0.8 + 's';
    p.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
    p.style.background = ['#00e5a0','#00c98b','#ffd700','#ff6b6b','#a78bfa','#38bdf8'][Math.floor(Math.random()*6)];
    overlay.appendChild(p);
  }
  setTimeout(function() { overlay.classList.add('show'); }, 10);
}

function dismissCongrats() {
  var overlay = document.querySelector('.congrats-overlay');
  if (overlay) {
    overlay.classList.remove('show');
    setTimeout(function() { overlay.remove(); }, 400);
  }
}

/* ═══════════════════════════════════════════════════════════
   PIVOT SYSTEM
   ═══════════════════════════════════════════════════════════ */
function openPivot(id) {
  pivotGoalId = id;
  const goal = goals.find(g => g.id === id);
  if (!goal) return;
  document.getElementById('pivot-goal-name').textContent = goal.title;
  document.getElementById('pivot-reason').value = '';
  document.getElementById('pivot-next-step').value = '';
  document.getElementById('pivot-step-1').classList.remove('hidden');
  document.getElementById('pivot-step-2').classList.add('hidden');
  document.getElementById('pivot-step-3').classList.add('hidden');
  document.getElementById('pivot-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('pivot-reason').focus(), 80);
}

function closePivot() {
  document.getElementById('pivot-modal').classList.add('hidden');
  pivotGoalId = null;
}

function pivotNext() {
  const reason = document.getElementById('pivot-reason').value.trim();
  const goal = goals.find(g => g.id === pivotGoalId);
  if (goal && reason) {
    goal.pivotNote = reason;
    goal.pivotDate = new Date().toISOString().slice(0, 10);
    persist();
  }
  document.getElementById('pivot-step-1').classList.add('hidden');
  document.getElementById('pivot-step-2').classList.remove('hidden');
}

function pivotKeep() {
  document.getElementById('pivot-step-2').classList.add('hidden');
  document.getElementById('pivot-step-3').classList.remove('hidden');
  setTimeout(() => document.getElementById('pivot-next-step').focus(), 80);
}

function pivotArchive() {
  const goal = goals.find(g => g.id === pivotGoalId);
  if (goal) {
    goal.archivedDate = new Date().toISOString().slice(0, 10);
    archivedGoals.push(goal);
    goals = goals.filter(g => g.id !== pivotGoalId);
    persist(); persistArchived();
    renderGoals(); renderArchived(); updateOverall(); recordSnapshot(); buildChart();
  }
  closePivot();
}

function pivotSaveStep() {
  const step = document.getElementById('pivot-next-step').value.trim();
  const goal = goals.find(g => g.id === pivotGoalId);
  if (goal && step) {
    goal.nextStep = step;
    persist(); renderGoals();
  }
  closePivot();
}

/* ═══════════════════════════════════════════════════════════
   ARCHIVED GOALS
   ═══════════════════════════════════════════════════════════ */
function renderArchived() {
  const section = document.getElementById('archived-section');
  const list = document.getElementById('archived-list');
  if (!section || !list) return;

  if (archivedGoals.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  const isPast = activeYear < CURRENT_YEAR;
  list.innerHTML = archivedGoals.map(g => {
    const pct = g.progress || 0;
    return '<div class="archived-card">' +
      '<div class="archived-card-top">' +
        '<div class="goal-title">' + esc(g.title) + '</div>' +
        (!isPast ? '<button class="btn-ghost" onclick="restoreGoal(\'' + g.id + '\')">Restore</button>' : '') +
      '</div>' +
      '<div class="goal-bar-row"><div class="goal-bar-track"><div class="goal-bar-fill bar-archived" style="width:' + pct + '%"></div></div><span class="goal-pct">' + pct + '%</span></div>' +
      (g.pivotNote ? '<div class="archived-note">\u201c' + esc(g.pivotNote) + '\u201d</div>' : '') +
    '</div>';
  }).join('');
}

function toggleArchived() {
  const list = document.getElementById('archived-list');
  const chev = document.getElementById('archived-chevron');
  if (!list) return;
  const nowHidden = list.classList.toggle('hidden');
  if (chev) chev.style.transform = nowHidden ? '' : 'rotate(180deg)';
}

function restoreGoal(id) {
  const goal = archivedGoals.find(g => g.id === id);
  if (!goal) return;
  goal.archivedDate = undefined;
  goals.push(goal);
  archivedGoals = archivedGoals.filter(g => g.id !== id);
  persist(); persistArchived();
  renderGoals(); renderArchived(); updateOverall(); recordSnapshot(); buildChart();
}

/* ═══════════════════════════════════════════════════════════
   OVERALL PROGRESS BAR
   ═══════════════════════════════════════════════════════════ */
function updateOverall() {
  const total = goals.length;
  const bar = document.getElementById('overall-bar');
  const pctEl = document.getElementById('overall-pct');
  const sumEl = document.getElementById('overall-summary');
  if (!bar || !pctEl || !sumEl) return;

  if (total === 0) {
    bar.style.width = '0%'; pctEl.textContent = '0%'; sumEl.textContent = '0 of 0 goals complete';
    return;
  }
  const sum = goals.reduce((s,g) => s + (g.progress||0), 0);
  const avg = Math.round(sum / total);
  const done = goals.filter(g => (g.progress||0) >= 100).length;
  bar.style.width = avg + '%';
  pctEl.textContent = avg + '%';
  sumEl.textContent = done + ' of ' + total + ' goal' + (total !== 1 ? 's' : '') + ' complete';
}

/* ═══════════════════════════════════════════════════════════
   CHART
   ═══════════════════════════════════════════════════════════ */
function setChartMode(mode) {
  chartMode = mode;
  document.querySelectorAll('.chart-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  buildChart();
}

/* ── Smooth S-curve wave generation (forex-style) ──────── */
function buildWaveData(finalPct, points, maxPoint, seed) {
  const data = [];
  const s = seed || 0;
  for (let i = 0; i < points; i++) {
    if (maxPoint != null && i > maxPoint) { data.push(null); continue; }
    if (finalPct === 0) { data.push(0); continue; }
    const t = maxPoint > 0 ? i / maxPoint : (i === 0 ? 0 : 1);
    const eased = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
    const noise = (i > 0 && maxPoint != null && i < maxPoint)
      ? (Math.sin(i*2.1 + s*1.7)*0.05 + Math.cos(i*1.4 + s*0.9)*0.03) * finalPct : 0;
    data.push(Math.max(0, Math.min(100, Math.round(eased * finalPct + noise))));
  }
  return data;
}

function buildYearData(history) {
  const MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const curMonth = new Date().getMonth();
  const isCur = activeYear === CURRENT_YEAR;
  const maxMonth = isCur ? curMonth : 11;

  const datasets = goals.map((goal, gi) => {
    const color = CHART_COLORS[gi % CHART_COLORS.length];
    const finalPct = goal.progress || 0;
    const data = buildWaveData(finalPct, 12, maxMonth, gi);
    return makeDS(goal.title, data, gi);
  });
  addOverallDS(datasets, MO.length);
  return { labels: MO, datasets };
}

function build3MData(history) {
  const labels = [];
  const today = new Date();
  for (let w = 12; w >= 0; w--) {
    const d = new Date(today); d.setDate(d.getDate() - w * 7);
    labels.push(d.toLocaleDateString('en',{month:'short',day:'numeric'}));
  }
  const datasets = goals.map((goal, gi) => {
    const color = CHART_COLORS[gi % CHART_COLORS.length];
    const finalPct = goal.progress || 0;
    const data = buildWaveData(finalPct, 13, 12, gi);
    return makeDS(goal.title, data, gi);
  });
  addOverallDS(datasets, labels.length);
  return { labels, datasets };
}

function build1MData(history) {
  const labels = [];
  const today = new Date();
  for (let d = 29; d >= 0; d--) {
    const dt = new Date(today); dt.setDate(dt.getDate() - d);
    labels.push(d === 0 ? 'Today' : dt.toLocaleDateString('en',{month:'short',day:'numeric'}));
  }
  const datasets = goals.map((goal, gi) => {
    const color = CHART_COLORS[gi % CHART_COLORS.length];
    const finalPct = goal.progress || 0;
    const data = buildWaveData(finalPct, 30, 29, gi);
    return makeDS(goal.title, data, gi);
  });
  addOverallDS(datasets, labels.length);
  return { labels, datasets };
}

function buildAllData() {
  const years = getYears();
  const labels = years.map(String);
  const datasets = goals.map((goal, gi) => {
    const data = years.map(yr => {
      if (yr === activeYear) return goal.progress || 0;
      const hist = getHistory(yr);
      if (!hist.length) return null;
      const last = hist[hist.length - 1];
      return (last.goals && last.goals[goal.id] != null) ? last.goals[goal.id] : null;
    });
    return makeDS(goal.title, data, gi);
  });
  addOverallDS(datasets, labels.length);
  return { labels, datasets };
}

function makeDS(label, data, goalIdx) {
  const op = BAR_OPACITIES[goalIdx % BAR_OPACITIES.length];
  return {
    label, data,
    backgroundColor: `rgba(255,255,255,${op})`,
    borderColor: `rgba(255,255,255,${Math.min(1, op + 0.12)})`,
    borderWidth: 1,
    borderRadius: 5,
    borderSkipped: false,
    barPercentage: 0.72,
    categoryPercentage: 0.82,
  };
}

function addOverallDS(datasets, len) {
  if (goals.length <= 1) return;
  const overall = [];
  for (let i = 0; i < len; i++) {
    const vals = datasets.map(ds => ds.data[i]).filter(v => v != null);
    overall.push(vals.length ? Math.round(vals.reduce((s,v) => s+v, 0) / vals.length) : null);
  }
  datasets.unshift({
    label: 'Overall', data: overall,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderRadius: 4, borderSkipped: false,
    barPercentage: 0.7, categoryPercentage: 0.8,
  });
}

function buildChart() {
  const canvas = document.getElementById('progress-chart');
  if (!canvas) return;
  if (progressChart) { progressChart.destroy(); progressChart = null; }
  if (goals.length === 0) return;

  const history = getHistory(activeYear);
  let cd;
  switch(chartMode) {
    case '1m': cd = build1MData(history); break;
    case '3m': cd = build3MData(history); break;
    case 'all': cd = buildAllData(); break;
    default: cd = buildYearData(history);
  }

  progressChart = new Chart(canvas, {
    type: 'bar',
    data: cd,
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      animation: { duration: 500, easing: 'easeInOutQuart' },
      plugins: {
        legend: {
          display: true, position: 'top', align: 'end',
          labels: { color: '#525252', font: { size: 10, weight: '600' }, boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'circle', padding: 14 }
        },
        tooltip: {
          backgroundColor: 'rgba(8,8,10,0.95)', borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
          titleColor: '#4a4a5a', titleFont: { size: 10, weight: '700' },
          bodyColor: '#ebebeb', bodyFont: { size: 12, weight: '700' },
          padding: { x: 12, y: 8 }, cornerRadius: 10,
          displayColors: true, boxWidth: 7, boxHeight: 7,
          callbacks: { label: c => { const v = c.parsed.y; return v != null ? ' ' + c.dataset.label + ': ' + v + '%' : null; } }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.02)', drawBorder: false },
          ticks: { color: '#2e2e3a', font: { size: 10, weight: '600' }, maxRotation: 0, maxTicksLimit: 12 },
          border: { color: 'rgba(255,255,255,0.03)' }
        },
        y: {
          min: 0, max: 100, position: 'right',
          grid: { color: 'rgba(255,255,255,0.02)', drawBorder: false },
          ticks: { color: '#2e2e3a', font: { size: 10, weight: '600' }, stepSize: 25, callback: v => v + '%', padding: 8 },
          border: { color: 'transparent' }
        }
      }
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   ADD GOAL MODAL
   ═══════════════════════════════════════════════════════════ */
function openModal() {
  document.getElementById('goal-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('goal-title-input').focus(), 50);
}

function closeModal() {
  document.getElementById('goal-modal').classList.add('hidden');
  document.getElementById('goal-title-input').value = '';
  document.getElementById('goal-desc-input').value = '';
  const dl = document.getElementById('goal-deadline-input');
  if (dl) dl.value = '';
}

function saveGoal() {
  const title = document.getElementById('goal-title-input').value.trim();
  if (!title) { document.getElementById('goal-title-input').focus(); return; }
  const desc = document.getElementById('goal-desc-input').value.trim();
  const dl = document.getElementById('goal-deadline-input');
  const deadline = dl ? dl.value : '';

  goals.push({
    id: (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)),
    title, description: desc, progress: 0,
    deadline: deadline || null,
    created_at: new Date().toISOString()
  });
  persist(); closeModal();
  renderGoals(); updateOverall(); recordSnapshot(); buildChart();
}

function deleteGoal(id) {
  if (!confirm('Delete this goal?')) return;
  goals = goals.filter(g => g.id !== id);
  persist(); renderGoals(); updateOverall(); recordSnapshot(); buildChart();
}

/* ═══════════════════════════════════════════════════════════
   UTILITY
   ═══════════════════════════════════════════════════════════ */
function dismissWelcome() {
  const o = document.getElementById('welcome-overlay');
  if (o) { o.classList.add('fade-out'); setTimeout(() => o.classList.add('hidden'), 400); }
}

function handleLogout() {
  localStorage.removeItem('personalq_session');
  window.location.href = 'auth.html';
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ═══════════════════════════════════════════════════════════
   SMART INSIGHTS ENGINE (rule-based, no AI)
   ═══════════════════════════════════════════════════════════ */
function generateInsights() {
  if (goals.length === 0) return [];
  const insights = [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yearStart = new Date(activeYear, 0, 1);
  const yearEnd = new Date(activeYear, 11, 31);
  const totalDays = (yearEnd - yearStart) / 86400000;
  const daysPassed = Math.max(1, Math.floor((today - yearStart) / 86400000));
  const expectedPct = Math.min(100, Math.round((daysPassed / totalDays) * 100));
  const isCurrent = activeYear === CURRENT_YEAR;
  const history = getHistory(activeYear);

  const totalGoals = goals.length;
  const avgPct = Math.round(goals.reduce((s,g) => s + (g.progress||0), 0) / totalGoals);
  const completed = goals.filter(g => (g.progress||0) >= 100).length;

  goals.forEach(goal => {
    const pct = goal.progress || 0;
    const diff = pct - expectedPct;

    // Ahead of pace
    if (isCurrent && diff >= 15 && pct < 100 && pct > 0) {
      insights.push({ type: 'positive', tag: 'On Track',
        text: 'You\'re <strong>' + diff + '% ahead</strong> of pace on <strong>' + esc(goal.title) + '</strong>. Keep this momentum going!' });
    }

    // Behind pace
    if (isCurrent && diff <= -20 && pct < 100) {
      insights.push({ type: 'warning', tag: 'Falling Behind',
        text: '<strong>' + esc(goal.title) + '</strong> is <strong>' + Math.abs(diff) + '% behind</strong> schedule. Try breaking it into smaller daily tasks.' });
    }

    // Near completion
    if (pct >= 80 && pct < 100) {
      const remaining = 100 - pct;
      insights.push({ type: 'positive', tag: 'Almost There',
        text: '<strong>' + esc(goal.title) + '</strong> is at <strong>' + pct + '%</strong>. Just ' + remaining + '% more to go — you\'re so close!' });
    }

    // Just completed
    if (pct >= 100) {
      insights.push({ type: 'positive', tag: 'Completed',
        text: '<strong>' + esc(goal.title) + '</strong> is done! Consider setting a stretch goal or starting something new.' });
    }

    // Zero progress
    if (pct === 0 && isCurrent && daysPassed > 30) {
      insights.push({ type: 'info', tag: 'Get Started',
        text: '<strong>' + esc(goal.title) + '</strong> hasn\'t been started yet. Even 1% progress builds momentum.' });
    }

    // Stagnant: no progress change in last 14 days
    if (pct > 0 && pct < 100 && history.length >= 2) {
      const twoWeeksAgo = new Date(today); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const twoWeeksStr = twoWeeksAgo.toISOString().slice(0, 10);
      const oldSnap = history.filter(h => h.date <= twoWeeksStr);
      if (oldSnap.length > 0) {
        const oldPct = oldSnap[oldSnap.length - 1].goals?.[goal.id];
        if (oldPct != null && oldPct === pct) {
          insights.push({ type: 'warning', tag: 'Stalled',
            text: 'No progress on <strong>' + esc(goal.title) + '</strong> in 2 weeks. Even a tiny step forward counts.' });
        }
      }
    }

    // Deadline approaching
    if (goal.deadline && pct < 100) {
      const dl = new Date(goal.deadline + 'T00:00:00');
      const daysLeft = Math.ceil((dl - today) / 86400000);
      if (daysLeft > 0 && daysLeft <= 7) {
        insights.push({ type: 'warning', tag: 'Deadline',
          text: '<strong>' + esc(goal.title) + '</strong> deadline is in <strong>' + daysLeft + ' day' + (daysLeft !== 1 ? 's' : '') + '</strong>. You\'re at ' + pct + '%.' });
      } else if (daysLeft > 7 && daysLeft <= 30 && pct < 50) {
        insights.push({ type: 'info', tag: 'Heads Up',
          text: '<strong>' + esc(goal.title) + '</strong> deadline is in ' + daysLeft + ' days and only at ' + pct + '%. Consider picking up the pace.' });
      }
    }

    // Velocity: rapid recent progress
    if (history.length >= 2 && pct < 100) {
      const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
      const weekStr = weekAgo.toISOString().slice(0, 10);
      const weekSnap = history.filter(h => h.date <= weekStr);
      if (weekSnap.length > 0) {
        const weekPct = weekSnap[weekSnap.length - 1].goals?.[goal.id] || 0;
        const weekGain = pct - weekPct;
        if (weekGain >= 15) {
          insights.push({ type: 'motivation', tag: 'Momentum',
            text: '<strong>' + esc(goal.title) + '</strong> jumped <strong>+' + weekGain + '%</strong> this week. You\'re on fire!' });
        }
      }
    }
  });

  // Overall insights
  if (isCurrent && totalGoals >= 2 && avgPct >= expectedPct && avgPct > 0) {
    insights.push({ type: 'motivation', tag: 'Discipline',
      text: 'You\'re <strong>ahead of the yearly pace</strong> overall at ' + avgPct + '%. Your discipline is paying off.' });
  }

  if (completed > 0 && completed < totalGoals) {
    insights.push({ type: 'info', tag: 'Summary',
      text: '<strong>' + completed + ' of ' + totalGoals + '</strong> goals complete. Focus energy on your weakest goal to level up.' });
  }

  if (totalGoals >= 3) {
    const weakest = goals.filter(g => (g.progress||0) < 100).sort((a,b) => (a.progress||0) - (b.progress||0))[0];
    if (weakest && (weakest.progress||0) < avgPct - 20) {
      insights.push({ type: 'info', tag: 'Focus',
        text: '<strong>' + esc(weakest.title) + '</strong> is your lowest at ' + (weakest.progress||0) + '%. Giving it extra attention could boost your overall.' });
    }
  }

  // Milestone celebrations
  goals.forEach(goal => {
    const pct = goal.progress || 0;
    if (pct === 25 || pct === 50 || pct === 75) {
      insights.push({ type: 'positive', tag: 'Milestone',
        text: '<strong>' + esc(goal.title) + '</strong> hit the <strong>' + pct + '% mark</strong>! Quarter by quarter, you\'re building.' });
    }
  });

  // Limit to top 4 most relevant (prioritize warnings & motivation over info)
  const priority = { warning: 0, motivation: 1, positive: 2, info: 3 };
  insights.sort((a,b) => (priority[a.type] ?? 9) - (priority[b.type] ?? 9));
  return insights.slice(0, 4);
}

function renderInsights() {
  const panel = document.getElementById('insights-panel');
  if (panel) panel.style.display = 'none';
  // Insights data still available via generateInsights() for the assistant
  return;

  // Build ticker items (duplicate for seamless loop)
  var items = insights.map(function(ins) {
    return '<span class="ticker-item"><span class="ticker-dot ticker-dot-' + ins.type + '"></span>' + ins.text + '</span><span class="ticker-divider"></span>';
  }).join('');

  // Set speed based on content length (more items = slower)
  var duration = Math.max(15, insights.length * 8);

  list.innerHTML = '<div class="insights-ticker-wrap"><div class="insights-ticker" style="--ticker-duration:' + duration + 's">' + items + items + '</div></div>';

  // Update count badge
  var header = panel.querySelector('.insights-header');
  var existingCount = header ? header.querySelector('.insights-count') : null;
  if (existingCount) existingCount.textContent = insights.length;
  else if (header) {
    var badge = document.createElement('span');
    badge.className = 'insights-count';
    badge.textContent = insights.length;
    header.appendChild(badge);
  }
}

/* ═══════════════════════════════════════════════════════════
   SMART AI ASSISTANT — Deep pattern analysis engine
   ═══════════════════════════════════════════════════════════ */

/* ── Helper: compute all stats once ──────────────────────── */
function getGoalStats() {
  var today = new Date();
  var todayStr = today.toISOString().slice(0,10);
  var start = new Date(activeYear,0,1), end = new Date(activeYear,11,31);
  var totalDays = (end - start) / 86400000;
  var daysPassed = Math.max(1, Math.floor((today - start) / 86400000));
  var daysLeft = Math.max(0, Math.ceil((end - today) / 86400000));
  var expectedPct = Math.min(100, Math.round((daysPassed / totalDays) * 100));
  var isCurrent = activeYear === CURRENT_YEAR;
  var history = getHistory(activeYear);

  var total = goals.length;
  var active = goals.filter(function(g){return (g.progress||0)<100;});
  var completed = goals.filter(function(g){return (g.progress||0)>=100;});
  var notStarted = goals.filter(function(g){return (g.progress||0)===0;});
  var avgPct = total > 0 ? Math.round(goals.reduce(function(s,g){return s+(g.progress||0);},0)/total) : 0;

  var sorted = goals.slice().sort(function(a,b){return (b.progress||0)-(a.progress||0);});
  var best = sorted[0] || null;
  var worst = active.slice().sort(function(a,b){return (a.progress||0)-(b.progress||0);})[0] || null;

  var behind = active.filter(function(g){return (g.progress||0) < expectedPct;});
  var ahead = active.filter(function(g){return (g.progress||0) >= expectedPct;});
  var overdue = goals.filter(function(g){
    return g.deadline && g.deadline < todayStr && (g.progress||0) < 100;
  });

  // Weekly velocity per goal
  var velocities = [];
  if (history.length >= 2) {
    var weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    var weekStr = weekAgo.toISOString().slice(0,10);
    var weekSnaps = history.filter(function(h){return h.date <= weekStr;});
    if (weekSnaps.length > 0) {
      var oldSnap = weekSnaps[weekSnaps.length - 1];
      goals.forEach(function(g) {
        var oldPct = (oldSnap.goals && oldSnap.goals[g.id] != null) ? oldSnap.goals[g.id] : 0;
        var gain = (g.progress||0) - oldPct;
        velocities.push({ title: g.title, gain: gain, pct: g.progress||0 });
      });
    }
  }

  var fastestGrower = velocities.slice().sort(function(a,b){return b.gain-a.gain;})[0] || null;
  var stalled = velocities.filter(function(v){return v.gain === 0 && v.pct > 0 && v.pct < 100;});

  // Upcoming deadlines
  var deadlines = goals.filter(function(g){return g.deadline && (g.progress||0)<100;})
    .map(function(g){
      var dl = new Date(g.deadline+'T00:00:00');
      return { title: g.title, daysLeft: Math.ceil((dl-today)/86400000), pct: g.progress||0, deadline: g.deadline };
    }).filter(function(d){return d.daysLeft >= 0;}).sort(function(a,b){return a.daysLeft-b.daysLeft;});

  // Completion rate (how many % per day needed)
  var completionRates = active.map(function(g) {
    var remaining = 100 - (g.progress||0);
    var gDaysLeft = daysLeft;
    if (g.deadline) {
      var dl = new Date(g.deadline+'T00:00:00');
      gDaysLeft = Math.max(1, Math.ceil((dl-today)/86400000));
    }
    return { title: g.title, pct: g.progress||0, remaining: remaining, daysLeft: gDaysLeft, rateNeeded: Math.round(remaining/gDaysLeft*10)/10 };
  });

  // Quarter info
  var quarter = Math.floor(today.getMonth() / 3) + 1;
  var quarterNames = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];
  var monthName = today.toLocaleDateString('en',{month:'long'});

  // Archived goals info
  var archivedCount = archivedGoals.length;
  var archivedList = archivedGoals.map(function(g) {
    return { title: g.title, pct: g.progress||0, pivotNote: g.pivotNote||'', archivedDate: g.archivedDate||'' };
  });

  // Goals with descriptions/notes
  var goalsWithDesc = goals.filter(function(g){return g.description && g.description.trim();});
  var goalsWithNextStep = goals.filter(function(g){return g.nextStep && g.nextStep.trim();});
  var goalsWithDeadline = goals.filter(function(g){return g.deadline;});
  var goalsWithPivot = goals.filter(function(g){return g.pivotNote;});

  // User info
  var userName = '';
  try { userName = JSON.parse(localStorage.getItem('personalq_session')||'{}').name || ''; } catch(e){}

  // History stats
  var totalSnapshots = history.length;
  var firstSnapshot = history.length ? history[0].date : null;
  var lastSnapshot = history.length ? history[history.length-1].date : null;

  return {
    today: today, todayStr: todayStr, daysPassed: daysPassed, daysLeft: daysLeft,
    expectedPct: expectedPct, isCurrent: isCurrent, history: history,
    total: total, active: active, completed: completed, notStarted: notStarted,
    avgPct: avgPct, best: best, worst: worst, sorted: sorted,
    behind: behind, ahead: ahead, overdue: overdue,
    velocities: velocities, fastestGrower: fastestGrower, stalled: stalled,
    deadlines: deadlines, completionRates: completionRates,
    quarter: quarter, quarterName: quarterNames[quarter-1], monthName: monthName,
    archivedCount: archivedCount, archivedList: archivedList,
    goalsWithDesc: goalsWithDesc, goalsWithNextStep: goalsWithNextStep,
    goalsWithDeadline: goalsWithDeadline, goalsWithPivot: goalsWithPivot,
    userName: userName, totalSnapshots: totalSnapshots,
    firstSnapshot: firstSnapshot, lastSnapshot: lastSnapshot
  };
}

/* ── Smart welcome message (context-aware) ───────────────── */
function getSmartWelcome() {
  if (!goals.length) return 'Hey! I\'m your PersonalQ coach. Add your first goal and I\'ll help you build a system to achieve it — with smart tracking, sub-steps, and personalized strategies.';
  var s = getGoalStats();
  var hour = new Date().getHours();
  var greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  var name = '';
  try { name = JSON.parse(localStorage.getItem('personalq_session')||'{}').name || ''; } catch(e){}
  var firstName = name ? name.split(' ')[0] : '';

  var msg = greeting + (firstName ? ', ' + firstName : '') + '! ';

  if (s.completed.length === s.total) {
    msg += 'All ' + s.total + ' goals complete! You\'ve built serious discipline. My recommendation: set 2-3 stretch goals that scare you a little — that\'s where real growth happens.';
  } else if (s.overdue.length > 0) {
    msg += 'You have ' + s.overdue.length + ' overdue goal' + (s.overdue.length!==1?'s':'') + '. Don\'t stress — let\'s pivot or break it down. Ask me "what should I do today" and I\'ll give you a clear action plan.';
  } else if (s.avgPct >= 70) {
    msg += 'You\'re at ' + s.avgPct + '% — the finish line is close! My advice: increase your daily effort by just 10% this week. Small acceleration, big results. ' + (s.total - s.completed.length) + ' to go.';
  } else if (s.notStarted.length > 0) {
    msg += s.notStarted.length + ' goal' + (s.notStarted.length!==1?'s haven\'t':' hasn\'t') + ' started yet. Try the 2-minute rule: commit to just 2 minutes on it. Once you start, momentum takes over.';
  } else if (s.behind.length > 0) {
    msg += s.behind.length + ' goal' + (s.behind.length!==1?'s are':' is') + ' behind pace. Ask me "how can I improve" and I\'ll give you a personalized strategy to catch up efficiently.';
  } else {
    msg += 'You\'re at ' + s.avgPct + '% across ' + s.total + ' goals — solid progress! Ask me for coaching tips, daily focus, or strategies to finish stronger.';
  }
  return msg;
}

/* ── Pattern matching engine ─────────────────────────────── */
const QA_PATTERNS = [
  // --- Overall / Summary ---
  { match: ['how am i doing', 'overall', 'summary', 'progress summary', 'status', 'report', 'overview', 'how is it going', 'update'],
    fn: function() {
      var s = getGoalStats();
      if (!s.total) return 'No goals yet! Add some to get started.';
      var msg = 'Here\'s your ' + activeYear + ' snapshot: ' + s.total + ' goal' + (s.total!==1?'s':'') + ', ' + s.completed.length + ' complete, averaging ' + s.avgPct + '%. ';
      if (s.isCurrent) {
        msg += 'Expected pace for ' + s.monthName + ': ' + s.expectedPct + '%. ';
        if (s.avgPct >= s.expectedPct) msg += 'You\'re ahead of schedule!';
        else msg += 'You\'re ' + (s.expectedPct - s.avgPct) + '% behind pace — but there\'s still time.';
      }
      if (s.overdue.length) msg += ' Watch out: ' + s.overdue.length + ' overdue goal' + (s.overdue.length!==1?'s':'') + '.';
      return msg;
    }
  },

  // --- Focus / What to work on ---
  { match: ['focus', 'weakest', 'needs attention', 'worst', 'lowest', 'struggling', 'what should i work on', 'priority', 'priorities', 'what to do', 'what now'],
    fn: function() {
      var s = getGoalStats();
      if (!s.active.length) return 'All goals complete! Consider setting stretch goals or starting fresh ones.';

      // Priority order: overdue > deadline soon > behind pace > lowest
      if (s.overdue.length) {
        var o = s.overdue[0];
        return 'Priority #1: "' + o.title + '" is overdue at ' + (o.progress||0) + '%. Use the Pivot button if you need to reassess, or lock in some progress today.';
      }
      if (s.deadlines.length && s.deadlines[0].daysLeft <= 7) {
        var d = s.deadlines[0];
        return 'Urgent: "' + d.title + '" is due in ' + d.daysLeft + ' day' + (d.daysLeft!==1?'s':'') + ' and only at ' + d.pct + '%. You need ~' + Math.round((100-d.pct)/Math.max(1,d.daysLeft)) + '% per day to finish.';
      }
      if (s.worst) {
        var rate = s.completionRates.find(function(r){return r.title === s.worst.title;});
        var msg = 'Focus on "' + s.worst.title + '" — it\'s your lowest at ' + (s.worst.progress||0) + '%.';
        if (rate) msg += ' You need ~' + rate.rateNeeded + '% per day to finish on time.';
        msg += ' Break it into one tiny action you can do in 5 minutes.';
        return msg;
      }
      return 'All your active goals are progressing well. Keep the momentum going!';
    }
  },

  // --- Pace / Schedule ---
  { match: ['on track', 'behind', 'pace', 'schedule', 'ahead', 'am i on track', 'pace check'],
    fn: function() {
      var s = getGoalStats();
      if (!s.total) return 'No goals to check pace for.';
      var msg = 'We\'re in ' + s.quarterName + ', day ' + s.daysPassed + ' of the year. Expected pace: ' + s.expectedPct + '%. ';
      if (s.behind.length === 0) {
        msg += 'All ' + s.active.length + ' active goal' + (s.active.length!==1?'s are':' is') + ' on pace or ahead! ';
      } else {
        msg += s.behind.length + ' goal' + (s.behind.length!==1?'s are':' is') + ' behind: ';
        msg += s.behind.slice(0,3).map(function(g){return '"'+g.title+'" ('+((g.progress||0))+'%)';}).join(', ') + '. ';
      }
      if (s.ahead.length) msg += s.ahead.length + ' ahead of pace.';
      return msg;
    }
  },

  // --- Best / Top ---
  { match: ['best', 'top', 'highest', 'most progress', 'strongest', 'winning', 'doing well'],
    fn: function() {
      var s = getGoalStats();
      if (!s.total) return 'No goals yet!';
      var msg = 'Your top performer: "' + s.best.title + '" at ' + (s.best.progress||0) + '%' + ((s.best.progress||0)>=100?' — done!':'') + '. ';
      if (s.fastestGrower && s.fastestGrower.gain > 0) {
        msg += 'Fastest growing this week: "' + s.fastestGrower.title + '" (+' + s.fastestGrower.gain + '%). ';
      }
      if (s.completed.length > 1) msg += 'You\'ve completed ' + s.completed.length + ' goals total — that\'s discipline!';
      return msg;
    }
  },

  // --- Deadlines ---
  { match: ['deadline', 'due', 'when is', 'upcoming', 'due date', 'timeline', 'calendar'],
    fn: function() {
      var s = getGoalStats();
      if (!s.deadlines.length) return 'No deadlines set. Adding deadlines creates urgency and helps you stay on track. Edit your goals to add some!';
      var msg = 'Upcoming deadlines: ';
      msg += s.deadlines.slice(0,4).map(function(d){
        var urgency = d.daysLeft <= 3 ? ' [URGENT]' : d.daysLeft <= 7 ? ' [SOON]' : '';
        return '"' + d.title + '" in ' + d.daysLeft + ' day' + (d.daysLeft!==1?'s':'') + ' (' + d.pct + '%)' + urgency;
      }).join('; ') + '.';
      if (s.overdue.length) msg += ' Plus ' + s.overdue.length + ' overdue.';
      return msg;
    }
  },

  // --- List / Count ---
  { match: ['how many', 'count', 'list', 'my goals', 'what goals', 'show goals', 'all goals', 'goal list'],
    fn: function() {
      var s = getGoalStats();
      if (!s.total) return 'You have no goals yet. Tap "Add Goal" to create your first one!';
      var msg = s.total + ' goal' + (s.total!==1?'s':'') + ' for ' + activeYear + ': ';
      msg += goals.map(function(g){
        var status = (g.progress||0) >= 100 ? ' [DONE]' : '';
        return '"' + g.title + '" ' + (g.progress||0) + '%' + status;
      }).join(' | ') + '.';
      return msg;
    }
  },

  // --- Suggestions / Coaching / Strategy ---
  { match: ['suggest', 'recommendation', 'advice', 'what should', 'help me', 'tip', 'coach', 'plan', 'strategy', 'how can i', 'how do i', 'improve', 'better', 'faster', 'efficient', 'smarter', 'optimize', 'hack', 'level up', 'grow', 'accelerate'],
    fn: function() {
      var s = getGoalStats();
      if (!s.active.length) return 'All done! Three options: 1) Set stretch goals to push further, 2) Start planning next year\'s ambitions, 3) Write down what strategies worked so you can repeat them.';

      var tips = [];

      // Diagnose the biggest bottleneck
      if (s.stalled.length > 0) {
        tips.push('You have ' + s.stalled.length + ' stalled goal' + (s.stalled.length!==1?'s':'') + '. The #1 fix: break it into sub-steps using the "Add steps" feature. Checking off small wins creates momentum.');
      }

      if (s.active.length > 5) {
        tips.push('With ' + s.active.length + ' active goals you\'re spread too thin. Research shows 3-4 goals is the sweet spot. Archive the least important ones — saying no to good things lets you say yes to great things.');
      }

      if (s.notStarted.length) {
        tips.push('The hardest part is starting. For "' + s.notStarted[0].title + '", try the 2-minute rule: commit to just 2 minutes on it right now. Once you start, you\'ll likely keep going.');
      }

      // Smart time-based advice
      var hardest = s.completionRates.filter(function(r){return r.rateNeeded > 1.5;}).sort(function(a,b){return b.rateNeeded-a.rateNeeded;})[0];
      if (hardest && !tips.length) {
        tips.push('"' + hardest.title + '" needs ' + hardest.rateNeeded + '% daily to hit deadline. Try time-blocking: schedule a specific 30-min block each day dedicated to this goal. What gets scheduled gets done.');
      }

      // Gap analysis
      if (s.worst && s.best && (s.best.progress||0) - (s.worst.progress||0) > 30) {
        tips.push('Big gap between your best (' + (s.best.progress||0) + '%) and worst (' + (s.worst.progress||0) + '%) goals. Apply what\'s working on "' + s.best.title + '" to "' + s.worst.title + '". Same habits, different target.');
      }

      // Behind pace coaching
      if (s.behind.length && !tips.length) {
        tips.push(s.behind.length + ' goal' + (s.behind.length!==1?'s are':' is') + ' behind pace. Here\'s a proven approach: pick your weakest goal, set a timer for 15 minutes, and work only on that. Small daily effort compounds into big results.');
      }

      // Velocity-based advice
      if (s.fastestGrower && s.fastestGrower.gain > 0 && !tips.length) {
        tips.push('You gained +' + s.fastestGrower.gain + '% on "' + s.fastestGrower.title + '" this week. That\'s your winning formula — replicate whatever routine you used for that goal across your others.');
      }

      if (!tips.length) {
        tips.push('You\'re on track at ' + s.avgPct + '%. To keep improving: 1) Review your goals every morning, 2) Log progress daily even if it\'s small, 3) Celebrate hitting milestones. Consistency beats intensity every time.');
      }

      return tips[0];
    }
  },

  // --- Motivation ---
  { match: ['motivate', 'encourage', 'inspire', 'boost', 'pump me up', 'cheer', 'feel down', 'unmotivated', 'lazy', 'can\'t', 'give up', 'quit', 'hopeless', 'impossible'],
    fn: function() {
      var s = getGoalStats();
      var q = QUOTES[Math.floor(Math.random()*QUOTES.length)];
      var msg = '\u201c' + q[0] + '\u201d' + (q[1] ? ' \u2014 ' + q[1] : '') + ' ';

      if (s.total && s.completed.length > 0) {
        msg += 'You\'ve already completed ' + s.completed.length + ' goal' + (s.completed.length!==1?'s':'') + '. That proves you can do this. The person who finished those goals is the same person sitting here now.';
      } else if (s.total && s.avgPct > 0) {
        msg += 'You\'re at ' + s.avgPct + '% — that\'s ' + s.avgPct + '% more than most people who only dream. You\'re actually doing it. Don\'t stop now.';
      } else {
        msg += 'Every expert started as a beginner. Every marathon begins with a single step. Your only competition is who you were yesterday.';
      }
      return msg;
    }
  },

  // --- Habits / Routine ---
  { match: ['habit', 'routine', 'daily', 'discipline', 'consistent', 'consistency', 'morning', 'schedule', 'ritual', 'system'],
    fn: function() {
      var s = getGoalStats();
      var tips = [
        'The #1 habit for goal achievement: review your goals for 2 minutes every morning. It keeps them front of mind all day.',
        'Stack your goal work onto an existing habit. Example: "After my morning coffee, I spend 15 minutes on my weakest goal."',
        'Track your streaks. Every day you log progress — even 1% — is a win. Don\'t break the chain.',
        'Use the "2-minute rule": if a task takes less than 2 minutes, do it now. For bigger tasks, just start with 2 minutes.',
        'Environment > willpower. Set up your space so the next step of your goal is visible and easy to start.',
        'Plan your goal work the night before. Decision fatigue kills progress — remove the "what should I do?" question.'
      ];
      var msg = tips[Math.floor(Math.random()*tips.length)];
      if (s.total && s.worst && (s.worst.progress||0) < 30) {
        msg += ' Try applying this to "' + s.worst.title + '" — it could use the boost.';
      }
      return msg;
    }
  },

  // --- How to achieve / reach goal ---
  { match: ['achieve', 'reach', 'accomplish', 'succeed', 'success', 'win', 'crush', 'nail', 'master', 'get there', 'make it'],
    fn: function() {
      var s = getGoalStats();
      if (!s.active.length) return 'You already achieved all your goals. That\'s incredible. Now set bigger ones — you clearly have the discipline for it.';
      var target = s.worst || s.active[0];
      var pct = target.progress || 0;
      var remaining = 100 - pct;
      var msg = 'To reach "' + target.title + '" (' + pct + '% done): ';
      if (pct === 0) {
        msg += '1) Break it into 3-5 sub-steps using "Add steps" below the goal. 2) Do just the first sub-step today. 3) Log your progress — seeing the bar move is addictive.';
      } else if (pct < 50) {
        msg += 'You\'re in the grind phase — this is where most people quit. Push through by focusing on daily micro-progress. ' + remaining + '% left, but you\'ve already proven you can do ' + pct + '%.';
      } else {
        msg += 'You\'re past the halfway mark! The momentum is on your side. ' + remaining + '% left — finish strong by doing a little bit every single day.';
      }
      return msg;
    }
  },

  // --- Velocity / Momentum ---
  { match: ['velocity', 'momentum', 'speed', 'this week', 'weekly', 'recent', 'lately', 'trending'],
    fn: function() {
      var s = getGoalStats();
      if (!s.velocities.length) return 'Not enough data yet — I need at least a week of progress snapshots to track velocity. Keep locking in progress!';
      var totalGain = s.velocities.reduce(function(sum,v){return sum+v.gain;}, 0);
      var msg = 'This week\'s momentum: ';
      if (totalGain > 0) {
        msg += '+' + totalGain + '% total across all goals. ';
        if (s.fastestGrower && s.fastestGrower.gain > 0) msg += 'Fastest mover: "' + s.fastestGrower.title + '" (+' + s.fastestGrower.gain + '%). ';
      } else if (totalGain === 0) {
        msg += 'No progress this week. Even small steps count — try locking in just 1-2% on any goal today. ';
      } else {
        msg += 'Some goals went backwards. Review and adjust — pivoting is okay.';
      }
      if (s.stalled.length) msg += s.stalled.length + ' goal' + (s.stalled.length!==1?'s':'') + ' stalled.';
      return msg;
    }
  },

  // --- Quarter / Time ---
  { match: ['quarter', 'month', 'time left', 'days left', 'how much time', 'when does', 'how long'],
    fn: function() {
      var s = getGoalStats();
      var msg = 'We\'re in ' + s.quarterName + ' (' + s.monthName + '). ';
      msg += s.daysPassed + ' days passed, ' + s.daysLeft + ' remaining in ' + activeYear + '. ';
      msg += 'That\'s ' + Math.round(s.daysPassed/(s.daysPassed+s.daysLeft)*100) + '% of the year gone. ';
      if (s.active.length) {
        var avgRemaining = Math.round(s.active.reduce(function(sum,g){return sum+(100-(g.progress||0));},0)/s.active.length);
        msg += 'Your active goals need an average of ' + avgRemaining + '% more to complete.';
      }
      return msg;
    }
  },

  // --- Comparison ---
  { match: ['compare', 'versus', 'vs', 'difference', 'gap', 'spread', 'range', 'breakdown'],
    fn: function() {
      var s = getGoalStats();
      if (s.total < 2) return 'You need at least 2 goals to compare.';
      var highest = s.best.progress || 0;
      var lowest = s.worst ? (s.worst.progress||0) : highest;
      var gap = highest - lowest;
      var msg = 'Goal spread: highest ' + highest + '% ("' + s.best.title + '") to lowest ' + lowest + '%' + (s.worst ? ' ("'+s.worst.title+'")' : '') + '. ';
      msg += 'Gap: ' + gap + '%. ';
      if (gap > 40) msg += 'Big gap — consider redistributing effort to your weaker goals.';
      else if (gap > 20) msg += 'Moderate spread. Try to bring your lowest goal closer to the average.';
      else msg += 'Your goals are well-balanced! Great consistency.';
      return msg;
    }
  },

  // --- Completion prediction ---
  { match: ['predict', 'finish', 'complete', 'when will', 'estimate', 'projection', 'forecast', 'eta'],
    fn: function() {
      var s = getGoalStats();
      if (!s.active.length) return 'All goals are already complete!';
      var msg = 'Completion forecast: ';
      msg += s.completionRates.slice(0,4).map(function(r) {
        if (r.remaining <= 0) return '"' + r.title + '" — done!';
        var daysNeeded = r.rateNeeded > 0 ? Math.ceil(r.remaining / r.rateNeeded) : Infinity;
        var feasible = r.rateNeeded <= 3 ? 'on track' : r.rateNeeded <= 5 ? 'tight' : 'at risk';
        return '"' + r.title + '": needs ' + r.rateNeeded + '%/day (' + feasible + ')';
      }).join(' | ');
      return msg;
    }
  },

  // --- Greetings ---
  { match: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'sup', 'what\'s up', 'yo', 'wassup', 'hola'],
    fn: function() {
      var s = getGoalStats();
      var hour = new Date().getHours();
      var greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      var name = s.userName ? ' ' + s.userName.split(' ')[0] : '';
      if (!s.total) return greeting + name + '! I\'m your PersonalQ assistant. Add some goals and I\'ll help you track and crush them!';
      var msg = greeting + name + '! ';
      if (s.completed.length === s.total) msg += 'All ' + s.total + ' goals done — you\'re a machine! Time for new challenges.';
      else if (s.overdue.length) msg += 'Heads up — ' + s.overdue.length + ' goal' + (s.overdue.length!==1?'s are':' is') + ' overdue. Let\'s tackle that first.';
      else if (s.avgPct >= 70) msg += 'Looking strong at ' + s.avgPct + '% overall! Almost there.';
      else msg += 'You\'re at ' + s.avgPct + '% with ' + s.active.length + ' active goal' + (s.active.length!==1?'s':'') + '. How can I help?';
      return msg;
    }
  },

  // --- Thanks ---
  { match: ['thank', 'thanks', 'awesome', 'cool', 'great', 'nice', 'perfect', 'love it', 'appreciate', 'thx'],
    fn: function() {
      var s = getGoalStats();
      var responses = [
        'Happy to help! Keep pushing toward those goals.',
        'Anytime! Remember — consistency beats intensity.',
        'You got this! Ask me anything else about your progress.',
        'Keep going! Every day counts toward your goals.',
        'That\'s what I\'m here for! Let me know if you need anything.'
      ];
      var msg = responses[Math.floor(Math.random()*responses.length)];
      if (s.total && s.worst && (s.worst.progress||0) < 30) msg += ' Quick tip: "' + s.worst.title + '" could use some love today.';
      return msg;
    }
  },

  // --- Today / daily ---
  { match: ['today', 'right now', 'daily', 'this morning', 'tonight', 'what should i do today'],
    fn: function() {
      var s = getGoalStats();
      if (!s.active.length) return 'All goals done! Enjoy your day or set new challenges.';
      var todayStr = new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });
      var msg = 'Today is ' + todayStr + '. ';
      // Find most urgent
      if (s.overdue.length) {
        msg += 'Priority: "' + s.overdue[0].title + '" is overdue at ' + (s.overdue[0].progress||0) + '%. Start there. ';
      } else if (s.deadlines.length && s.deadlines[0].daysLeft <= 3) {
        msg += 'Urgent: "' + s.deadlines[0].title + '" is due in ' + s.deadlines[0].daysLeft + ' day' + (s.deadlines[0].daysLeft!==1?'s':'') + '. ';
      } else if (s.worst) {
        msg += 'Focus on "' + s.worst.title + '" (' + (s.worst.progress||0) + '%) — your lowest goal. ';
      }
      if (s.goalsWithNextStep.length) {
        msg += 'Your next step: "' + s.goalsWithNextStep[0].nextStep + '" for ' + s.goalsWithNextStep[0].title + '.';
      } else {
        msg += 'Pick one goal and do just 5 minutes on it. That\'s all it takes.';
      }
      return msg;
    }
  },

  // --- Feelings / emotional ---
  { match: ['stressed', 'overwhelmed', 'anxious', 'worried', 'frustrated', 'stuck', 'lost', 'confused', 'tired', 'burned out', 'burnout'],
    fn: function() {
      var s = getGoalStats();
      var msg = 'I hear you. Progress isn\'t always linear, and it\'s okay to feel that way. ';
      if (s.active.length > 4) msg += 'You have ' + s.active.length + ' active goals — that\'s a lot. Consider archiving 1-2 and giving yourself permission to focus. ';
      else if (s.worst) msg += 'Don\'t look at everything at once. Just pick "' + s.worst.title + '" and do the tiniest possible step. ';
      msg += 'Remember: showing up matters more than being perfect. You\'ve already made it to ' + s.avgPct + '%.';
      return msg;
    }
  },

  // --- Archived goals ---
  { match: ['archived', 'archive', 'removed', 'deleted', 'old goals', 'past goals', 'pivoted'],
    fn: function() {
      var s = getGoalStats();
      if (!s.archivedCount) return 'No archived goals. Goals get archived when you use the Pivot flow and choose to let them go.';
      var msg = s.archivedCount + ' archived goal' + (s.archivedCount!==1?'s':'') + ': ';
      msg += s.archivedList.map(function(a) {
        var info = '"' + a.title + '" (' + a.pct + '%)';
        if (a.pivotNote) info += ' — Reason: "' + a.pivotNote + '"';
        return info;
      }).join('; ') + '.';
      return msg;
    }
  },

  // --- Next steps ---
  { match: ['next step', 'next steps', 'what\'s next', 'to do', 'action item', 'action items', 'tasks', 'todo'],
    fn: function() {
      var s = getGoalStats();
      if (!s.goalsWithNextStep.length) {
        if (!s.active.length) return 'All goals are complete! No next steps needed.';
        return 'No next steps set yet. Use the Pivot flow on any goal to break it down into a small next action.';
      }
      var msg = 'Your next steps: ';
      msg += s.goalsWithNextStep.map(function(g) {
        return '"' + g.title + '": ' + g.nextStep;
      }).join(' | ');
      return msg;
    }
  },

  // --- History / tracking ---
  { match: ['history', 'tracking', 'how long', 'since when', 'snapshots', 'data points', 'records'],
    fn: function() {
      var s = getGoalStats();
      if (!s.totalSnapshots) return 'No progress history yet. Each time you lock in progress, I save a snapshot to track your trend over time.';
      var msg = 'Tracking data: ' + s.totalSnapshots + ' snapshot' + (s.totalSnapshots!==1?'s':'') + ' recorded. ';
      if (s.firstSnapshot) msg += 'First entry: ' + s.firstSnapshot + '. ';
      if (s.lastSnapshot) msg += 'Latest: ' + s.lastSnapshot + '. ';
      msg += 'This data powers your Progress Trend chart and my velocity insights.';
      return msg;
    }
  },

  // --- Specific percentage questions ---
  { match: ['percent', 'percentage', 'how much', 'what percent', 'progress on', 'where am i'],
    fn: function() {
      var s = getGoalStats();
      if (!s.total) return 'No goals yet!';
      var msg = 'Progress breakdown: ';
      msg += goals.map(function(g) {
        var pct = g.progress || 0;
        var bar = pct >= 100 ? ' [DONE]' : pct === 0 ? ' [NOT STARTED]' : '';
        return '"' + g.title + '": ' + pct + '%' + bar;
      }).join(' | ');
      msg += '. Overall average: ' + s.avgPct + '%.';
      return msg;
    }
  },

  // --- Year-related ---
  { match: ['year', 'this year', 'annual', '2026', '2025', '2024', '2027'],
    fn: function() {
      var s = getGoalStats();
      var years = getYears();
      var msg = 'Viewing ' + activeYear + ' (' + (s.isCurrent ? 'current' : activeYear < CURRENT_YEAR ? 'past' : 'upcoming') + '). ';
      msg += 'Years with data: ' + years.join(', ') + '. ';
      msg += s.total + ' goal' + (s.total!==1?'s':'') + ' for ' + activeYear;
      if (s.total > 0) msg += ', averaging ' + s.avgPct + '%.';
      if (s.archivedCount) msg += ' Plus ' + s.archivedCount + ' archived.';
      msg += ' ' + s.daysPassed + ' days in, ' + s.daysLeft + ' remaining.';
      return msg;
    }
  },

  // --- Who am I / my info ---
  { match: ['who am i', 'my name', 'my account', 'my profile', 'about me', 'my info'],
    fn: function() {
      var s = getGoalStats();
      var msg = s.userName ? 'You\'re logged in as ' + s.userName + '. ' : 'You\'re logged in. ';
      msg += 'You have ' + s.total + ' goal' + (s.total!==1?'s':'') + ' for ' + activeYear;
      if (s.archivedCount) msg += ' and ' + s.archivedCount + ' archived';
      msg += '. ';
      if (s.totalSnapshots) msg += 'Tracking since ' + s.firstSnapshot + ' with ' + s.totalSnapshots + ' data points.';
      return msg;
    }
  },

  // --- Everything / full report ---
  { match: ['everything', 'tell me everything', 'full report', 'all info', 'all data', 'complete', 'detailed', 'deep dive'],
    fn: function() {
      var s = getGoalStats();
      if (!s.total) return 'No goals yet! Add some to get the full picture.';
      var msg = 'FULL REPORT for ' + activeYear + ': ';
      msg += s.total + ' goal' + (s.total!==1?'s':'') + ' | ' + s.completed.length + ' done | ' + s.active.length + ' active | ' + s.notStarted.length + ' not started | ' + s.avgPct + '% avg. ';
      if (s.overdue.length) msg += s.overdue.length + ' overdue. ';
      if (s.archivedCount) msg += s.archivedCount + ' archived. ';
      msg += 'Expected pace: ' + s.expectedPct + '%. ';
      msg += s.behind.length + ' behind, ' + s.ahead.length + ' ahead. ';
      if (s.deadlines.length) msg += 'Next deadline: "' + s.deadlines[0].title + '" in ' + s.deadlines[0].daysLeft + ' days. ';
      msg += s.quarterName + ', day ' + s.daysPassed + ', ' + s.daysLeft + ' left.';
      return msg;
    }
  },

  // --- What can you do ---
  { match: ['what can you', 'what do you', 'features', 'commands', 'how to use', 'what to ask'],
    fn: function() {
      return 'I know everything about your goals! Try: "How am I doing?" | "What should I focus on?" | "Am I on track?" | "Deadlines" | "This week" | "Predict" | "Compare" | "Next steps" | "Archived" | "History" | "Full report" | "Quarter" | "Motivate me" | Or ask about any goal by name!';
    }
  },

  // --- Help (separate from features to catch more) ---
  { match: ['help'],
    fn: function() {
      var s = getGoalStats();
      if (!s.total) return 'I\'m your PersonalQ assistant! Start by adding goals, then ask me anything — progress, pace, deadlines, advice, or just say "motivate me"!';
      // Give the most relevant help based on current state
      if (s.overdue.length) return 'You have ' + s.overdue.length + ' overdue goal' + (s.overdue.length!==1?'s':'') + '. Try asking "What should I focus on?" for a priority breakdown, or "Predict" to see completion forecasts.';
      if (s.behind.length) return 'Some goals are behind pace. Ask "Am I on track?" for details, or "Suggest" for personalized advice on catching up.';
      return 'Ask me anything! "How am I doing?" for overview, "Focus" for priorities, "Predict" for forecasts, "This week" for momentum, or mention any goal by name for a deep dive.';
    }
  },
];

function askQuestion() {
  var input = document.getElementById('qa-input');
  var q = input.value.trim();
  if (!q) return;
  input.value = '';

  addChatMsg(q, 'user');

  // Show typing indicator
  var chat = document.getElementById('qa-messages');
  var typingRow = document.createElement('div');
  typingRow.className = 'qa-bot-row';
  typingRow.id = 'typing-indicator';
  typingRow.innerHTML = '<div class="qa-avatar">PQ</div><div class="qa-typing"><span class="qa-typing-dot"></span><span class="qa-typing-dot"></span><span class="qa-typing-dot"></span></div>';
  chat.appendChild(typingRow);
  chat.scrollTop = chat.scrollHeight;

  // Simulate thinking time (200-600ms)
  var thinkTime = 200 + Math.floor(Math.random() * 400);
  setTimeout(function(){
    var ti = document.getElementById('typing-indicator');
    if (ti) ti.remove();
    var answer = getAnswer(q.toLowerCase());
    addChatMsg(answer, 'bot');
  }, thinkTime);
}

/* ── Fuzzy word matching helper ───────────────────────────── */
function fuzzyMatch(input, target) {
  // Check if any word in input partially matches target
  var words = input.split(/\s+/);
  for (var i = 0; i < words.length; i++) {
    if (words[i].length >= 3 && target.includes(words[i])) return true;
    if (words[i].length >= 3 && words[i].includes(target)) return true;
  }
  return false;
}

function getAnswer(q) {
  var s = getGoalStats();

  // 1. Check active goal names (exact and fuzzy match with full deep analysis)
  var allGoalsList = goals.concat(archivedGoals);
  for (var i = 0; i < allGoalsList.length; i++) {
    var g = allGoalsList[i];
    var titleLower = g.title.toLowerCase();
    var isArchived = archivedGoals.indexOf(g) >= 0;

    // Match full title, partial title, or fuzzy word match
    if (q.includes(titleLower) || fuzzyMatch(q, titleLower) || titleLower.split(/\s+/).some(function(w){ return w.length >= 3 && q.includes(w); })) {
      var pct = g.progress || 0;
      var msg = '"' + g.title + '"';

      if (isArchived) {
        msg += ': ARCHIVED at ' + pct + '%.';
        if (g.pivotNote) msg += ' Pivot reason: "' + g.pivotNote + '".';
        if (g.archivedDate) msg += ' Archived on ' + g.archivedDate + '.';
        msg += ' You can restore it from the Archived section.';
        return msg;
      }

      msg += ': ' + pct + '%';
      if (pct >= 100) msg += ' — COMPLETED!';
      else if (pct === 0) msg += ' (not started yet)';

      // Description
      if (g.description) msg += '. Description: "' + g.description + '"';

      // Pace check
      if (s.isCurrent && pct < 100) {
        var diff = pct - s.expectedPct;
        if (diff >= 0) msg += '. On pace (+' + diff + '% ahead)';
        else msg += '. Behind pace by ' + Math.abs(diff) + '%';
      }

      // Deadline
      if (g.deadline) {
        var dl = new Date(g.deadline+'T00:00:00');
        var daysLeft = Math.ceil((dl - s.today) / 86400000);
        msg += '. Deadline: ' + dl.toLocaleDateString('en',{month:'long',day:'numeric',year:'numeric'});
        if (daysLeft > 0) {
          msg += ' (' + daysLeft + ' day' + (daysLeft!==1?'s':'') + ' left)';
          if (pct < 100) {
            var rateNeeded = Math.round((100-pct)/daysLeft*10)/10;
            msg += '. Need ' + rateNeeded + '% per day to finish on time';
          }
        } else if (daysLeft === 0) {
          msg += ' (DUE TODAY!)';
        } else {
          msg += ' (OVERDUE by ' + Math.abs(daysLeft) + ' days)';
        }
      }

      // Next step
      if (g.nextStep) msg += '. Next step: "' + g.nextStep + '"';

      // Pivot note
      if (g.pivotNote) msg += '. Pivot note: "' + g.pivotNote + '"';

      // Created date
      if (g.created_at) msg += '. Created: ' + new Date(g.created_at).toLocaleDateString('en',{month:'short',day:'numeric'});

      // Velocity for this goal
      var vel = s.velocities.find(function(v){return v.title === g.title;});
      if (vel) {
        if (vel.gain > 0) msg += '. This week: +' + vel.gain + '%';
        else if (vel.gain === 0 && pct > 0 && pct < 100) msg += '. Stalled this week (no change)';
      }

      return msg + '.';
    }
  }

  // 2. Pattern match (exact keyword matching)
  for (var j = 0; j < QA_PATTERNS.length; j++) {
    var pat = QA_PATTERNS[j];
    for (var k = 0; k < pat.match.length; k++) {
      if (q.includes(pat.match[k])) return pat.fn();
    }
  }

  // 3. Fuzzy pattern match (try partial word matches against pattern keywords)
  for (var j2 = 0; j2 < QA_PATTERNS.length; j2++) {
    var pat2 = QA_PATTERNS[j2];
    for (var k2 = 0; k2 < pat2.match.length; k2++) {
      if (fuzzyMatch(q, pat2.match[k2])) return pat2.fn();
    }
  }

  // 4. Smart contextual fallback — read ALL data and give the most relevant answer
  if (s.total > 0) {
    // Check if asking about numbers/stats
    if (q.match(/\d/) || q.includes('number') || q.includes('stat') || q.includes('data') || q.includes('info')) {
      return 'Here\'s your data: ' + s.total + ' goals, ' + s.completed.length + ' done, ' + s.active.length + ' active, ' + s.notStarted.length + ' not started. Average: ' + s.avgPct + '%. ' + s.archivedCount + ' archived. ' + s.totalSnapshots + ' snapshots recorded. Ask about a specific goal by name for more detail!';
    }

    // Check for "why" questions — give analysis
    if (q.startsWith('why')) {
      if (s.behind.length) return 'Looking at the data: ' + s.behind.length + ' goal' + (s.behind.length!==1?'s are':' is') + ' behind pace. Common reasons are inconsistent tracking, too many goals at once (' + s.active.length + ' active), or unclear next steps. Try setting a specific next step for your weakest goal.';
      return 'Based on your data, you\'re actually doing well at ' + s.avgPct + '% average. If something specific feels off, ask me about that goal by name and I\'ll dig deeper.';
    }

    // Check if it's a question
    if (q.includes('?') || q.startsWith('what') || q.startsWith('how') || q.startsWith('when') || q.startsWith('where') || q.startsWith('which') || q.startsWith('can') || q.startsWith('do') || q.startsWith('is') || q.startsWith('are') || q.startsWith('will') || q.startsWith('should')) {
      if (s.overdue.length) return 'Quick check: you have ' + s.overdue.length + ' overdue goal' + (s.overdue.length!==1?'s':'') + '. Overall you\'re at ' + s.avgPct + '%. The best thing you can do right now is log some progress on "' + s.overdue[0].title + '". You can also ask me about focus, predictions, or any goal by name.';
      if (s.behind.length) return 'You\'re at ' + s.avgPct + '% overall — ' + s.behind.length + ' goal' + (s.behind.length!==1?'s':'') + ' behind the ' + s.expectedPct + '% expected pace. Want advice? Try "what should I do today" or ask about any goal like "' + goals[0].title + '".';
      return 'You\'re tracking ' + s.total + ' goals at ' + s.avgPct + '% average (' + s.completed.length + ' done). Ask about any goal by name, say "today" for daily focus, or try "full report" for the complete breakdown.';
    }

    // Smart fallback — pick the most useful thing to say
    var fallbacks = [];
    if (s.overdue.length) fallbacks.push('Heads up: "' + s.overdue[0].title + '" is overdue. Consider logging progress or using Pivot.');
    if (s.worst && (s.worst.progress||0) < s.avgPct - 15) fallbacks.push('"' + s.worst.title + '" is lagging at ' + (s.worst.progress||0) + '% — needs attention.');
    if (s.fastestGrower && s.fastestGrower.gain > 0) fallbacks.push('Nice momentum on "' + s.fastestGrower.title + '" (+' + s.fastestGrower.gain + '% this week).');
    if (s.deadlines.length && s.deadlines[0].daysLeft <= 14) fallbacks.push('"' + s.deadlines[0].title + '" deadline in ' + s.deadlines[0].daysLeft + ' days.');

    if (fallbacks.length) return fallbacks[0] + ' You\'re at ' + s.avgPct + '% overall. Ask me anything — goals by name, "today", "suggest", "compare", or "full report".';
    return 'You\'re at ' + s.avgPct + '% across ' + s.total + ' goals. I can help with daily focus, predictions, comparisons, deadlines, or a deep dive on any goal. Just ask!';
  }

  return 'I\'m ready to help! Add your first goal with the "Add Goal" button, then ask me anything — progress, pace, deadlines, or just say "motivate me"!';
}

function addChatMsg(text, type) {
  var chat = document.getElementById('qa-messages');
  if (!chat) return;

  var now = new Date();
  var timeStr = now.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });

  if (type === 'bot') {
    var row = document.createElement('div');
    row.className = 'qa-bot-row';
    var avatar = document.createElement('div');
    avatar.className = 'qa-avatar';
    avatar.textContent = 'PQ';
    var msgWrap = document.createElement('div');
    msgWrap.style.cssText = 'flex:1;min-width:0';
    var msg = document.createElement('div');
    msg.className = 'qa-msg qa-msg-bot';
    msg.textContent = text;
    var ts = document.createElement('div');
    ts.className = 'qa-timestamp';
    ts.textContent = timeStr;
    msgWrap.appendChild(msg);
    msgWrap.appendChild(ts);
    row.appendChild(avatar);
    row.appendChild(msgWrap);
    chat.appendChild(row);
  } else {
    var msg = document.createElement('div');
    msg.className = 'qa-msg qa-msg-user';
    msg.textContent = text;
    chat.appendChild(msg);
    var ts = document.createElement('div');
    ts.className = 'qa-timestamp';
    ts.style.textAlign = 'right';
    ts.textContent = timeStr;
    chat.appendChild(ts);
  }

  chat.scrollTop = chat.scrollHeight;
}

/* ═══════════════════════════════════════════════════════════
   EVENT LISTENERS
   ═══════════════════════════════════════════════════════════ */
document.getElementById('goal-modal')?.addEventListener('click', e => { if (e.target.id === 'goal-modal') closeModal(); });
document.getElementById('lockin-modal')?.addEventListener('click', e => { if (e.target.id === 'lockin-modal') closeLockin(); });
document.getElementById('pivot-modal')?.addEventListener('click', e => { if (e.target.id === 'pivot-modal') closePivot(); });
document.getElementById('goal-title-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') saveGoal(); });
document.getElementById('lockin-pct')?.addEventListener('input', e => updateLockinPreview(e.target.value));
document.getElementById('lockin-pct')?.addEventListener('keydown', e => { if (e.key === 'Enter') confirmLockin(); });
document.getElementById('pivot-next-step')?.addEventListener('keydown', e => { if (e.key === 'Enter') pivotSaveStep(); });
document.getElementById('qa-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') askQuestion(); });
