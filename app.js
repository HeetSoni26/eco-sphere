// --- STATE MANAGEMENT ---
const state = {
    footprint: {
        energy: 0,
        transport: 0,
        diet: 0,
        waste: 0,
        total: 0
    },
    ecoScore: 40,
    co2Saved: 0,
    actionsCompleted: 0,
    apiKey: localStorage.getItem('geminiApiKey') || ''
};

// --- EMISSION FACTORS (Assumptions for calculation) ---
const FACTORS = {
    energy_kwh: 0.0004, // Tons per kWh
    transport_mile: 0.0004, // Tons per mile
    diet: { high: 3.3, avg: 2.5, veg: 1.7, vegan: 1.5 }, // Tons per year
    waste_bag: 0.02 // Tons per bag
};

// --- DOM ELEMENTS ---
const elements = {
    navLinks: document.querySelectorAll('.nav-links li'),
    views: document.querySelectorAll('.view'),
    
    // Sliders & Inputs
    slEnergy: document.getElementById('slider-energy'),
    slTransport: document.getElementById('slider-transport'),
    slWaste: document.getElementById('slider-waste'),
    valEnergy: document.getElementById('val-energy'),
    valTransport: document.getElementById('val-transport'),
    valWaste: document.getElementById('val-waste'),
    dietBtns: document.querySelectorAll('#diet-group .btn-select'),
    
    // Dashboard KPIs
    dTotal: document.getElementById('dash-total-co2'),
    dSaved: document.getElementById('dash-saved-co2'),
    dActions: document.getElementById('dash-active-actions'),
    navScore: document.getElementById('nav-eco-score'),
    
    // Actions & Badges
    actionList: document.getElementById('actionList'),
    badgesGrid: document.getElementById('badgesGrid'),
    
    // Modal
    settingsBtn: document.getElementById('openSettingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    closeBtn: document.querySelector('.close-btn'),
    apiKeyInput: document.getElementById('geminiApiKey'),
    saveBtn: document.getElementById('saveSettingsBtn'),
    
    // Chat
    chatInput: document.getElementById('chatInput'),
    sendBtn: document.getElementById('sendBtn'),
    chatWindow: document.getElementById('chatWindow'),
    aiStatus: document.getElementById('ai-status'),
    quickPrompts: document.querySelectorAll('.prompt-btn')
};

// --- CHART INITIALIZATION ---
let breakdownChart;
function initChart() {
    const ctx = document.getElementById('breakdownChart').getContext('2d');
    breakdownChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Energy', 'Transport', 'Diet', 'Waste'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#f59e0b', '#f43f5e', '#10b981', '#94a3b8'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#f8fafc' } }
            }
        }
    });
}

function updateChart() {
    if (!breakdownChart) return;
    breakdownChart.data.datasets[0].data = [
        state.footprint.energy,
        state.footprint.transport,
        state.footprint.diet,
        state.footprint.waste
    ];
    breakdownChart.update();
}

// --- CALCULATOR LOGIC ---
let activeDiet = 'avg';

function calculateFootprint() {
    const energy = parseInt(elements.slEnergy.value);
    const transport = parseInt(elements.slTransport.value);
    const waste = parseInt(elements.slWaste.value);
    
    // Annualize values
    state.footprint.energy = parseFloat((energy * 12 * FACTORS.energy_kwh).toFixed(2));
    state.footprint.transport = parseFloat((transport * 52 * FACTORS.transport_mile).toFixed(2));
    state.footprint.waste = parseFloat((waste * 52 * FACTORS.waste_bag).toFixed(2));
    state.footprint.diet = FACTORS.diet[activeDiet];
    
    state.footprint.total = parseFloat((state.footprint.energy + state.footprint.transport + state.footprint.diet + state.footprint.waste).toFixed(2));
    
    // Dynamically calculate Eco-Score (Assume 16 Tons is avg, 5 tons is ideal (score 100))
    let score = 100 - ((state.footprint.total - 5) * 5);
    state.ecoScore = Math.max(10, Math.min(100, Math.round(score))) + state.actionsCompleted * 2;
    
    updateDashboard();
    updateChart();
}

function updateDashboard() {
    elements.dTotal.innerHTML = `${state.footprint.total} <span class="unit">Tons CO₂/yr</span>`;
    elements.dSaved.innerHTML = `${state.co2Saved} <span class="unit">kg this month</span>`;
    elements.dActions.innerHTML = `${state.actionsCompleted} <span class="unit">Tasks</span>`;
    elements.navScore.innerText = `${state.ecoScore}/100`;
}

// Event Listeners for Calculator
elements.slEnergy.addEventListener('input', (e) => { elements.valEnergy.innerText = e.target.value; calculateFootprint(); });
elements.slTransport.addEventListener('input', (e) => { elements.valTransport.innerText = e.target.value; calculateFootprint(); });
elements.slWaste.addEventListener('input', (e) => { elements.valWaste.innerText = e.target.value; calculateFootprint(); });

elements.dietBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        elements.dietBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeDiet = btn.dataset.value;
        calculateFootprint();
    });
});


// --- ACTIONS & BADGES LOGIC ---
const actionData = [
    { id: 1, title: 'Meatless Monday', desc: 'Skip meat for one day to save ~3kg of CO2.', savings: 3, icon: 'fa-carrot' },
    { id: 2, title: 'LED Transition', desc: 'Replace 5 incandescent bulbs with LEDs.', savings: 5, icon: 'fa-lightbulb' },
    { id: 3, title: 'Public Transit Day', desc: 'Take a bus or train instead of driving.', savings: 8, icon: 'fa-bus' }
];

const badgesData = [
    { id: 'b1', name: 'Eco Starter', icon: 'fa-seedling', req: 1 },
    { id: 'b2', name: 'Commuter Hero', icon: 'fa-bicycle', req: 3 },
    { id: 'b3', name: 'Energy Saver', icon: 'fa-plug-circle-check', req: 5 }
];

function renderActions() {
    elements.actionList.innerHTML = '';
    actionData.forEach(action => {
        const div = document.createElement('div');
        div.className = 'action-item';
        div.innerHTML = `
            <div class="action-info">
                <h4><i class="fa-solid ${action.icon}"></i> ${action.title}</h4>
                <p>${action.desc}</p>
            </div>
            <button class="btn-action" onclick="toggleAction(this, ${action.savings})">Complete</button>
        `;
        elements.actionList.appendChild(div);
    });
}

window.toggleAction = function(btn, savings) {
    const item = btn.closest('.action-item');
    if (item.classList.contains('completed')) {
        item.classList.remove('completed');
        btn.innerText = 'Complete';
        state.actionsCompleted--;
        state.co2Saved -= savings;
    } else {
        item.classList.add('completed');
        btn.innerText = 'Completed';
        state.actionsCompleted++;
        state.co2Saved += savings;
    }
    calculateFootprint();
    checkBadges();
}

function renderBadges() {
    elements.badgesGrid.innerHTML = '';
    badgesData.forEach(badge => {
        const div = document.createElement('div');
        div.className = `badge ${state.actionsCompleted >= badge.req ? 'unlocked' : ''}`;
        div.id = badge.id;
        div.innerHTML = `<i class="fa-solid ${badge.icon}"></i><span>${badge.name}</span>`;
        elements.badgesGrid.appendChild(div);
    });
}

function checkBadges() {
    badgesData.forEach(badge => {
        const el = document.getElementById(badge.id);
        if (state.actionsCompleted >= badge.req && !el.classList.contains('unlocked')) {
            el.classList.add('unlocked');
        } else if (state.actionsCompleted < badge.req && el.classList.contains('unlocked')) {
            el.classList.remove('unlocked');
        }
    });
}

// --- NAVIGATION LOGIC ---
elements.navLinks.forEach(link => {
    link.addEventListener('click', () => {
        elements.navLinks.forEach(l => l.classList.remove('active'));
        elements.views.forEach(v => v.classList.remove('active-view'));
        
        link.classList.add('active');
        document.getElementById(link.dataset.target).classList.add('active-view');
    });
});

// --- SETTINGS MODAL ---
elements.settingsBtn.addEventListener('click', () => {
    elements.apiKeyInput.value = state.apiKey;
    elements.settingsModal.classList.add('active');
});
elements.closeBtn.addEventListener('click', () => elements.settingsModal.classList.remove('active'));
elements.saveBtn.addEventListener('click', () => {
    const key = elements.apiKeyInput.value.trim();
    localStorage.setItem('geminiApiKey', key);
    state.apiKey = key;
    elements.settingsModal.classList.remove('active');
    updateAiStatus();
});

function updateAiStatus() {
    if (state.apiKey) {
        elements.aiStatus.innerText = 'Live Gemini API';
        elements.aiStatus.classList.add('live');
    } else {
        elements.aiStatus.innerText = 'Simulation Mode';
        elements.aiStatus.classList.remove('live');
    }
}

// --- AI ADVISOR LOGIC ---
function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.innerHTML = `<p>${text}</p>`;
    elements.chatWindow.appendChild(div);
    elements.chatWindow.scrollTop = elements.chatWindow.scrollHeight;
}

function addTypingIndicator() {
    const div = document.createElement('div');
    div.className = `message ai typing`;
    div.id = 'typingIndicator';
    div.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
    elements.chatWindow.appendChild(div);
    elements.chatWindow.scrollTop = elements.chatWindow.scrollHeight;
}

function removeTypingIndicator() {
    const ind = document.getElementById('typingIndicator');
    if (ind) ind.remove();
}

async function handleChatSend(queryText = null) {
    const text = queryText || elements.chatInput.value.trim();
    if (!text) return;
    
    addMessage(text, 'user');
    elements.chatInput.value = '';
    addTypingIndicator();
    
    // Construct System Prompt + Profile Payload
    const profile = `User Profile: Total CO2: ${state.footprint.total}T, Energy: ${state.footprint.energy}T, Transport: ${state.footprint.transport}T. EcoScore: ${state.ecoScore}.`;
    const prompt = `You are EcoSphere's AI Eco-Advisor. Be concise, encouraging, and helpful. ${profile}\n\nUser Question: ${text}`;
    
    if (state.apiKey) {
        // LIVE GEMINI API CALL
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });
            const data = await response.json();
            removeTypingIndicator();
            
            if (data.error) {
                addMessage("API Error: " + data.error.message, 'ai');
            } else {
                let aiResponse = data.candidates[0].content.parts[0].text;
                // Simple markdown-to-html replacement for bold
                aiResponse = aiResponse.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                addMessage(aiResponse, 'ai');
            }
        } catch (error) {
            removeTypingIndicator();
            addMessage("Network Error while connecting to Gemini API.", 'ai');
        }
    } else {
        // SIMULATION MODE
        setTimeout(() => {
            removeTypingIndicator();
            let res = "Based on your current profile, here is what I recommend. ";
            if (text.toLowerCase().includes('analyze')) {
                const highest = Object.keys(state.footprint).reduce((a, b) => state.footprint[a] > state.footprint[b] && a !== 'total' ? a : b);
                res += `Your highest emission source is **${highest}** at ${state.footprint[highest]} Tons. I suggest tackling this first!`;
            } else if (text.toLowerCase().includes('suggest')) {
                res += "1. Start biking twice a week.<br>2. Wash clothes in cold water.<br>3. Try a plant-based diet on weekends.";
            } else {
                res += "Carbon offsets are investments in environmental projects that balance out your own carbon footprint. However, reducing emissions first is always better!";
            }
            addMessage(res, 'ai');
        }, 1500);
    }
}

elements.sendBtn.addEventListener('click', () => handleChatSend());
elements.chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChatSend(); });

elements.quickPrompts.forEach(btn => {
    btn.addEventListener('click', () => {
        handleChatSend(btn.innerText);
    });
});

// --- INIT ---
window.onload = () => {
    initChart();
    calculateFootprint();
    renderActions();
    renderBadges();
    updateAiStatus();
};
