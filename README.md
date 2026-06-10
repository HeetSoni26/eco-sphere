# EcoSphere: Carbon Footprint Awareness Platform

EcoSphere is a beautifully designed, high-fidelity Carbon Footprint Awareness Platform built to help individuals calculate, track, and systematically reduce their environmental impact. 

This repository was specifically built for the **Hack2Skill Prompt Wars Hackathon**. It focuses heavily on ultra-fast execution, zero-dependency efficiency, and an integrated AI Prompt workflow using Google Gemini.

---

## 🌍 Chosen Vertical
**Carbon Footprint Awareness Platform**
We chose this vertical to design a solution that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.

---

## 🧠 Approach and Logic

The platform is designed as a **dynamic, gamified Single-Page Application (SPA)** that revolves around behavioral change and logical decision making based on the user's context.

### 1. Context Acquisition (The Calculator)
Users input their real-world data (Energy in kWh, Transport in miles, Diet choices, and Waste generation). 
- **Logic**: We use standardized emission factors (e.g., `0.0004 Tons CO2 per kWh`) to convert raw inputs into an annualized Carbon Footprint profile.

### 2. Gamified Reduction (Action Plan)
Instead of just showing a scary number, EcoSphere generates an actionable checklist.
- **Logic**: Every time a user commits to an action (e.g., "Meatless Monday"), their "Eco-Score" dynamically increases, and their active Monthly CO2 Saved increases. The UI uses micro-animations and unlocks **Badges/Achievements** to reward the user's progress.

### 3. Smart Dynamic Assistant (AI Eco-Advisor)
We integrated an intelligent AI layer using Google's **Gemini 1.5 Flash API**. 
- **Logic**: The app dynamically compiles a "System Prompt + User Profile Payload" (injecting the user's exact emission metrics from the calculator) before sending it to the LLM. This enables the LLM to provide highly personalized, logical decision-making recommendations (e.g., *"Since your transport emissions are your highest source at 3.1 Tons, let's focus on carpooling..."*).

---

## ⚙️ How the Solution Works

EcoSphere is built with **pure HTML5, CSS3 (Vanilla), and JavaScript (ES6)**. It requires NO build steps, NO `npm install`, and NO heavy frameworks, ensuring maximum efficiency and a repository size well under 10 MB.

### Running the App
1. Clone this repository.
2. Open `index.html` directly in any modern web browser.
3. Use the sidebar navigation to switch between the Dashboard, Calculator, Action Plan, and AI Advisor.

### Using the Gemini AI Advisor
The app features a built-in AI Advisor. 
1. Click the **Settings Gear** icon in the top right.
2. Enter your **Gemini API Key** (this is stored securely in your browser's local storage and ONLY sent directly to Google's API endpoint).
3. Navigate to the **AI Advisor** tab and chat!
4. *Simulation Mode*: If you don't enter an API Key, the app will gracefully fallback to a simulated template engine that mimics the AI's personalized responses to showcase the intended UX.

---

## 📊 Assumptions Made
1. **Emission Factors**: We assume standard approximate global baseline values for calculations (e.g., an average meat-eater produces 2.5 Tons CO2/yr from diet, 1 mile driven produces ~0.0004 Tons CO2).
2. **User Habit Tracking**: We assume the user updates their slider settings weekly/monthly to accurately reflect their true lifestyle changes.
3. **Local Privacy**: We assume maximum user privacy is preferred, thus all state and API keys are stored purely client-side without a backend database.

---

## 🏆 Evaluation Focus Areas Addressed
- **Code Quality**: Modular vanilla JS structure, avoiding spaghetti code by separating state, DOM queries, charting, and AI logic into distinct blocks.
- **Security**: The Gemini API key is *never* hardcoded. It is injected at runtime and kept purely client-side to prevent key leaks. Input is sanitized via standard JS DOM insertion.
- **Efficiency**: Utilizing a CDN for `Chart.js` and vanilla CSS keeps the payload incredibly light (total size < 1 MB). Loads instantly.
- **Testing**: Manual UI test validation steps were utilized. The pure JS functions (`calculateFootprint`, `checkBadges`) are designed as pure functions acting on a single `state` object, making them highly predictable and easy to unit test.
- **Accessibility**: Dark mode ensures high contrast. Semantic HTML structure (e.g., `<main>`, `<nav>`, `<section>`) is used. Buttons and sliders are keyboard-accessible.

---
*Built with ❤️ using Google Antigravity IDE.*
