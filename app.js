/**
 * @file app.js
 * @description EcoSphere – Carbon Footprint Awareness Platform
 * Core application logic: state management, calculator, gamification,
 * daily tracking, Chart.js integration, and Gemini AI Advisor.
 *
 * Architecture:
 *   STATE  → single source of truth
 *   CALC   → pure footprint computation functions
 *   UI     → DOM renderers that read from STATE
 *   EVENTS → user interaction handlers that mutate STATE then call UI
 */

'use strict';

// =============================================================
// 1. CONSTANTS & EMISSION FACTORS
// =============================================================

/**
 * Emission conversion factors derived from IPCC AR6 / EPA estimates.
 * All results are in metric Tons of CO2-equivalent per year.
 * @readonly
 * @type {Object}
 */
const EMISSION_FACTORS = Object.freeze({
  /** Tons CO2 per kWh of electricity (global average grid) */
  ENERGY_PER_KWH: 0.000385,
  /** Tons CO2 per mile driven (average petrol car) */
  TRANSPORT_PER_MILE: 0.000404,
  /** Annual diet emissions by category (Tons CO2) */
  DIET: { high: 3.3, avg: 2.5, veg: 1.7, vegan: 1.5 },
  /** Tons CO2 per waste bag per year */
  WASTE_PER_BAG: 0.019,
  /** Average global footprint for comparison */
  GLOBAL_AVERAGE: 4.7,
  /** Baseline for computing reduction % (worst case: full meat, max energy) */
  BASELINE: 16.0
});

/** Maximum achievable Eco-Score */
const MAX_ECO_SCORE = 100;

/** Sanitisation regex – strips HTML tags from user input */
const SANITISE_RE = /<[^>]*>/g;

// =============================================================
// 2. APPLICATION STATE
// =============================================================

/**
 * Centralized mutable application state.
 * All functions READ from and WRITE to this object.
 */
const state = {
  footprint: {
    energy:    0,
    transport: 0,
    diet:      0,
    waste:     0,
    total:     0
  },
  ecoScore:         40,
  co2Saved:         0,
  reductionPct:     0,
  activeDiet:       'avg',
  completedActions: new Set(),
  logs:             JSON.parse(localStorage.getItem('ecoLogs') || '[]'),
  apiKey:           localStorage.getItem('geminiApiKey') || ''
};

// =============================================================
// 3. PURE CALCULATION FUNCTIONS (fully testable, no DOM)
// =============================================================

/**
 * Calculate annual carbon footprint from raw user inputs.
 * @param {number} energyKwh     – Monthly kWh usage.
 * @param {number} transportMile – Weekly miles driven.
 * @param {string} dietType      – One of: high | avg | veg | vegan.
 * @param {number} wasteBags     – Waste bags per week.
 * @returns {{ energy:number, transport:number, diet:number, waste:number, total:number }}
 */
function calcFootprint(energyKwh, transportMile, dietType, wasteBags) {
  const energy    = parseFloat((energyKwh    * 12   * EMISSION_FACTORS.ENERGY_PER_KWH).toFixed(3));
  const transport = parseFloat((transportMile * 52  * EMISSION_FACTORS.TRANSPORT_PER_MILE).toFixed(3));
  const diet      = EMISSION_FACTORS.DIET[dietType] ?? EMISSION_FACTORS.DIET.avg;
  const waste     = parseFloat((wasteBags    * 52   * EMISSION_FACTORS.WASTE_PER_BAG).toFixed(3));
  const total     = parseFloat((energy + transport + diet + waste).toFixed(2));
  return { energy, transport, diet, waste, total };
}

/**
 * Compute an Eco-Score (0–100) from total footprint and completed actions.
 * Lower footprint + more actions = higher score.
 * @param {number} totalTons       – Total annual CO2 in Tons.
 * @param {number} actionsCount    – Number of completed reduction actions.
 * @returns {number} integer Eco-Score between 0 and 100.
 */
function calcEcoScore(totalTons, actionsCount) {
  const raw = MAX_ECO_SCORE - ((totalTons - 1.5) * 4.5) + actionsCount * 3;
  return Math.max(0, Math.min(MAX_ECO_SCORE, Math.round(raw)));
}

/**
 * Compute the reduction percentage against the baseline.
 * @param {number} totalTons – Current total footprint.
 * @returns {number} reduction percentage (0–100).
 */
function calcReductionPct(totalTons) {
  const pct = ((EMISSION_FACTORS.BASELINE - totalTons) / EMISSION_FACTORS.BASELINE) * 100;
  return Math.max(0, Math.min(100, parseFloat(pct.toFixed(1))));
}

/**
 * Determine which badges should be unlocked based on current state.
 * @param {number}  actionsCount  – Completed action count.
 * @param {string}  dietType      – Current diet selection.
 * @param {number}  totalTons     – Total footprint.
 * @returns {Set<string>} Set of badge IDs that should be unlocked.
 */
function calcUnlockedBadges(actionsCount, dietType, totalTons) {
  const unlocked = new Set();
  if (actionsCount >= 1)                         unlocked.add('eco-starter');
  if (actionsCount >= 3)                         unlocked.add('action-hero');
  if (dietType === 'veg' || dietType === 'vegan') unlocked.add('green-eater');
  if (dietType === 'vegan')                      unlocked.add('vegan-champion');
  if (totalTons < 8)                             unlocked.add('low-footprint');
  if (totalTons < 4)                             unlocked.add('climate-hero');
  return unlocked;
}

/**
 * Sanitise a string to prevent XSS by stripping HTML tags.
 * @param {string} input – Raw user input string.
 * @returns {string} Sanitised string.
 */
function sanitiseInput(input) {
  if (typeof input !== 'string') return '';
  return input.replace(SANITISE_RE, '').trim().slice(0, 500);
}

/**
 * Validate a log form entry. Returns error message or null.
 * @param {string} date  – ISO date string.
 * @param {string} type  – Activity type key.
 * @param {string} value – Raw quantity string.
 * @returns {string|null} Error message or null if valid.
 */
function validateLogEntry(date, type, value) {
  if (!date)           return 'Please select a date.';
  if (!type)           return 'Please select an activity type.';
  const needsValue = !['meatless', 'recycled'].includes(type);
  if (needsValue && (!value || parseFloat(value) < 0)) return 'Please enter a valid quantity.';
  return null;
}

/**
 * Compute the CO2 equivalent for a logged activity in kg.
 * @param {string} type  – Activity key.
 * @param {number} value – Quantity.
 * @returns {number} kg CO2 equivalent.
 */
function calcLogCo2(type, value) {
  const MAP = {
    driving: value * 0.404,    // kg CO2 per mile (car)
    energy:  value * 0.385,    // kg CO2 per kWh
    flight:  value * 90,       // kg CO2 per flight hour (economy)
    meatless: -3,              // kg saved
    recycled: -1.5             // kg saved
  };
  return parseFloat((MAP[type] ?? 0).toFixed(2));
}

// =============================================================
// 4. DATA
// =============================================================

const BADGE_DATA = [
  { id: 'eco-starter',    icon: 'fa-seedling',         name: 'Eco Starter',     req: 'Complete 1 action' },
  { id: 'action-hero',    icon: 'fa-bolt',             name: 'Action Hero',     req: 'Complete 3 actions' },
  { id: 'green-eater',    icon: 'fa-carrot',           name: 'Green Eater',     req: 'Go vegetarian/vegan' },
  { id: 'vegan-champion', icon: 'fa-leaf',             name: 'Vegan Champion',  req: 'Choose vegan diet' },
  { id: 'low-footprint',  icon: 'fa-arrow-trend-down', name: 'Low Footprint',   req: 'Under 8 Tons/yr' },
  { id: 'climate-hero',   icon: 'fa-earth-americas',   name: 'Climate Hero',    req: 'Under 4 Tons/yr' }
];

const ACTION_DATA = [
  { id: 'a1', title: 'Meatless Monday',        desc: 'Skip meat one day/week. Saves ~3 kg CO₂.', savings: 3,  difficulty: 'easy',   icon: 'fa-carrot' },
  { id: 'a2', title: 'LED Bulb Switch',         desc: 'Replace 5 incandescent bulbs with LEDs.',  savings: 5,  difficulty: 'easy',   icon: 'fa-lightbulb' },
  { id: 'a3', title: 'Public Transit Day',      desc: 'Bus/train instead of driving 1× week.',    savings: 8,  difficulty: 'easy',   icon: 'fa-bus' },
  { id: 'a4', title: 'Cold Water Laundry',      desc: 'Wash clothes in cold water always.',        savings: 4,  difficulty: 'easy',   icon: 'fa-shirt' },
  { id: 'a5', title: 'Shorter Showers',         desc: 'Reduce shower time by 2 minutes daily.',   savings: 2,  difficulty: 'easy',   icon: 'fa-shower' },
  { id: 'a6', title: 'Bike Commute 2×/week',    desc: 'Cycle to work or shops twice a week.',     savings: 15, difficulty: 'medium', icon: 'fa-bicycle' },
  { id: 'a7', title: 'Home Composting',         desc: 'Compost food waste instead of binning.',   savings: 10, difficulty: 'medium', icon: 'fa-recycle' },
  { id: 'a8', title: 'Plant-Based for a Month', desc: 'Go fully plant-based for 30 days.',        savings: 30, difficulty: 'hard',   icon: 'fa-leaf' },
  { id: 'a9', title: 'Solar Energy Switch',     desc: 'Move to a renewable energy tariff.',       savings: 50, difficulty: 'hard',   icon: 'fa-solar-panel' }
];

// =============================================================
// 5. CHART INSTANCES
// =============================================================
let breakdownChart = null;
let trendChart     = null;

/**
 * Initialise Chart.js doughnut chart for footprint breakdown.
 */
function initBreakdownChart() {
  const ctx = document.getElementById('breakdownChart');
  if (!ctx) return;
  breakdownChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Energy', 'Transport', 'Diet', 'Waste'],
      datasets: [{
        data: [0, 0, 0, 0],
        backgroundColor: ['#fbbf24', '#fb7185', '#34d399', '#94a3b8'],
        borderWidth: 2,
        borderColor: 'rgba(15,23,42,0.8)',
        hoverOffset: 12
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#f1f5f9', padding: 14, font: { family: 'Outfit', size: 12 } }
        },
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.toFixed(2)} Tons CO₂` } }
      }
    }
  });
}

/**
 * Initialise Chart.js line chart for daily emission trend.
 */
function initTrendChart() {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;
  trendChart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'kg CO₂', data: [], borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.08)', tension: 0.4, fill: true, pointBackgroundColor: '#22d3ee', pointRadius: 5 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'kg CO₂', color: '#94a3b8' } }
      },
      plugins: { legend: { labels: { color: '#f1f5f9', font: { family: 'Outfit' } } } }
    }
  });
  refreshTrendChart();
}

/**
 * Rebuild trend chart data from stored logs.
 */
function refreshTrendChart() {
  if (!trendChart) return;
  const sorted = [...state.logs].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-14);
  trendChart.data.labels                 = sorted.map(l => l.date);
  trendChart.data.datasets[0].data      = sorted.map(l => l.co2);
  trendChart.update();
}

/**
 * Update the breakdown doughnut chart from current state.
 */
function refreshBreakdownChart() {
  if (!breakdownChart) return;
  const { energy, transport, diet, waste } = state.footprint;
  breakdownChart.data.datasets[0].data = [energy, transport, diet, waste];
  breakdownChart.update();
}

// =============================================================
// 6. UI RENDERERS
// =============================================================

/**
 * Announce a message to screen-reader users via an ARIA live region.
 * @param {string} message
 */
function srAnnounce(message) {
  const el = document.getElementById('srAnnouncer');
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = message; });
}

/**
 * Update all KPI cards and sidebar score from current state.
 */
function renderDashboard() {
  const { total }    = state.footprint;
  const score        = state.ecoScore;
  const saved        = state.co2Saved;
  const reductionPct = state.reductionPct;

  // KPI Cards – use innerHTML to preserve the styled <span class="unit"> inside each metric element
  const totalEl = document.getElementById('dash-total-co2');
  if (totalEl) totalEl.innerHTML = `${total} <span class="unit">Tons CO₂/yr</span>`;
  const savedEl = document.getElementById('dash-saved-co2');
  if (savedEl) savedEl.innerHTML = `${saved} <span class="unit">kg this month</span>`;
  const redEl = document.getElementById('dash-reduction');
  if (redEl) redEl.innerHTML = `${reductionPct}% <span class="unit">vs baseline</span>`;

  // Sidebar score
  safeSetText('nav-eco-score', `${score}/100`);
  const bar = document.getElementById('scoreBar');
  if (bar) {
    bar.style.width = `${score}%`;
    bar.setAttribute('aria-valuenow', score);
  }

  // Topbar summary
  safeSetText('topbar-summary', `Your footprint: ${total} Tons CO₂/yr · Eco-Score: ${score}/100`);

  // Calculator result panel
  safeSetText('result-total', `${total} Tons CO₂/yr`);
  const cmpEl = document.getElementById('result-comparison');
  if (cmpEl) {
    if (total < EMISSION_FACTORS.GLOBAL_AVERAGE) {
      cmpEl.textContent = `✅ Below the global average (${EMISSION_FACTORS.GLOBAL_AVERAGE} Tons). Great work!`;
      cmpEl.style.color = 'var(--accent-emerald)';
    } else {
      cmpEl.textContent = `⚠️ Above the global average (${EMISSION_FACTORS.GLOBAL_AVERAGE} Tons). Use the Reduce tab!`;
      cmpEl.style.color = 'var(--accent-warning)';
    }
  }

  // Reduction progress bar
  safeSetText('reductionPct', `${reductionPct}%`);
  const fill = document.getElementById('reductionBarFill');
  const wrap = document.getElementById('reductionBarWrap');
  if (fill) fill.style.width = `${Math.min(reductionPct * 2, 100)}%`; // bar spans 0–50% target
  if (wrap) {
    wrap.setAttribute('aria-valuenow', reductionPct);
    wrap.setAttribute('aria-valuemax', 50);
  }
}

/**
 * Render the achievement badges grid.
 */
function renderBadges() {
  const grid = document.getElementById('badgesGrid');
  if (!grid) return;
  const unlockedIds = calcUnlockedBadges(state.completedActions.size, state.activeDiet, state.footprint.total);
  grid.innerHTML = '';
  BADGE_DATA.forEach(badge => {
    const unlocked = unlockedIds.has(badge.id);
    const div = document.createElement('div');
    div.className  = `badge${unlocked ? ' unlocked' : ''}`;
    div.setAttribute('role', 'listitem');
    div.setAttribute('aria-label', `${badge.name} – ${unlocked ? 'Unlocked' : 'Locked: ' + badge.req}`);
    div.innerHTML  = `<i class="fa-solid ${badge.icon}" aria-hidden="true"></i>
                      <span class="badge-name">${badge.name}</span>
                      <span class="badge-req">${badge.req}</span>`;
    grid.appendChild(div);
    if (unlocked) srAnnounce(`Achievement unlocked: ${badge.name}`);
  });
}

/**
 * Render the action plan list.
 * Uses data attributes + event delegation (no inline onclick handlers).
 */
function renderActions() {
  const list = document.getElementById('actionList');
  if (!list) return;
  list.innerHTML = '';
  ACTION_DATA.forEach(action => {
    const completed = state.completedActions.has(action.id);
    const item = document.createElement('div');
    item.className = `action-item${completed ? ' completed' : ''}`;
    item.setAttribute('role', 'listitem');

    const info = document.createElement('div');
    info.className = 'action-info';
    const h4 = document.createElement('h4');
    const icon = document.createElement('i');
    icon.className = `fa-solid ${action.icon}`;
    icon.setAttribute('aria-hidden', 'true');
    h4.appendChild(icon);
    h4.appendChild(document.createTextNode(` ${action.title}`));
    const desc = document.createElement('p');
    desc.textContent = action.desc;
    const savings = document.createElement('p');
    savings.className = 'action-savings';
    savings.textContent = `💚 Saves ~${action.savings} kg CO₂/month`;
    info.appendChild(h4);
    info.appendChild(desc);
    info.appendChild(savings);

    const diffBadge = document.createElement('span');
    diffBadge.className = `action-difficulty difficulty-${action.difficulty}`;
    diffBadge.setAttribute('aria-label', `Difficulty: ${action.difficulty}`);
    diffBadge.textContent = action.difficulty;

    const btn = document.createElement('button');
    btn.className = 'btn-action';
    btn.dataset.actionId = action.id;
    btn.dataset.savings = action.savings;
    btn.setAttribute('aria-pressed', String(completed));
    btn.setAttribute('aria-label', `${completed ? 'Mark as incomplete: ' : 'Complete action: '}${action.title}`);
    btn.textContent = completed ? '✓ Done' : 'Complete';

    item.appendChild(info);
    item.appendChild(diffBadge);
    item.appendChild(btn);
    list.appendChild(item);
  });
}

/**
 * Render the log history list.
 */
function renderLogHistory() {
  const container = document.getElementById('logHistory');
  if (!container) return;
  if (state.logs.length === 0) {
    container.innerHTML = '<p class="text-muted" style="padding:1rem">No logs yet. Add activities above.</p>';
    return;
  }
  container.innerHTML = '';
  [...state.logs].reverse().forEach(log => {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.setAttribute('role', 'listitem');
    const sign = log.co2 < 0 ? '' : '+';
    div.innerHTML = `
      <span>${log.typeLabel}</span>
      <span>${log.value ?? ''}</span>
      <span class="${log.co2 < 0 ? 'text-emerald' : 'text-coral'}">${sign}${log.co2} kg CO₂</span>
      <span class="log-date">${log.date}</span>`;
    container.appendChild(div);
  });
}

/**
 * Safely set the text content of an element by ID.
 * @param {string} id
 * @param {string} text
 */
function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/**
 * Update calculator preview labels after slider/diet change.
 */
function updateCalcPreviews() {
  const { energy, transport, diet, waste } = state.footprint;
  safeSetText('preview-energy',    `≈ ${energy.toFixed(2)} Tons CO₂/yr from energy`);
  safeSetText('preview-transport', `≈ ${transport.toFixed(2)} Tons CO₂/yr from transport`);
  safeSetText('preview-diet',      `≈ ${diet.toFixed(2)} Tons CO₂/yr from diet`);
  safeSetText('preview-waste',     `≈ ${waste.toFixed(2)} Tons CO₂/yr from waste`);
}

// =============================================================
// 7. CORE STATE UPDATE (triggers all re-renders)
// =============================================================

/**
 * Recalculate state from current form inputs and re-render the UI.
 */
function updateState() {
  const energyVal    = parseInt(document.getElementById('slider-energy')?.value    || 300);
  const transportVal = parseInt(document.getElementById('slider-transport')?.value || 150);
  const wasteVal     = parseInt(document.getElementById('slider-waste')?.value     || 3);

  state.footprint   = calcFootprint(energyVal, transportVal, state.activeDiet, wasteVal);
  state.ecoScore    = calcEcoScore(state.footprint.total, state.completedActions.size);
  state.reductionPct= calcReductionPct(state.footprint.total);

  updateCalcPreviews();
  renderDashboard();
  renderBadges();
  refreshBreakdownChart();
}

// =============================================================
// 8. ACTION TOGGLE
// =============================================================

/**
 * Toggle a reduction action on/off and update state.
 * Called via event delegation on the action list.
 * @param {string} actionId
 * @param {number} savings   - kg CO₂ saved per month.
 * @param {HTMLElement} btn
 */
function handleActionToggle(actionId, savings, btn) {
  const item      = btn.closest('.action-item');
  const completed = state.completedActions.has(actionId);

  if (completed) {
    state.completedActions.delete(actionId);
    state.co2Saved = Math.max(0, state.co2Saved - savings);
    item.classList.remove('completed');
    btn.textContent = 'Complete';
    btn.setAttribute('aria-pressed', 'false');
    const action = ACTION_DATA.find(a => a.id === actionId);
    btn.setAttribute('aria-label', `Complete action: ${action?.title}`);
  } else {
    state.completedActions.add(actionId);
    state.co2Saved += savings;
    item.classList.add('completed');
    btn.textContent = '✓ Done';
    btn.setAttribute('aria-pressed', 'true');
    const action = ACTION_DATA.find(a => a.id === actionId);
    btn.setAttribute('aria-label', `Mark as incomplete: ${action?.title}`);
    srAnnounce(`Action completed: ${action?.title}. ${savings} kg CO₂ saved.`);
  }

  updateState();
}

// Keep window.toggleAction for backward-compatibility (unused in v2 but retained)
window.toggleAction = handleActionToggle;

// =============================================================
// 9. LOG FORM
// =============================================================

/**
 * Handle activity log form submission.
 * @param {Event} e
 */
function handleLogSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById('log-error');

  const date  = sanitiseInput(document.getElementById('log-date')?.value  || '');
  const type  = sanitiseInput(document.getElementById('log-type')?.value  || '');
  const value = document.getElementById('log-value')?.value ?? '';

  const error = validateLogEntry(date, type, value);
  if (error) {
    if (errorEl) errorEl.textContent = error;
    srAnnounce(`Form error: ${error}`);
    return;
  }
  if (errorEl) errorEl.textContent = '';

  const TYPE_LABELS = { driving: '🚗 Driving', energy: '⚡ Energy', flight: '✈️ Flight', meatless: '🥗 Meatless Day', recycled: '♻️ Recycled' };
  const numVal = parseFloat(value) || 0;
  const co2    = calcLogCo2(type, numVal);

  const entry = { date, type, typeLabel: TYPE_LABELS[type] || type, value: numVal || null, co2 };
  state.logs.push(entry);
  localStorage.setItem('ecoLogs', JSON.stringify(state.logs));

  renderLogHistory();
  refreshTrendChart();
  srAnnounce(`Activity logged: ${entry.typeLabel} on ${date}. ${co2} kg CO₂.`);
  e.target.reset();
}

// =============================================================
// 10. NAVIGATION
// =============================================================

/**
 * Switch the visible tab/section.
 * @param {string} targetId – The section element ID to show.
 */
function switchTab(targetId) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active-view');
    v.hidden = true;
  });
  document.querySelectorAll('.nav-links li').forEach(l => {
    l.classList.remove('active');
    l.setAttribute('aria-selected', 'false');
  });

  const targetSection = document.getElementById(targetId);
  const targetLink    = document.querySelector(`[data-target="${targetId}"]`);

  if (targetSection) { targetSection.classList.add('active-view'); targetSection.hidden = false; }
  if (targetLink)    { targetLink.classList.add('active'); targetLink.setAttribute('aria-selected', 'true'); }

  // Move focus to main content for keyboard users
  document.getElementById('main-content')?.focus({ preventScroll: true });
}

// =============================================================
// 11. AI ADVISOR
// =============================================================

/**
 * Add a message bubble to the chat window.
 * Sanitises user content before insertion.
 * @param {string} text
 * @param {'ai'|'user'} sender
 */
function addMessage(text, sender) {
  const win = document.getElementById('chatWindow');
  if (!win) return;
  const div = document.createElement('div');
  div.className = `message ${sender}`;
  div.setAttribute('role', 'article');
  const p = document.createElement('p');
  // Safe: only sets textContent for user messages
  if (sender === 'user') {
    p.textContent = text;
  } else {
    // AI responses can use simple bold formatting
    p.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/<(?!strong|\/strong)[^>]+>/g, '');
  }
  div.appendChild(p);
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

function addTypingIndicator() {
  const win = document.getElementById('chatWindow');
  if (!win) return;
  const div = document.createElement('div');
  div.className = 'message ai';
  div.id = 'typingIndicator';
  div.setAttribute('aria-label', 'AI is typing');
  div.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

function removeTypingIndicator() {
  document.getElementById('typingIndicator')?.remove();
}

/**
 * Build the system prompt with live user carbon profile.
 * @returns {string}
 */
function buildSystemPrompt() {
  const { total, energy, transport, diet, waste } = state.footprint;
  return `You are EcoSphere's expert AI Eco-Advisor. Be concise, warm, and encouraging.
User Carbon Profile:
- Total: ${total} Tons CO₂/yr (global avg: 4.7 Tons)
- Energy: ${energy} Tons | Transport: ${transport} Tons | Diet: ${diet} Tons | Waste: ${waste} Tons
- Eco-Score: ${state.ecoScore}/100 | CO₂ Saved: ${state.co2Saved} kg
Provide helpful, specific, actionable advice tailored to this profile.`;
}

/**
 * Simulated AI response engine for demonstration without a real API key.
 * @param {string} query
 * @returns {string} Simulated response text.
 */
function simulatedAiResponse(query) {
  const q = query.toLowerCase();
  const { total, transport, energy } = state.footprint;
  const highest = transport > energy ? 'transport' : 'energy';

  if (q.includes('analyze') || q.includes('profile')) {
    return `**Profile Analysis:**\n\nYour total footprint is **${total} Tons CO₂/yr**. Your highest emission source is **${highest}** (${state.footprint[highest].toFixed(2)} Tons).\n\n${total < 4.7 ? '✅ You are below the global average — excellent!' : '⚠️ You are above the global average. Tackling ' + highest + ' first will have the biggest impact.'}\n\nEco-Score: **${state.ecoScore}/100**`;
  }
  if (q.includes('suggest') || q.includes('action')) {
    return `**Top 3 Personalised Actions:**\n\n1. 🚲 **Bike or transit twice a week** — saves ~15 kg CO₂/month\n2. 🌱 **Try meatless Mondays** — saves ~3 kg CO₂/week\n3. 💡 **Switch to LED lighting** — saves ~5 kg CO₂/month`;
  }
  if (q.includes('offset')) {
    return `**Carbon Offsets Explained:**\n\nCarbon offsets let you compensate for emissions by funding projects that reduce CO₂ elsewhere — like reforestation or renewable energy. However, **reducing your own emissions first is always better**. Use offsets for unavoidable emissions like long-haul flights.`;
  }
  if (q.includes('transport') || q.includes('car')) {
    return `**Reducing Transport Emissions:**\n\nYour transport footprint is **${state.footprint.transport.toFixed(2)} Tons/yr**.\n\n- 🚌 Use public transit 2×/week\n- 🚲 Cycle for trips under 5 miles\n- 🚗 If driving, carpool whenever possible\n- ⚡ Consider switching to an EV next purchase`;
  }
  return `**Eco-Advisor Response:**\n\nBased on your profile (${total} Tons CO₂/yr, Eco-Score ${state.ecoScore}/100), the best next step is to focus on your **${highest}** emissions. Try completing actions in the Reduce tab — each completed action boosts your Eco-Score! 🌿`;
}

/**
 * Handle sending a chat message, with live Gemini API or simulation fallback.
 * @param {string|null} preset – Optional preset prompt text.
 */
async function handleChatSend(preset = null) {
  const inputEl = document.getElementById('chatInput');
  const raw     = preset ?? inputEl?.value ?? '';
  const text    = sanitiseInput(raw);
  if (!text) return;

  addMessage(text, 'user');
  if (inputEl) inputEl.value = '';
  addTypingIndicator();

  if (state.apiKey) {
    // Live Gemini API call
    try {
      const systemPrompt = buildSystemPrompt();
      const fullPrompt   = `${systemPrompt}\n\nUser: ${text}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.apiKey}`;
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      removeTypingIndicator();
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response received.';
      addMessage(aiText, 'ai');
    } catch (err) {
      removeTypingIndicator();
      addMessage(`❌ API Error: ${sanitiseInput(err.message)}. Falling back to simulation.`, 'ai');
      addMessage(simulatedAiResponse(text), 'ai');
    }
  } else {
    // Simulation mode
    setTimeout(() => {
      removeTypingIndicator();
      addMessage(simulatedAiResponse(text), 'ai');
    }, 1200);
  }
}

// =============================================================
// 12. SETTINGS MODAL
// =============================================================

function openSettings() {
  const modal = document.getElementById('settingsModal');
  const apiEl = document.getElementById('geminiApiKey');
  if (!modal) return;
  if (apiEl) apiEl.value = state.apiKey;
  modal.hidden = false;
  document.getElementById('openSettingsBtn')?.setAttribute('aria-expanded', 'true');
  apiEl?.focus();
}

function closeSettings() {
  const modal = document.getElementById('settingsModal');
  if (!modal) return;
  modal.hidden = true;
  document.getElementById('openSettingsBtn')?.setAttribute('aria-expanded', 'false');
  document.getElementById('openSettingsBtn')?.focus();
}

function saveSettings() {
  const raw = document.getElementById('geminiApiKey')?.value ?? '';
  const key = raw.trim();
  localStorage.setItem('geminiApiKey', key);
  state.apiKey = key;
  closeSettings();

  const badge = document.getElementById('ai-status');
  if (badge) {
    badge.textContent = key ? 'Live Gemini API' : 'Simulation Mode';
    badge.className   = `status-badge${key ? ' live' : ''}`;
  }
  srAnnounce(key ? 'Gemini API key saved. Live mode enabled.' : 'API key cleared. Simulation mode active.');
}

// =============================================================
// 13. KEYBOARD TRAPPING FOR MODAL (Accessibility)
// =============================================================
document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('settingsModal');
  if (!modal || modal.hidden) return;
  if (e.key === 'Escape') closeSettings();
  if (e.key === 'Tab') {
    const focusable = modal.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

// =============================================================
// 14. EVENT BINDING
// =============================================================

function bindEvents() {
  // Navigation
  document.querySelectorAll('.nav-links li').forEach(li => {
    li.addEventListener('click',   () => switchTab(li.dataset.target));
    li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchTab(li.dataset.target); } });
  });

  // Calculator sliders
  const bindSlider = (id, valId, ariaId) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      safeSetText(valId, el.value);
      el.setAttribute('aria-valuenow', el.value);
      updateState();
    });
  };
  bindSlider('slider-energy',    'val-energy',    'slider-energy');
  bindSlider('slider-transport', 'val-transport', 'slider-transport');
  bindSlider('slider-waste',     'val-waste',     'slider-waste');

  // Diet buttons
  document.querySelectorAll('#diet-group .btn-select').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#diet-group .btn-select').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      state.activeDiet = btn.dataset.value;
      updateState();
    });
  });

  // Action list — event delegation (no inline onclick)
  document.getElementById('actionList')?.addEventListener('click', e => {
    const btn = e.target.closest('.btn-action');
    if (!btn) return;
    handleActionToggle(btn.dataset.actionId, Number(btn.dataset.savings), btn);
  });

  // Log form
  document.getElementById('logForm')?.addEventListener('submit', handleLogSubmit);
  document.getElementById('sendBtn')?.addEventListener('click', () => handleChatSend());
  document.getElementById('chatInput')?.addEventListener('keypress', e => { if (e.key === 'Enter') handleChatSend(); });
  document.querySelectorAll('.prompt-btn').forEach(btn => {
    btn.addEventListener('click', () => handleChatSend(btn.textContent.trim()));
  });

  // Settings
  document.getElementById('openSettingsBtn')?.addEventListener('click', openSettings);
  document.getElementById('closeModalBtn')?.addEventListener('click',   closeSettings);
  document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);

  // Run tests button
  document.getElementById('runTestsBtn')?.addEventListener('click', () => {
    if (typeof window.runTests === 'function') window.runTests();
  });
}

// =============================================================
// 15. INITIALISATION
// =============================================================

window.addEventListener('DOMContentLoaded', () => {
  // Set today's date as default for log form
  const logDate = document.getElementById('log-date');
  if (logDate) logDate.value = new Date().toISOString().split('T')[0];

  // Set AI status badge
  const badge = document.getElementById('ai-status');
  if (badge && state.apiKey) {
    badge.textContent = 'Live Gemini API';
    badge.classList.add('live');
  }

  // Init charts
  initBreakdownChart();
  initTrendChart();

  // Render dynamic content
  renderActions();
  renderLogHistory();

  // Bind all event listeners
  bindEvents();

  // Initial calculation
  updateState();
});

// Export pure functions for unit testing (accessed via window in browser context)
window.__ECOSPHERE_INTERNALS__ = {
  calcFootprint, calcEcoScore, calcReductionPct,
  calcUnlockedBadges, sanitiseInput, validateLogEntry, calcLogCo2
};
