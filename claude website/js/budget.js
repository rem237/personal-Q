/* ═══════════════════════════════════════════════════════════
   PersonalQ — Budget Planner v1
   localStorage-based income & expense tracking
   ═══════════════════════════════════════════════════════════ */

var INCOME_CATEGORIES = [
  { id: 'salary', label: 'Salary', icon: '💰' },
  { id: 'freelance', label: 'Freelance', icon: '💻' },
  { id: 'investment', label: 'Investment', icon: '📈' },
  { id: 'gift', label: 'Gift', icon: '🎁' },
  { id: 'other_income', label: 'Other', icon: '💵' }
];

var EXPENSE_CATEGORIES = [
  { id: 'housing', label: 'Housing', icon: '🏠', color: '#ff6b6b' },
  { id: 'transport', label: 'Transport', icon: '🚗', color: '#ffa94d' },
  { id: 'food', label: 'Food & Groceries', icon: '🛒', color: '#ffd43b' },
  { id: 'utilities', label: 'Utilities', icon: '💡', color: '#69db7c' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎮', color: '#a78bfa' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', color: '#38bdf8' },
  { id: 'health', label: 'Health', icon: '🏥', color: '#f472b6' },
  { id: 'education', label: 'Education', icon: '📚', color: '#00e5a0' },
  { id: 'savings', label: 'Savings', icon: '🏦', color: '#22d3ee' },
  { id: 'other_expense', label: 'Other', icon: '📦', color: '#94a3b8' }
];

// ── State ────────────────────────────────────────────────
var currentMonth = new Date().getMonth();
var currentYear  = new Date().getFullYear();
var today        = new Date().getDate();
var viewMonth    = currentMonth;
var viewYear     = currentYear;
var entries      = [];
var recurring    = [];   // recurring bill templates
var activeFilter = 'all';
var budgetChart  = null;

var RECURRING_KEY = 'personalq_recurring';

// ── Session ──────────────────────────────────────────────
(function init() {
  var session = localStorage.getItem('personalq_session');
  if (!session) { window.location.href = 'auth.html'; return; }
  try {
    var user = JSON.parse(session);
    var nameEl = document.getElementById('nav-username');
    if (nameEl) nameEl.textContent = user.name || '';
  } catch(e) {}

  loadRecurring();
  loadEntries();
  updateMonthDisplay();
  renderAll();
})();

function handleLogout() {
  sessionStorage.removeItem('pq_welcomed');
  localStorage.removeItem('personalq_session');
  window.location.href = 'auth.html';
}

// ── Recurring storage ────────────────────────────────────
function loadRecurring() {
  try { recurring = JSON.parse(localStorage.getItem(RECURRING_KEY)) || []; }
  catch(e) { recurring = []; }
}
function saveRecurring() {
  localStorage.setItem(RECURRING_KEY, JSON.stringify(recurring));
}

// ── Recurring modal toggle ───────────────────────────────
function toggleRecurringDay() {
  var checked = document.getElementById('entry-recurring').checked;
  document.getElementById('recurring-day-row').style.display = checked ? '' : 'none';
  if (checked) {
    // Pre-fill the day from the selected date
    var dateVal = document.getElementById('entry-date').value;
    if (dateVal) {
      document.getElementById('entry-recurring-day').value = parseInt(dateVal.split('-')[2], 10);
    }
    setTimeout(function() { document.getElementById('entry-recurring-day').focus(); }, 50);
  }
}

// ── Storage ──────────────────────────────────────────────
function storageKey() {
  return 'personalq_budget_' + viewYear + '_' + viewMonth;
}

function loadEntries() {
  try { entries = JSON.parse(localStorage.getItem(storageKey())) || []; }
  catch(e) { entries = []; }
}

function persist() {
  localStorage.setItem(storageKey(), JSON.stringify(entries));
}

// ── Month Navigation ─────────────────────────────────────
function changeMonth(dir) {
  viewMonth += dir;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  loadEntries();
  updateMonthDisplay();
  renderAll();
}

function updateMonthDisplay() {
  var months = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  var el = document.getElementById('budget-month-display');
  if (el) el.textContent = months[viewMonth] + ' ' + viewYear;
}

// ── Modal ────────────────────────────────────────────────
function openEntryModal(type, prefill) {
  prefill = prefill || {};
  document.getElementById('entry-type').value = type;
  document.getElementById('entry-modal-title').textContent =
    type === 'income' ? 'Add Income' : 'Add Expense';
  document.getElementById('entry-name').value   = prefill.name   || '';
  document.getElementById('entry-amount').value = prefill.amount || '';

  var nowDate = new Date();
  var defaultDate = new Date(viewYear, viewMonth,
    (viewYear === currentYear && viewMonth === currentMonth) ? nowDate.getDate() : 1);
  document.getElementById('entry-date').value = (prefill.date || defaultDate.toISOString().slice(0, 10));

  var select = document.getElementById('entry-category');
  var cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  select.innerHTML = cats.map(function(c) {
    return '<option value="' + c.id + '"' + (c.id === prefill.category ? ' selected' : '') + '>' +
      c.icon + ' ' + c.label + '</option>';
  }).join('');

  // Show recurring toggle only for expenses
  var toggleRow = document.getElementById('recurring-toggle-row');
  var dayRow    = document.getElementById('recurring-day-row');
  var cb        = document.getElementById('entry-recurring');
  toggleRow.style.display = type === 'expense' ? '' : 'none';
  cb.checked = false;
  dayRow.style.display = 'none';
  document.getElementById('entry-recurring-day').value = '';

  document.getElementById('entry-modal').classList.remove('hidden');
  setTimeout(function() { document.getElementById('entry-name').focus(); }, 100);
}

function closeEntryModal() {
  document.getElementById('entry-modal').classList.add('hidden');
}

function saveEntry() {
  var type     = document.getElementById('entry-type').value;
  var name     = document.getElementById('entry-name').value.trim();
  var amount   = parseFloat(document.getElementById('entry-amount').value);
  var category = document.getElementById('entry-category').value;
  var date     = document.getElementById('entry-date').value;
  var isRecurring = document.getElementById('entry-recurring').checked;
  var recDay   = parseInt(document.getElementById('entry-recurring-day').value, 10);

  if (!name)                { document.getElementById('entry-name').focus();   return; }
  if (!amount || amount<=0) { document.getElementById('entry-amount').focus(); return; }
  if (isRecurring && (!recDay || recDay < 1 || recDay > 28)) {
    document.getElementById('entry-recurring-day').focus(); return;
  }

  var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  var recId = null;

  // Save recurring template
  if (isRecurring && type === 'expense') {
    recId = 'rec_' + id;
    recurring.push({ id: recId, name: name, amount: amount, category: category,
                     dayOfMonth: recDay, active: true, createdAt: new Date().toISOString() });
    saveRecurring();
  }

  entries.push({ id: id, type: type, name: name, amount: amount,
                 category: category, date: date, recurringId: recId,
                 createdAt: new Date().toISOString() });
  entries.sort(function(a, b) { return b.date.localeCompare(a.date); });
  persist();
  closeEntryModal();
  renderAll();
}

function deleteEntry(id) {
  entries = entries.filter(function(e) { return e.id !== id; });
  persist();
  renderAll();
}

// ── Filter ───────────────────────────────────────────────
function setFilter(f) {
  activeFilter = f;
  document.querySelectorAll('.budget-filter').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.filter === f);
  });
  renderList();
}

// ── Render ───────────────────────────────────────────────
function renderAll() {
  renderSummary();
  renderRecurring();
  renderAdvice();
  renderList();
  renderChart();
}

// ── Recurring section ────────────────────────────────────
function autoAddRecurring(recId) {
  var rec = recurring.find(function(r) { return r.id === recId; });
  if (!rec) return;
  var day = Math.min(rec.dayOfMonth, new Date(viewYear, viewMonth + 1, 0).getDate());
  var dateStr = viewYear + '-' + String(viewMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  entries.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                 type: 'expense', name: rec.name, amount: rec.amount,
                 category: rec.category, date: dateStr,
                 recurringId: recId, createdAt: new Date().toISOString() });
  entries.sort(function(a, b) { return b.date.localeCompare(a.date); });
  persist();
  renderAll();
}

function deleteRecurring(recId) {
  recurring = recurring.filter(function(r) { return r.id !== recId; });
  saveRecurring();
  renderRecurring();
}

function renderRecurring() {
  var list = document.getElementById('recurring-list');
  if (!list || recurring.length === 0) {
    if (list) list.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:8px 0">No recurring bills yet. Mark an expense as "Repeat monthly" when adding it.</div>';
    return;
  }

  var isCurrentMonth = (viewYear === currentYear && viewMonth === currentMonth);
  var paidIds = {};
  entries.forEach(function(e) { if (e.recurringId) paidIds[e.recurringId] = true; });

  list.innerHTML = recurring.map(function(rec, i) {
    var day = rec.dayOfMonth;
    var isPaid = !!paidIds[rec.id];
    var isOverdue  = !isPaid && isCurrentMonth && today >= day;
    var isUpcoming = !isPaid && (!isCurrentMonth || today < day);

    var statusClass  = isPaid ? 'paid'     : isOverdue ? 'overdue' : 'upcoming';
    var badgeLabel   = isPaid ? '✓ Paid'   : isOverdue ? 'Overdue' : 'Due ' + ordinal(day);
    var cat = getCategoryInfo('expense', rec.category);

    return '<div class="rec-item rec-' + statusClass + '" style="animation-delay:' + (i*0.06) + 's">' +
      '<div class="rec-icon ' + statusClass + '">' + cat.icon + '</div>' +
      '<div class="rec-info">' +
        '<div class="rec-name">' + esc(rec.name) + '</div>' +
        '<div class="rec-meta">Every month · Day ' + day + '</div>' +
      '</div>' +
      '<div class="rec-right">' +
        '<span class="rec-amount ' + statusClass + '">$' + rec.amount.toFixed(2) + '</span>' +
        '<span class="rec-badge ' + statusClass + '">' + badgeLabel + '</span>' +
        (!isPaid ? '<button class="rec-add-btn" onclick="autoAddRecurring(\'' + rec.id + '\')">+ Add</button>' : '') +
        '<button class="rec-delete-btn" title="Remove recurring" onclick="deleteRecurring(\'' + rec.id + '\')">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function ordinal(n) {
  var s = ['th','st','nd','rd'];
  var v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}

// ── Smart monthly advice ─────────────────────────────────
function renderAdvice() {
  var card = document.getElementById('advice-card');
  var listEl = document.getElementById('advice-list');
  if (!card || !listEl) return;

  var totalIn = 0, totalOut = 0;
  entries.forEach(function(e) {
    if (e.type === 'income') totalIn += e.amount;
    else totalOut += e.amount;
  });

  if (totalIn === 0 && totalOut === 0) { card.style.display = 'none'; return; }
  card.style.display = '';

  var advice = generateAdvice(totalIn, totalOut);
  listEl.innerHTML = advice.map(function(a) {
    return '<div class="advice-item">' +
      '<div class="advice-dot ' + a.color + '"></div>' +
      '<span>' + a.text + '</span>' +
    '</div>';
  }).join('');
}

function generateAdvice(totalIn, totalOut) {
  var balance     = totalIn - totalOut;
  var savingsRate = totalIn > 0 ? (balance / totalIn) * 100 : 0;
  var advice      = [];

  // 1. Savings rate
  if (totalIn === 0) {
    advice.push({ color:'yellow', text: 'No income logged yet. Add your income to get a full picture of your finances.' });
  } else if (balance < 0) {
    advice.push({ color:'red', text: 'You\'re spending $' + Math.abs(balance).toFixed(2) + ' more than you earn this month. Review your top expenses immediately.' });
  } else if (savingsRate >= 30) {
    advice.push({ color:'green', text: 'Excellent! You\'re saving ' + Math.round(savingsRate) + '% of your income — well above the recommended 20%. Keep it up.' });
  } else if (savingsRate >= 20) {
    advice.push({ color:'green', text: 'Good — saving ' + Math.round(savingsRate) + '% this month. Try pushing to 30% by trimming one discretionary category.' });
  } else if (savingsRate >= 10) {
    advice.push({ color:'yellow', text: 'Saving ' + Math.round(savingsRate) + '%. Aim for 20% with the 50/30/20 rule: 50% needs, 30% wants, 20% savings.' });
  } else {
    advice.push({ color:'red', text: 'Only ' + Math.round(savingsRate) + '% saved. Find one recurring expense you can cut or reduce this month.' });
  }

  // 2. Top spending category
  var catTotals = {};
  entries.forEach(function(e) {
    if (e.type === 'expense') catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });
  var sorted = Object.keys(catTotals).sort(function(a,b){ return catTotals[b]-catTotals[a]; });
  if (sorted.length > 0 && totalOut > 0) {
    var topCat = getCategoryInfo('expense', sorted[0]);
    var pct = Math.round((catTotals[sorted[0]] / totalOut) * 100);
    if (pct > 50) {
      advice.push({ color:'yellow', text: topCat.icon + ' ' + topCat.label + ' is ' + pct + '% of all spending ($' + catTotals[sorted[0]].toFixed(2) + '). Is that aligned with your priorities?' });
    }
  }

  // 3. Subscription / recurring burden
  if (recurring.length > 0) {
    var recTotal = recurring.reduce(function(sum, r) { return sum + r.amount; }, 0);
    var recPct   = totalIn > 0 ? Math.round((recTotal / totalIn) * 100) : 0;
    var unpaid   = recurring.filter(function(r) {
      return !entries.find(function(e) { return e.recurringId === r.id; });
    });
    if (unpaid.length > 0) {
      advice.push({ color:'blue', text: unpaid.length + ' recurring bill' + (unpaid.length > 1 ? 's' : '') + ' still unpaid this month ($' + unpaid.reduce(function(s,r){return s+r.amount;},0).toFixed(2) + '). Tap "+ Add" to confirm them.' });
    }
    if (recPct > 20) {
      advice.push({ color:'yellow', text: 'Subscriptions & fixed bills are ' + recPct + '% of your income ($' + recTotal.toFixed(2) + '/mo). Audit which ones you actually use.' });
    } else if (recTotal > 0) {
      advice.push({ color:'blue', text: 'Fixed recurring costs: $' + recTotal.toFixed(2) + '/mo (' + recPct + '% of income).' });
    }
  }

  // 4. Spending vs income ratio
  if (totalIn > 0 && totalOut > 0) {
    var ratio = (totalOut / totalIn) * 100;
    if (ratio > 90 && ratio <= 100) {
      advice.push({ color:'yellow', text: 'You\'re spending ' + Math.round(ratio) + '% of your income. You\'re close to the limit — one unexpected expense could put you in the red.' });
    }
  }

  return advice;
}

function renderSummary() {
  var totalIn = 0, totalOut = 0;
  entries.forEach(function(e) {
    if (e.type === 'income') totalIn += e.amount;
    else totalOut += e.amount;
  });
  var balance = totalIn - totalOut;

  // Animate number count-up
  animateValue('total-income', totalIn);
  animateValue('total-expenses', totalOut);
  animateValue('total-balance', balance, balance >= 0 ? '+' : '');

  // Percentages for rings
  var total = totalIn + totalOut;
  var inPct  = total > 0 ? Math.round((totalIn  / total) * 100) : 0;
  var outPct = total > 0 ? Math.round((totalOut / total) * 100) : 0;
  var savePct = totalIn > 0 ? Math.max(0, Math.min(100, Math.round((balance / totalIn) * 100))) : 0;

  // Drive rings (circumference = 2π×30 ≈ 188.5)
  var C = 188.5;
  setTimeout(function() {
    setRing('ring-income',  'pct-income',  inPct,  C);
    setRing('ring-expense', 'pct-expense', outPct, C);
    setRing('ring-balance', 'pct-balance', savePct, C);
  }, 350);

  // Trend badges
  setTrend('trend-income',  balance >= 0 ? 'up' : 'flat',  balance >= 0 ? '↑' : '—');
  setTrend('trend-expense', outPct > 60   ? 'down' : 'flat', outPct > 60 ? '↓ High' : '↓');
  setTrend('trend-balance', balance > 0 ? 'up' : balance < 0 ? 'down' : 'flat',
    balance > 0 ? '↑' : balance < 0 ? '↓' : '—');
}

function setRing(ringId, labelId, pct, C) {
  var el = document.getElementById(ringId);
  var lbl = document.getElementById(labelId);
  if (!el) return;
  // dashoffset: full circle minus filled arc
  el.style.strokeDashoffset = C - (pct / 100) * C;
  if (lbl) lbl.textContent = pct + '%';
}

function setTrend(id, cls, text) {
  var el = document.getElementById(id);
  if (!el) return;
  el.className = 'bento-trend ' + cls;
  el.textContent = text;
}

function animateValue(id, target, prefix) {
  var el = document.getElementById(id);
  if (!el) return;
  prefix = prefix || '';
  var start = 0;
  var duration = 900;
  var startTime = null;

  function step(ts) {
    if (!startTime) startTime = ts;
    var progress = Math.min((ts - startTime) / duration, 1);
    // ease out expo
    var eased = 1 - Math.pow(1 - progress, 3);
    var value = start + (Math.abs(target) - start) * eased;
    el.textContent = prefix + 'R' + value.toLocaleString('en', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = prefix + formatMoney(Math.abs(target));
  }
  requestAnimationFrame(step);
}

function renderList() {
  var list = document.getElementById('budget-list');
  if (!list) return;

  var filtered = entries;
  if (activeFilter !== 'all') {
    filtered = entries.filter(function(e) { return e.type === activeFilter; });
  }

  if (filtered.length === 0) {
    list.innerHTML = '<div class="budget-empty">No transactions yet. Tap above to add income or expenses.</div>';
    return;
  }

  list.innerHTML = filtered.map(function(e, i) {
    var cat = getCategoryInfo(e.type, e.category);
    var dateObj = new Date(e.date + 'T00:00:00');
    var dateStr = dateObj.toLocaleDateString('en', { month: 'short', day: 'numeric' });

    return '<div class="budget-entry" style="animation-delay:' + (i * 0.03) + 's">' +
      '<div class="budget-entry-icon ' + e.type + '">' + cat.icon + '</div>' +
      '<div class="budget-entry-info">' +
        '<div class="budget-entry-name">' + esc(e.name) + '</div>' +
        '<div class="budget-entry-meta">' + cat.label + ' · ' + dateStr + '</div>' +
      '</div>' +
      '<div class="budget-entry-amount ' + e.type + '">' +
        (e.type === 'income' ? '+' : '-') + formatMoney(e.amount) +
      '</div>' +
      '<button class="budget-entry-delete" onclick="deleteEntry(\'' + e.id + '\')" title="Delete">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>' +
      '</button>' +
    '</div>';
  }).join('');
}

function toggleBreakdown() {
  var section = document.getElementById('chart-section');
  var btn     = document.getElementById('breakdown-toggle');
  var open    = section.style.display === 'none';
  section.style.display = open ? '' : 'none';
  btn.classList.toggle('open', open);
  btn.innerHTML = open
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Hide Breakdown'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> View Spending Breakdown';
  if (open) renderChart();
}

function renderChart() {
  var canvas = document.getElementById('budget-chart');
  if (!canvas) return;

  // Group expenses by category
  var catTotals = {};
  entries.forEach(function(e) {
    if (e.type !== 'expense') return;
    if (!catTotals[e.category]) catTotals[e.category] = 0;
    catTotals[e.category] += e.amount;
  });

  var labels = [];
  var data = [];
  var colors = [];

  EXPENSE_CATEGORIES.forEach(function(c) {
    if (catTotals[c.id]) {
      labels.push(c.icon + ' ' + c.label);
      data.push(catTotals[c.id]);
      colors.push(c.color);
    }
  });

  if (budgetChart) budgetChart.destroy();

  if (data.length === 0) {
    // Show empty state
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  budgetChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderColor: '#060608',
        borderWidth: 3,
        hoverBorderWidth: 0,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#6b6b7b',
            font: { family: "'Inter', sans-serif", size: 11, weight: 500 },
            padding: 12,
            usePointStyle: true,
            pointStyleWidth: 8
          }
        },
        tooltip: {
          backgroundColor: '#1a1a22',
          titleColor: '#ebebeb',
          bodyColor: '#6b6b7b',
          borderColor: 'rgba(255,255,255,0.06)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          callbacks: {
            label: function(ctx) {
              var total = ctx.dataset.data.reduce(function(s, v) { return s + v; }, 0);
              var pct = Math.round((ctx.raw / total) * 100);
              return ' ' + formatMoney(ctx.raw) + ' (' + pct + '%)';
            }
          }
        }
      }
    }
  });
}

// ── Helpers ──────────────────────────────────────────────
function formatMoney(n) {
  return '$' + Math.abs(n).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCategoryInfo(type, catId) {
  var cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  var found = cats.find(function(c) { return c.id === catId; });
  return found || { icon: '📦', label: 'Other' };
}

function esc(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// Enter key on modal inputs
document.getElementById('entry-amount')?.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') saveEntry();
});
document.getElementById('entry-name')?.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') document.getElementById('entry-amount').focus();
});
