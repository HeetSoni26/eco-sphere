# EcoSphere: Carbon Footprint Awareness Platform

> A smart, interactive platform to **Understand**, **Track**, and **Reduce** your personal carbon footprint — powered by a live Gemini AI Eco-Advisor.

---

## 🌍 Chosen Vertical
**Carbon Footprint Awareness Platform** — Designing a solution that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.

---

## 🧠 Approach and Logic

EcoSphere is a single-page web application with **zero build-step dependencies** (pure HTML/CSS/JS). The platform is structured around the three core pillars of the challenge:

### 1. Understand 📖
The **Understand** tab provides educational content on the four major emission categories (Energy, Transport, Diet, Waste), backed by IPCC data. Users learn global context: the 1.5°C Paris Agreement target, average per-capita emissions, and the impact of individual lifestyle choices.

### 2. Calculate & Track 📊
- **Calculator Tab**: Interactive sliders and diet selectors compute an annualized carbon footprint using IPCC/EPA emission factors (e.g., `0.000385 Tons CO₂ per kWh`). Results update in real-time with a Chart.js doughnut visualization.
- **Track Tab**: A daily activity logger stores entries in `localStorage` with a persistent line chart showing emission trends over time. Supports: driving, energy, flights, meatless days, and recycling.

### 3. Reduce 🌱
- **Action Plan Tab**: Categorized (Easy/Medium/Hard) reduction tasks with precise CO₂ savings estimates. Completing tasks boosts the user's **Eco-Score** and dynamically unlocks **achievement badges**.
- **AI Eco-Advisor Tab**: Powered by **Google Gemini 1.5 Flash**. The app dynamically compiles the user's live emission profile into a system prompt payload and sends it to Gemini for personalized recommendations. Falls back to a rules-based simulation engine if no API key is provided.

---

## ⚙️ How the Solution Works

### Running Locally
```bash
# No installation needed. Just clone and open!
git clone https://github.com/HeetSoni26/eco-sphere.git
cd eco-sphere
# Open index.html in any modern browser
# OR serve via Python:
python -m http.server 8080
# Then visit http://localhost:8080
```

### AI Advisor Setup (Optional)
1. Click the **⚙️ Settings** icon (top-right).
2. Enter your **Gemini API Key** — stored securely in your browser's `localStorage`.
3. Navigate to the **AI Advisor** tab to chat with your live Eco-Advisor.

> Without a key, the app uses a built-in rules-based simulation engine demonstrating the full UX.

### Running Tests
1. Navigate to the **Tests** tab (🧪 in the sidebar).
2. Click **"Run All Tests"** — a full unit test suite runs covering 50+ test cases across all core logic functions.
3. Results are displayed in the UI and also logged to the browser console.

---

## 📁 Project Structure

```
eco-sphere/
│
├── index.html    # Semantic HTML5 SPA — ARIA roles, skip links, live regions
├── index.css     # WCAG AA compliant design system — glassmorphism, responsive
├── app.js        # Core logic: state, calculator, AI advisor, charts, accessibility
├── tests.js      # 50+ unit tests covering all pure functions
└── README.md     # This file
```

---

## 🔬 Assumptions Made

| Category | Assumption |
|---|---|
| Energy emissions | `0.000385 Tons CO₂ per kWh` (global average grid, IEA 2023) |
| Transport emissions | `0.000404 Tons CO₂ per mile` (average petrol car, EPA) |
| Diet — meat-heavy | `3.3 Tons CO₂/yr` (Oxford Food & Climate Research) |
| Diet — average | `2.5 Tons CO₂/yr` |
| Diet — vegetarian | `1.7 Tons CO₂/yr` |
| Diet — vegan | `1.5 Tons CO₂/yr` |
| Waste per bag | `0.019 Tons CO₂` per bag per year |
| Global baseline | `16 Tons/yr` (US average, used for reduction % computation) |
| Flight | `90 kg CO₂ per flight hour` (economy seat, ICAO average) |

---

## 🏆 Evaluation Focus Areas

| Criterion | Implementation |
|---|---|
| **Code Quality** | Modular ES6+ with full JSDoc on every function. Single-source-of-truth state object. Pure functions separated from UI renderers. |
| **Security** | `sanitiseInput()` strips all HTML tags (XSS prevention). API key stored only in `localStorage`, never hardcoded. Keyboard trap and focus management in modal. `novalidate` with manual validation prevents leaking form data. |
| **Efficiency** | Zero npm dependencies. Chart.js via CDN. Entire codebase < 1 MB. No build step. O(n) renders. `localStorage` persistence eliminates repeat computation. |
| **Testing** | `tests.js` contains **50+ unit tests** across 7 test suites using a built-in lightweight test runner. Covers: `calcFootprint`, `calcEcoScore`, `calcReductionPct`, `calcUnlockedBadges`, `sanitiseInput`, `validateLogEntry`, `calcLogCo2`. Auto-runs on page load (console) and manually via UI. |
| **Accessibility** | WCAG AA compliant. Skip-to-content link. Full `aria-*` roles, labels, and live regions. Focus-visible outlines. Keyboard navigation for all interactive elements. Tab key trap in modal. Screen-reader announcer for dynamic updates. Mobile-responsive layout. |

---

*Built with ❤️ using Google Antigravity IDE for the Hack2Skill Prompt Wars Hackathon.*

---

## 🏆 GitHub Badges

This project is used to earn GitHub achievement badges.

### Badges Earned
- Quickdraw: Closed an issue within 5 minutes
- Pull Shark: Opened and merged pull requests
