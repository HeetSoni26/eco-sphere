/**
 * @file tests.js
 * @description EcoSphere – Comprehensive Unit Test Suite
 *
 * Tests all pure logic functions exported via window.__ECOSPHERE_INTERNALS__.
 * Runs in the browser without any external test framework dependency.
 * Results are displayed in the UI (#testResults) and in the console.
 *
 * Test Categories:
 *   1. calcFootprint      – Emission calculation accuracy
 *   2. calcEcoScore       – Score derivation bounds and logic
 *   3. calcReductionPct   – Reduction percentage calculation
 *   4. calcUnlockedBadges – Badge unlock conditions
 *   5. sanitiseInput      – XSS prevention
 *   6. validateLogEntry   – Form validation logic
 *   7. calcLogCo2         – Activity CO2 estimation
 */

'use strict';

/**
 * Lightweight test runner.
 * Renders results to #testResults and console.
 */
(function TestRunner() {

  /** @type {Array<{name:string, passed:boolean, actual:*, expected:*}>} */
  const results = [];

  /**
   * Assert equality (deep for objects/Sets).
   * @param {string} testName
   * @param {*} actual
   * @param {*} expected
   */
  function expect(testName, actual, expected) {
    let passed;
    if (typeof expected === 'object' && expected !== null) {
      passed = JSON.stringify(actual) === JSON.stringify(expected);
    } else {
      passed = actual === expected;
    }
    results.push({ name: testName, passed, actual, expected });
    const sym = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[EcoSphere Tests] ${sym}: ${testName}`, passed ? '' : `\n  Expected: ${JSON.stringify(expected)}\n  Got:      ${JSON.stringify(actual)}`);
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
   * Assert a value is within a numeric range (inclusive).
   * @param {string} testName
   * @param {number} actual
   * @param {number} min
   * @param {number} max
   */
  function expectRange(testName, actual, min, max) {
    const passed = actual >= min && actual <= max;
    results.push({ name: testName, passed, actual, expected: `[${min}, ${max}]` });
    const sym = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[EcoSphere Tests] ${sym}: ${testName}`, passed ? '' : `\n  Expected range: [${min}, ${max}]\n  Got: ${actual}`);
  }

  /**
   * Render all results into the DOM.
   */
  function renderResults() {
    const container = document.getElementById('testResults');
    if (!container) return;
    container.innerHTML = '';

    results.forEach(r => {
      const div = document.createElement('div');
      div.className = r.passed ? 'test-pass' : 'test-fail';
      div.textContent = `${r.passed ? '✅' : '❌'} ${r.name}${r.passed ? '' : ` — Expected: ${r.expected}, Got: ${r.actual}`}`;
      container.appendChild(div);
    });

    const total  = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;

    const summary = document.createElement('div');
    summary.className = `test-summary ${failed === 0 ? 'all-pass' : 'some-fail'}`;
    summary.textContent = `Results: ${passed}/${total} passed${failed > 0 ? ` · ${failed} failed` : ' 🎉'}`;
    container.appendChild(summary);
    console.log(`[EcoSphere Tests] ─────── ${passed}/${total} passed ───────`);
  }

  /**
   * Main test execution function. Called by the "Run All Tests" button
   * and also exposed as window.runTests for external invocation.
   */
  window.runTests = function runTests() {
    results.length = 0; // reset

    // Wait for app internals to be available
    const fns = window.__ECOSPHERE_INTERNALS__;
    if (!fns) {
      console.error('[EcoSphere Tests] __ECOSPHERE_INTERNALS__ not available. Ensure app.js is loaded first.');
      return;
    }

    const {
      calcFootprint, calcEcoScore, calcReductionPct,
      calcUnlockedBadges, sanitiseInput, validateLogEntry, calcLogCo2
    } = fns;

    // ─────────────────────────────────────────────────────────────
    // SUITE 1: calcFootprint
    // ─────────────────────────────────────────────────────────────
    console.log('[EcoSphere Tests] ── Suite 1: calcFootprint ──');

    const fp1 = calcFootprint(0, 0, 'avg', 0);
    expect('calcFootprint: zero inputs give diet-only total', fp1.total, 2.5);

    const fp2 = calcFootprint(300, 150, 'avg', 3);
    expectRange('calcFootprint: typical profile total is between 4 and 10 Tons', fp2.total, 4, 10);
    expectRange('calcFootprint: energy component > 0 for 300 kWh/mo', fp2.energy, 0.5, 3);
    expectRange('calcFootprint: transport component > 0 for 150 miles/wk', fp2.transport, 2, 5);
    expect('calcFootprint: diet is 2.5 for avg', fp2.diet, 2.5);

    const fp3 = calcFootprint(0, 0, 'vegan', 0);
    expect('calcFootprint: vegan diet gives 1.5 Tons diet', fp3.diet, 1.5);

    const fp4 = calcFootprint(0, 0, 'high', 0);
    expect('calcFootprint: meat-heavy diet gives 3.3 Tons diet', fp4.diet, 3.3);

    const fp5 = calcFootprint(1500, 1000, 'high', 10);
    expectRange('calcFootprint: maximum inputs give very high total (>15)', fp5.total, 15, 70);

    expectTrue('calcFootprint: returns an object with total key', typeof fp2.total === 'number');
    expectTrue('calcFootprint: energy is non-negative', fp2.energy >= 0);
    expectTrue('calcFootprint: waste is non-negative for positive bags', fp2.waste >= 0);

    // ─────────────────────────────────────────────────────────────
    // SUITE 2: calcEcoScore
    // ─────────────────────────────────────────────────────────────
    console.log('[EcoSphere Tests] ── Suite 2: calcEcoScore ──');

    expectRange('calcEcoScore: score is between 0 and 100 for typical inputs', calcEcoScore(7, 0), 0, 100);
    expectRange('calcEcoScore: score is between 0 and 100 for extreme inputs', calcEcoScore(50, 0), 0, 100);
    expectRange('calcEcoScore: score is between 0 and 100 for best case', calcEcoScore(1.5, 9), 0, 100);

    const scoreHigh = calcEcoScore(2, 5);
    const scoreLow  = calcEcoScore(14, 0);
    expectTrue('calcEcoScore: lower footprint + more actions yields higher score', scoreHigh > scoreLow);

    const s0 = calcEcoScore(1.5, 0);
    const s9 = calcEcoScore(1.5, 9);
    expectTrue('calcEcoScore: more actions increase score', s9 >= s0);

    expectTrue('calcEcoScore: result is an integer', Number.isInteger(calcEcoScore(5, 2)));

    // ─────────────────────────────────────────────────────────────
    // SUITE 3: calcReductionPct
    // ─────────────────────────────────────────────────────────────
    console.log('[EcoSphere Tests] ── Suite 3: calcReductionPct ──');

    expectRange('calcReductionPct: result is always 0–100', calcReductionPct(8), 0, 100);
    expectRange('calcReductionPct: zero footprint gives ~100%', calcReductionPct(0), 90, 100);
    expectRange('calcReductionPct: baseline footprint gives ~0%', calcReductionPct(16), 0, 5);
    const pLow  = calcReductionPct(4);
    const pHigh = calcReductionPct(2);
    expectTrue('calcReductionPct: lower footprint gives higher reduction %', pHigh > pLow);
    expectTrue('calcReductionPct: result is a number', typeof calcReductionPct(5) === 'number');

    // ─────────────────────────────────────────────────────────────
    // SUITE 4: calcUnlockedBadges
    // ─────────────────────────────────────────────────────────────
    console.log('[EcoSphere Tests] ── Suite 4: calcUnlockedBadges ──');

    const b0 = calcUnlockedBadges(0, 'avg', 10);
    expectTrue('calcUnlockedBadges: no badges with 0 actions, avg diet, high footprint', b0.size === 0);

    const b1 = calcUnlockedBadges(1, 'avg', 10);
    expectTrue('calcUnlockedBadges: eco-starter unlocked after 1 action', b1.has('eco-starter'));

    const b3 = calcUnlockedBadges(3, 'avg', 10);
    expectTrue('calcUnlockedBadges: action-hero unlocked after 3 actions', b3.has('action-hero'));

    const bVeg = calcUnlockedBadges(0, 'veg', 10);
    expectTrue('calcUnlockedBadges: green-eater unlocked for vegetarian', bVeg.has('green-eater'));

    const bVegan = calcUnlockedBadges(0, 'vegan', 10);
    expectTrue('calcUnlockedBadges: vegan-champion unlocked for vegan', bVegan.has('vegan-champion'));

    const bLow = calcUnlockedBadges(0, 'avg', 7);
    expectTrue('calcUnlockedBadges: low-footprint badge unlocked under 8 Tons', bLow.has('low-footprint'));

    const bHero = calcUnlockedBadges(0, 'avg', 3.5);
    expectTrue('calcUnlockedBadges: climate-hero badge unlocked under 4 Tons', bHero.has('climate-hero'));

    expectTrue('calcUnlockedBadges: returns a Set', calcUnlockedBadges(0, 'avg', 10) instanceof Set);

    // ─────────────────────────────────────────────────────────────
    // SUITE 5: sanitiseInput
    // ─────────────────────────────────────────────────────────────
    console.log('[EcoSphere Tests] ── Suite 5: sanitiseInput ──');

    expect('sanitiseInput: strips basic script tag', sanitiseInput('<script>alert(1)</script>'), 'alert(1)');
    expect('sanitiseInput: strips img onerror XSS', sanitiseInput('<img src=x onerror=alert(1)>'), '');
    expect('sanitiseInput: preserves clean plain text', sanitiseInput('Hello World'), 'Hello World');
    expect('sanitiseInput: trims leading/trailing whitespace', sanitiseInput('  hello  '), 'hello');
    expect('sanitiseInput: returns empty string for non-string input', sanitiseInput(123), '');
    expect('sanitiseInput: returns empty string for null', sanitiseInput(null), '');
    expectTrue('sanitiseInput: truncates input over 500 chars', sanitiseInput('a'.repeat(600)).length <= 500);
    expect('sanitiseInput: handles empty string', sanitiseInput(''), '');

    // ─────────────────────────────────────────────────────────────
    // SUITE 6: validateLogEntry
    // ─────────────────────────────────────────────────────────────
    console.log('[EcoSphere Tests] ── Suite 6: validateLogEntry ──');

    expect('validateLogEntry: returns error when date is missing', validateLogEntry('', 'driving', '30'), 'Please select a date.');
    expect('validateLogEntry: returns error when type is missing', validateLogEntry('2025-01-01', '', '30'), 'Please select an activity type.');
    expect('validateLogEntry: returns error when value is missing for driving', validateLogEntry('2025-01-01', 'driving', ''), 'Please enter a valid quantity.');
    expect('validateLogEntry: meatless day needs no quantity', validateLogEntry('2025-01-01', 'meatless', ''), null);
    expect('validateLogEntry: recycled needs no quantity', validateLogEntry('2025-01-01', 'recycled', ''), null);
    expect('validateLogEntry: valid driving entry returns null', validateLogEntry('2025-01-01', 'driving', '30'), null);
    expect('validateLogEntry: valid energy entry returns null', validateLogEntry('2025-06-01', 'energy', '50'), null);
    expect('validateLogEntry: negative quantity is invalid', validateLogEntry('2025-01-01', 'driving', '-5'), 'Please enter a valid quantity.');

    // ─────────────────────────────────────────────────────────────
    // SUITE 7: calcLogCo2
    // ─────────────────────────────────────────────────────────────
    console.log('[EcoSphere Tests] ── Suite 7: calcLogCo2 ──');

    expect('calcLogCo2: driving 100 miles = 40.4 kg CO₂', calcLogCo2('driving', 100), 40.4);
    expect('calcLogCo2: energy 100 kWh = 38.5 kg CO₂', calcLogCo2('energy', 100), 38.5);
    expect('calcLogCo2: meatless day saves -3 kg CO₂', calcLogCo2('meatless', 0), -3);
    expect('calcLogCo2: recycling saves -1.5 kg CO₂', calcLogCo2('recycled', 0), -1.5);
    expect('calcLogCo2: flight 2 hours = 180 kg CO₂', calcLogCo2('flight', 2), 180);
    expect('calcLogCo2: unknown type returns 0', calcLogCo2('unknown', 99), 0);
    expectTrue('calcLogCo2: result is a number', typeof calcLogCo2('driving', 50) === 'number');

    // ─────────────────────────────────────────────────────────────
    // RENDER RESULTS
    // ─────────────────────────────────────────────────────────────
    renderResults();
  };

  // Auto-run tests silently in console on page load for CI-style validation
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (window.__ECOSPHERE_INTERNALS__) {
        console.log('[EcoSphere Tests] Auto-running test suite...');
        window.runTests();
      }
    }, 300);
  });

})();
