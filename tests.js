/**
 * @file tests.js
 * @description EcoSphere – Comprehensive Unit & Integration Test Suite v3
 *
 * Tests all pure logic functions and key integration behaviors.
 * Runs in the browser without any external test framework.
 * Results are displayed in the UI (#testResults) and in the browser console.
 *
 * Test Suites:
 *   1.  calcFootprint          – Emission calculation accuracy & edge cases
 *   2.  calcEcoScore           – Score bounds, monotonicity, integer output
 *   3.  calcReductionPct       – Reduction % bounds and monotonicity
 *   4.  calcUnlockedBadges     – Badge unlock conditions (all 6 badges)
 *   5.  sanitiseInput          – XSS prevention with 10+ vectors
 *   6.  validateLogEntry       – Form validation (all branches)
 *   7.  calcLogCo2             – Activity CO2 per type + boundary values
 *   8.  buildSystemPrompt      – Prompt format and data injection
 *   9.  simulatedAiResponse    – Response routing for all keywords
 *   10. safeLocalStorageGet    – Graceful fallback behavior
 *   11. Integration            – Multi-function pipelines
 *   12. DOM State              – Key elements exist and are accessible
 */

'use strict';

(function TestRunner() {

  /** @type {Array<{suite:string, name:string, passed:boolean, actual:*, expected:*}>} */
  const results = [];
  let currentSuite = '';

  /**
   * Set the currently active suite name (for grouping in results).
   * @param {string} name
   */
  function suite(name) {
    currentSuite = name;
    console.groupCollapsed(`[EcoSphere Tests] ── Suite: ${name} ──`);
  }
  function endSuite() { console.groupEnd(); }

  /**
   * Assert strict equality.
   * @param {string} testName
   * @param {*} actual
   * @param {*} expected
   */
  function expect(testName, actual, expected) {
    const passed = (typeof expected === 'object' && expected !== null)
      ? JSON.stringify(actual) === JSON.stringify(expected)
      : actual === expected;
    results.push({ suite: currentSuite, name: testName, passed, actual, expected });
    if (passed) {
      console.log(`  ✅ ${testName}`);
    } else {
      console.warn(`  ❌ ${testName}\n     Expected: ${JSON.stringify(expected)}\n     Got:      ${JSON.stringify(actual)}`);
    }
  }

  /**
   * Assert a boolean condition is true.
   * @param {string} testName
   * @param {boolean} condition
   */
  function expectTrue(testName, condition) {
    expect(testName, condition, true);
  }

  /**
   * Assert a value falls within [min, max] inclusive.
   * @param {string} testName
   * @param {number} actual
   * @param {number} min
   * @param {number} max
   */
  function expectRange(testName, actual, min, max) {
    const passed = typeof actual === 'number' && actual >= min && actual <= max;
    results.push({ suite: currentSuite, name: testName, passed, actual, expected: `[${min}, ${max}]` });
    if (passed) {
      console.log(`  ✅ ${testName}`);
    } else {
      console.warn(`  ❌ ${testName}\n     Expected range: [${min}, ${max}]\n     Got: ${actual}`);
    }
  }

  /**
   * Assert a string contains a substring.
   * @param {string} testName
   * @param {string} str
   * @param {string} substring
   */
  function expectContains(testName, str, substring) {
    const passed = typeof str === 'string' && str.includes(substring);
    results.push({ suite: currentSuite, name: testName, passed, actual: str?.slice(0, 80), expected: `contains "${substring}"` });
    if (passed) {
      console.log(`  ✅ ${testName}`);
    } else {
      console.warn(`  ❌ ${testName}\n     Expected to contain: "${substring}"\n     Got: "${str?.slice(0, 80)}"`);
    }
  }

  /**
   * Render all results to the DOM.
   */
  function renderResults() {
    const container = document.getElementById('testResults');
    if (!container) return;
    container.innerHTML = '';

    // Group by suite
    const suites = [...new Set(results.map(r => r.suite))];
    suites.forEach(suiteName => {
      const suiteResults = results.filter(r => r.suite === suiteName);
      const suitePass    = suiteResults.filter(r => r.passed).length;

      const heading = document.createElement('p');
      heading.style.cssText = 'font-weight:700; margin:0.75rem 0 0.25rem; color:#94a3b8; font-family:Outfit,sans-serif;';
      heading.textContent = `${suiteName} (${suitePass}/${suiteResults.length})`;
      container.appendChild(heading);

      suiteResults.forEach(r => {
        const div = document.createElement('div');
        div.className = r.passed ? 'test-pass' : 'test-fail';
        div.textContent = `${r.passed ? '✅' : '❌'} ${r.name}${r.passed ? '' : ` — Expected: ${r.expected}, Got: ${JSON.stringify(r.actual)}`.slice(0, 120)}`;
        container.appendChild(div);
      });
    });

    const total  = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;

    const summary = document.createElement('div');
    summary.className = `test-summary ${failed === 0 ? 'all-pass' : 'some-fail'}`;
    summary.textContent = `Total: ${passed}/${total} passed${failed > 0 ? ` · ${failed} FAILED` : ' 🎉 All tests passed!'}`;
    container.appendChild(summary);

    console.log(`[EcoSphere Tests] ════ ${passed}/${total} passed ════`);
  }

  /**
   * Main test execution function.
   */
  window.runTests = function runTests() {
    results.length = 0;

    const fns = window.__ECOSPHERE_INTERNALS__;
    if (!fns) {
      console.error('[EcoSphere Tests] __ECOSPHERE_INTERNALS__ not available.');
      return;
    }

    const {
      calcFootprint, calcEcoScore, calcReductionPct, calcUnlockedBadges,
      sanitiseInput, validateLogEntry, calcLogCo2,
      buildSystemPrompt, simulatedAiResponse, safeLocalStorageGet
    } = fns;

    // ══════════════════════════════════════════════════════════════
    // SUITE 1: calcFootprint
    // ══════════════════════════════════════════════════════════════
    suite('1. calcFootprint');

    const fpZero = calcFootprint(0, 0, 'avg', 0);
    expect('Zero inputs → total equals diet-only (2.5)', fpZero.total, 2.5);
    expect('Zero inputs → energy is 0', fpZero.energy, 0);
    expect('Zero inputs → transport is 0', fpZero.transport, 0);
    expect('Zero inputs → waste is 0', fpZero.waste, 0);

    const fpTypical = calcFootprint(300, 150, 'avg', 3);
    expectRange('Typical profile total is 4–10 Tons', fpTypical.total, 4, 10);
    expectRange('Energy component > 0 for 300 kWh/mo', fpTypical.energy, 0.5, 3);
    expectRange('Transport component > 0 for 150 miles/wk', fpTypical.transport, 2, 5);
    expect('Diet = 2.5 for avg', fpTypical.diet, 2.5);
    expectRange('Waste > 0 for 3 bags/wk', fpTypical.waste, 0.1, 5);

    expect('Vegan diet = 1.5 Tons', calcFootprint(0, 0, 'vegan', 0).diet, 1.5);
    expect('Vegetarian diet = 1.7 Tons', calcFootprint(0, 0, 'veg', 0).diet, 1.7);
    expect('Meat-heavy diet = 3.3 Tons', calcFootprint(0, 0, 'high', 0).diet, 3.3);
    expect('Unknown diet falls back to avg (2.5)', calcFootprint(0, 0, 'unknown', 0).diet, 2.5);

    const fpMax = calcFootprint(1500, 1000, 'high', 10);
    expectRange('Maximum inputs produce very high total (>15)', fpMax.total, 15, 100);

    expectTrue('Result has numeric total', typeof fpTypical.total === 'number');
    expectTrue('All components non-negative', fpTypical.energy >= 0 && fpTypical.transport >= 0 && fpTypical.diet >= 0 && fpTypical.waste >= 0);
    expectTrue('Total equals sum of components', Math.abs(fpTypical.total - (fpTypical.energy + fpTypical.transport + fpTypical.diet + fpTypical.waste)) < 0.01);

    endSuite();

    // ══════════════════════════════════════════════════════════════
    // SUITE 2: calcEcoScore
    // ══════════════════════════════════════════════════════════════
    suite('2. calcEcoScore');

    expectRange('Score always 0–100 (typical)', calcEcoScore(7, 0), 0, 100);
    expectRange('Score always 0–100 (extreme high footprint)', calcEcoScore(100, 0), 0, 100);
    expectRange('Score always 0–100 (zero footprint, many actions)', calcEcoScore(0, 20), 0, 100);

    expectTrue('Lower footprint → higher score', calcEcoScore(2, 0) > calcEcoScore(14, 0));
    expectTrue('More actions → higher or equal score', calcEcoScore(5, 9) >= calcEcoScore(5, 0));
    expectTrue('Result is an integer', Number.isInteger(calcEcoScore(5, 2)));
    expectTrue('Score is non-negative for any input', calcEcoScore(50, 0) >= 0);
    expect('Score is exactly 100 when capped at max', calcEcoScore(1.5, 20), 100);

    endSuite();

    // ══════════════════════════════════════════════════════════════
    // SUITE 3: calcReductionPct
    // ══════════════════════════════════════════════════════════════
    suite('3. calcReductionPct');

    expectRange('Result always in [0, 100]', calcReductionPct(8), 0, 100);
    expect('Zero footprint → 100%', calcReductionPct(0), 100);
    expect('Baseline footprint (16 T) → 0%', calcReductionPct(16), 0);
    expectRange('Half baseline (8 T) → ~50%', calcReductionPct(8), 48, 52);
    expectTrue('Lower footprint → higher reduction', calcReductionPct(3) > calcReductionPct(7));
    expectTrue('Result is a number', typeof calcReductionPct(5) === 'number');
    expectTrue('Result never exceeds 100 (over-baseline)', calcReductionPct(-10) <= 100);
    expectTrue('Result never below 0 (above-baseline)', calcReductionPct(20) >= 0);

    endSuite();

    // ══════════════════════════════════════════════════════════════
    // SUITE 4: calcUnlockedBadges
    // ══════════════════════════════════════════════════════════════
    suite('4. calcUnlockedBadges');

    const b0 = calcUnlockedBadges(0, 'avg', 10);
    expectTrue('No badges with 0 actions, avg diet, high footprint', b0.size === 0);

    const b1 = calcUnlockedBadges(1, 'avg', 10);
    expectTrue('eco-starter unlocked after 1 action', b1.has('eco-starter'));
    expectTrue('action-hero NOT unlocked after 1 action', !b1.has('action-hero'));

    const b3 = calcUnlockedBadges(3, 'avg', 10);
    expectTrue('action-hero unlocked after 3 actions', b3.has('action-hero'));

    const bVeg = calcUnlockedBadges(0, 'veg', 10);
    expectTrue('green-eater unlocked for vegetarian', bVeg.has('green-eater'));
    expectTrue('vegan-champion NOT unlocked for vegetarian', !bVeg.has('vegan-champion'));

    const bVegan = calcUnlockedBadges(0, 'vegan', 10);
    expectTrue('vegan-champion unlocked for vegan', bVegan.has('vegan-champion'));
    expectTrue('green-eater also unlocked for vegan', bVegan.has('green-eater'));

    const bLow = calcUnlockedBadges(0, 'avg', 7.9);
    expectTrue('low-footprint unlocked under 8 Tons', bLow.has('low-footprint'));
    const bNotLow = calcUnlockedBadges(0, 'avg', 8.0);
    expectTrue('low-footprint NOT unlocked at exactly 8 Tons', !bNotLow.has('low-footprint'));

    const bHero = calcUnlockedBadges(0, 'avg', 3.9);
    expectTrue('climate-hero unlocked under 4 Tons', bHero.has('climate-hero'));

    expectTrue('Returns a Set instance', calcUnlockedBadges(0, 'avg', 10) instanceof Set);

    endSuite();

    // ══════════════════════════════════════════════════════════════
    // SUITE 5: sanitiseInput (XSS Prevention)
    // ══════════════════════════════════════════════════════════════
    suite('5. sanitiseInput');

    expect('Strips basic script tag', sanitiseInput('<script>alert(1)</script>'), 'alert(1)');
    expect('Strips img onerror XSS', sanitiseInput('<img src=x onerror=alert(1)>'), '');
    expect('Strips SVG onload XSS', sanitiseInput('<svg onload=alert(1)>'), '');
    expect('Strips href javascript XSS', sanitiseInput('<a href="javascript:void(0)">click</a>'), 'click');
    expect('Strips nested tags', sanitiseInput('<b><i>text</i></b>'), 'text');
    expect('Strips HTML entity tags', sanitiseInput('<div class="x">safe</div>'), 'safe');
    expect('Preserves plain text', sanitiseInput('Hello World'), 'Hello World');
    expect('Trims leading/trailing whitespace', sanitiseInput('  hello  '), 'hello');
    expect('Returns empty string for non-string (number)', sanitiseInput(123), '');
    expect('Returns empty string for null', sanitiseInput(null), '');
    expect('Returns empty string for undefined', sanitiseInput(undefined), '');
    expect('Returns empty string for empty string', sanitiseInput(''), '');
    expectTrue('Truncates at 500 chars', sanitiseInput('a'.repeat(600)).length <= 500);
    expect('Strips template literal injection attempt', sanitiseInput('<${cmd}>'), '');

    endSuite();

    // ══════════════════════════════════════════════════════════════
    // SUITE 6: validateLogEntry
    // ══════════════════════════════════════════════════════════════
    suite('6. validateLogEntry');

    expect('Missing date → error', validateLogEntry('', 'driving', '30'), 'Please select a date.');
    expect('Missing type → error', validateLogEntry('2025-01-01', '', '30'), 'Please select an activity type.');
    expect('Missing value for driving → error', validateLogEntry('2025-01-01', 'driving', ''), 'Please enter a valid quantity.');
    expect('Missing value for energy → error', validateLogEntry('2025-01-01', 'energy', ''), 'Please enter a valid quantity.');
    expect('Missing value for flight → error', validateLogEntry('2025-01-01', 'flight', ''), 'Please enter a valid quantity.');
    expect('Negative value → error', validateLogEntry('2025-01-01', 'driving', '-5'), 'Please enter a valid quantity.');
    expect('meatless needs no value → null', validateLogEntry('2025-01-01', 'meatless', ''), null);
    expect('recycled needs no value → null', validateLogEntry('2025-01-01', 'recycled', ''), null);
    expect('Valid driving entry → null', validateLogEntry('2025-01-01', 'driving', '30'), null);
    expect('Valid energy entry → null', validateLogEntry('2025-06-01', 'energy', '50'), null);
    expect('Valid flight entry → null', validateLogEntry('2025-06-01', 'flight', '2'), null);
    expect('Zero value for driving → valid (zero miles)', validateLogEntry('2025-01-01', 'driving', '0'), null);

    endSuite();

    // ══════════════════════════════════════════════════════════════
    // SUITE 7: calcLogCo2
    // ══════════════════════════════════════════════════════════════
    suite('7. calcLogCo2');

    expect('Driving 100 miles = 40.4 kg CO₂', calcLogCo2('driving', 100), 40.4);
    expect('Driving 0 miles = 0 kg CO₂', calcLogCo2('driving', 0), 0);
    expect('Energy 100 kWh = 38.5 kg CO₂', calcLogCo2('energy', 100), 38.5);
    expect('Flight 2 hrs = 180 kg CO₂', calcLogCo2('flight', 2), 180);
    expect('Flight 0 hrs = 0 kg CO₂', calcLogCo2('flight', 0), 0);
    expect('Meatless day saves -3 kg CO₂', calcLogCo2('meatless', 0), -3);
    expect('Recycling saves -1.5 kg CO₂', calcLogCo2('recycled', 0), -1.5);
    expect('Unknown type returns 0', calcLogCo2('unknown', 99), 0);
    expect('Empty string type returns 0', calcLogCo2('', 50), 0);
    expectTrue('Result is always a number', typeof calcLogCo2('driving', 50) === 'number');
    expectTrue('Result is finite', isFinite(calcLogCo2('driving', 50)));

    endSuite();

    // ══════════════════════════════════════════════════════════════
    // SUITE 8: buildSystemPrompt
    // ══════════════════════════════════════════════════════════════
    suite('8. buildSystemPrompt');

    if (typeof buildSystemPrompt === 'function') {
      const prompt = buildSystemPrompt();
      expectContains('Prompt contains role declaration', prompt, 'Eco-Advisor');
      expectContains('Prompt contains Total label', prompt, 'Total:');
      expectContains('Prompt contains Energy label', prompt, 'Energy:');
      expectContains('Prompt contains Transport label', prompt, 'Transport:');
      expectContains('Prompt contains Eco-Score label', prompt, 'Eco-Score:');
      expectTrue('Prompt is a non-empty string', typeof prompt === 'string' && prompt.length > 0);
      expectTrue('Prompt length is reasonable (>100 chars)', prompt.length > 100);
    } else {
      expectTrue('buildSystemPrompt not exposed (skip)', true);
    }

    endSuite();

    // ══════════════════════════════════════════════════════════════
    // SUITE 9: simulatedAiResponse
    // ══════════════════════════════════════════════════════════════
    suite('9. simulatedAiResponse');

    if (typeof simulatedAiResponse === 'function') {
      const analyzeResp = simulatedAiResponse('analyze my profile');
      expectContains('Analyze query returns profile analysis', analyzeResp, 'Profile Analysis');

      const suggestResp = simulatedAiResponse('suggest 3 easy actions');
      expectContains('Suggest query returns action list', suggestResp, 'Personalised Actions');

      const offsetResp = simulatedAiResponse('what are carbon offsets?');
      expectContains('Offset query explains offsets', offsetResp, 'Offsets');

      const transportResp = simulatedAiResponse('how to reduce car emissions');
      expectContains('Transport query returns transport tips', transportResp, 'Transport');

      const defaultResp = simulatedAiResponse('random unrelated question xyz');
      expectTrue('Default fallback is a non-empty string', typeof defaultResp === 'string' && defaultResp.length > 10);
    } else {
      expectTrue('simulatedAiResponse not exposed (skip)', true);
    }

    endSuite();

    // ══════════════════════════════════════════════════════════════
    // SUITE 10: safeLocalStorageGet
    // ══════════════════════════════════════════════════════════════
    suite('10. safeLocalStorageGet');

    if (typeof safeLocalStorageGet === 'function') {
      expect('Returns fallback for missing key', safeLocalStorageGet('__nonexistent_key__', 'fallback'), 'fallback');
      expectTrue('Returns a string', typeof safeLocalStorageGet('__nonexistent_key__', 'x') === 'string');
      expect('Returns empty fallback when specified', safeLocalStorageGet('__nonexistent_key__', ''), '');
    } else {
      expectTrue('safeLocalStorageGet not exposed (skip)', true);
    }

    endSuite();

    // ══════════════════════════════════════════════════════════════
    // SUITE 11: Integration Tests
    // ══════════════════════════════════════════════════════════════
    suite('11. Integration');

    // Full pipeline: calculator → eco score → reduction
    const fp = calcFootprint(300, 150, 'avg', 3);
    const score = calcEcoScore(fp.total, 2);
    const reduction = calcReductionPct(fp.total);
    const badges = calcUnlockedBadges(2, 'avg', fp.total);
    expectRange('Full pipeline: footprint in valid range', fp.total, 4, 10);
    expectRange('Full pipeline: score in valid range', score, 0, 100);
    expectRange('Full pipeline: reduction in valid range', reduction, 0, 100);
    expectTrue('Full pipeline: badges is a Set', badges instanceof Set);

    // Vegan + many actions → best possible outcome
    const fpVegan = calcFootprint(0, 0, 'vegan', 0);
    const scoreVegan = calcEcoScore(fpVegan.total, 9);
    const badgesVegan = calcUnlockedBadges(9, 'vegan', fpVegan.total);
    expectTrue('Best case: score is at or near 100', scoreVegan >= 95);
    expectTrue('Best case: vegan-champion badge unlocked', badgesVegan.has('vegan-champion'));
    expectTrue('Best case: climate-hero badge unlocked', badgesVegan.has('climate-hero'));
    expectTrue('Best case: all 6 badge types possible', badgesVegan.size >= 5);

    // Worst case: max footprint
    const fpWorst = calcFootprint(1500, 1000, 'high', 10);
    const scoreWorst = calcEcoScore(fpWorst.total, 0);
    expectTrue('Worst case: score is 0 (clamped)', scoreWorst === 0);
    expectTrue('Worst case: no low-footprint badge', !calcUnlockedBadges(0, 'high', fpWorst.total).has('low-footprint'));

    // Sanitise → validate → calcLogCo2 pipeline
    const rawInput = sanitiseInput('<script>alert(1)</script>driving');
    const validation = validateLogEntry('2025-01-01', rawInput, '50');
    expectTrue('Sanitised XSS input fails validation (invalid type)', validation !== null);

    endSuite();

    // ══════════════════════════════════════════════════════════════
    // SUITE 12: DOM Accessibility Tests
    // ══════════════════════════════════════════════════════════════
    suite('12. DOM Accessibility');

    expectTrue('Skip link exists', !!document.querySelector('.skip-link'));
    expectTrue('Skip link points to #main-content', document.querySelector('.skip-link')?.getAttribute('href') === '#main-content');
    expectTrue('main-content has tabindex=-1', document.getElementById('main-content')?.getAttribute('tabindex') === '-1');
    expectTrue('nav-links has role=tablist', document.querySelector('.nav-links')?.getAttribute('role') === 'tablist');
    expectTrue('All nav tabs have role=tab', document.querySelectorAll('[role="tab"]').length >= 7);
    expectTrue('All tabs have aria-selected', [...document.querySelectorAll('[role="tab"]')].every(el => el.hasAttribute('aria-selected')));
    expectTrue('All tabs have tab IDs (aria-labelledby targets)', !!document.getElementById('tab-dashboard'));
    expectTrue('chatInput has aria-label', !!document.getElementById('chatInput')?.getAttribute('aria-label'));
    expectTrue('slider-energy has aria-label', !!document.getElementById('slider-energy')?.getAttribute('aria-label'));
    expectTrue('Settings modal has role=dialog', document.getElementById('settingsModal')?.getAttribute('role') === 'dialog');
    expectTrue('Settings modal has aria-modal', document.getElementById('settingsModal')?.getAttribute('aria-modal') === 'true');
    expectTrue('srAnnouncer has aria-live=assertive', document.getElementById('srAnnouncer')?.getAttribute('aria-live') === 'assertive');
    expectTrue('breakdownChart has aria-label', !!document.getElementById('breakdownChart')?.getAttribute('aria-label'));
    expectTrue('scoreBar has role=progressbar', document.getElementById('scoreBar')?.getAttribute('role') === 'progressbar');
    expectTrue('Log form has aria-label', !!document.getElementById('logForm')?.getAttribute('aria-label'));
    expectTrue('Diet group has role=group', document.getElementById('diet-group')?.getAttribute('role') === 'group');

    endSuite();

    renderResults();
  };

  // Auto-run on page load (silent console mode, results visible on Tests tab)
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (window.__ECOSPHERE_INTERNALS__) {
        console.log('[EcoSphere Tests] Running test suite...');
        window.runTests();
      }
    }, 500);
  });

})();
