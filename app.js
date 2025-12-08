// === 1. ZNALOSTNÍ BÁZE (ZDROJE DAT) ===
const KB = [
    { id: "107", t: "Kód 107 Hydrolock", b: "Převrácení stroje. Motor nouzově vypnut. Olej ve válcích. Postup: Postavit na pásy, čekat 30 min, VYŠROUBOVAT SVÍČKY, protočit motor." },
    { id: "olej", t: "Specifikace Olejů", b: "Motor: SAE 10W-40 (2.2L). Hydraulika: HV 46. Převodovka: SAE 80W90 (0.5L)." },
    { id: "czepos", t: "CZEPOS RTK", b: "Host: czepos.cuzk.cz, Port: 2101, Mount: VRS_RTCM32. Vyžaduje login od ČÚZK." },
    { id: "svah", t: "Limity Svahu", b: "Max 45° (100%) podélně. Max 20° při jízdě přímo do kopce/z kopce. Nad 35° se aktivuje varování (žlutý maják)." },
    { id: "tlak", t: "Tlak na půdu", b: "168 g/cm² - minimalizuje zhutnění půdy (LIGHT and STRONG filosofie)." },
    { id: "palivo", t: "Palivo", b: "Benzín. Nádrž 32 litrů (2x 16L). Výdrž cca 8 hodin. Rezerva 3 litry." }
];

// === 2. WEATHER API (OpenMeteo) ===
async function initMeteo() {
    const widget = document.getElementById('meteo-widget');
    // Default CZ (Střed ČR)
    let lat = 49.8175, lon = 15.4730; 
    
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(p => {
            lat = p.coords.latitude; lon = p.coords.longitude;
            fetchWeather(lat, lon);
        }, () => fetchWeather(lat, lon));
    } else { fetchWeather(lat, lon); }
}

async function fetchWeather(lat, lon) {
    const widget = document.getElementById('meteo-widget');
    try {
        // Získání počasí pro plánování práce [Zdroj: 2 - Prediktivní plánování]
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&windspeed_unit=kmh`);
        const data = await res.json();
        const w = data.current_weather;
        
        let icon = 'sun';
        if(w.weathercode > 3) icon = 'cloud';
        if(w.weathercode > 50) icon = 'cloud-rain';

        widget.innerHTML = `<i class="fas fa-${icon}"></i> ${w.temperature}°C | <i class="fas fa-wind"></i> ${w.windspeed} km/h`;
    } catch(e) {
        widget.innerHTML = `<span style="color:var(--danger)">Meteo Error</span>`;
    }
}

// === 3. SERVICE LOGIC ===
function calcService() {
    const h = parseInt(document.getElementById('eng-hours').value) || 0;
    
    // 50h
    let oil50 = h < 50 ? 50 : Math.ceil((h+1)/100)*100;
    updateBar('50', h, oil50, 100);

    // 100h
    let oil100 = Math.ceil((h+1)/100)*100;
    updateBar('100', h, oil100, 100);

    // 500h
    let serv500 = Math.ceil((h+1)/500)*500;
    updateBar('500', h, serv500, 500);
}

function updateBar(id, cur, target, range) {
    const rem = target - cur;
    const pct = Math.max(0, Math.min(100, (rem / range) * 100));
    document.getElementById(`lbl-${id}`).innerText = `${rem}h zbývá`;
    document.getElementById(`bar-${id}`).style.width = `${pct}%`;
    
    if(rem <= 10) document.getElementById(`bar-${id}`).style.backgroundColor = 'var(--danger)';
}

// === 4. AI CHAT ===
function toggleAI() { document.getElementById('aiOverlay').classList.toggle('open'); document.getElementById('ai-input').focus(); }

function sendAI() {
    const inp = document.getElementById('ai-input');
    const txt = inp.value.toLowerCase().trim();
    if(!txt) return;

    const box = document.getElementById('ai-chat-body');
    box.innerHTML += `<div class="ai-msg user">${inp.value}</div>`;
    inp.value = '';

    setTimeout(() => {
        const match = KB.find(k => txt.includes(k.id) || k.t.toLowerCase().includes(txt) || k.b.toLowerCase().includes(txt));
        const resp = match ? `<strong>${match.t}</strong><br>${match.b}` : "Data nenalezena. Zkuste: Olej, Svah, Kód 107, CZEPOS.";
        box.innerHTML += `<div class="ai-msg bot">${resp}</div>`;
        box.scrollTop = box.scrollHeight;
    }, 300);
}

// === 5. SIMULATION LOOP (TELEMETRIE) ===
let chart;
function initChart() {
    const ctx = document.getElementById('teleChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(20).fill(''),
            datasets: [{
                label: 'Teplota El.Motoru °C',
                data: Array(20).fill(60),
                borderColor: '#00f3ff',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { 
                x: { display: false },
                y: { grid: { color: '#222' }, ticks: { color: '#666' } }
            },
            animation: false
        }
    });
}

function simLoop() {
    // Simulace živých dat pro demo
    const rpm = 3600 + Math.floor(Math.random()*100 - 50);
    const temp = 65 + Math.floor(Math.random()*5);
    const load = 40 + Math.floor(Math.random()*20);
    const volt = 48.2 + (Math.random()*0.4 - 0.2);
    const tilt = Math.floor(Math.random()*10);

    // Update UI
    document.getElementById('val-rpm').innerText = rpm;
    document.getElementById('val-temp').innerText = temp + "°C";
    document.getElementById('val-load').innerText = load + "%";
    document.getElementById('val-volt').innerText = volt.toFixed(1) + "V";
    document.getElementById('tilt-val').innerText = tilt + "°";

    // Update Chart
    const data = chart.data.datasets[0].data;
    data.shift();
    data.push(temp);
    chart.update();

    // Simulace RTK statusu
    if(Math.random() > 0.95) {
        const isFixed = Math.random() > 0.3;
        const rtkEl = document.getElementById('rtk-val');
        const statText = document.getElementById('gps-status-text');
        const dot = document.getElementById('status-dot');
        const sysText = document.getElementById('system-status');

        if(isFixed) {
            rtkEl.innerText = 'FIXED';
            rtkEl.style.color = 'var(--success)';
            statText.innerText = 'FIXED';
            dot.className = 'status-dot ok';
            sysText.innerText = 'AUTONOMY READY';
            sysText.style.color = 'var(--success)';
        } else {
            rtkEl.innerText = 'FLOAT';
            rtkEl.style.color = 'var(--accent)';
            statText.innerText = 'FLOAT';
            dot.className = 'status-dot warn';
            sysText.innerText = 'MANUAL ONLY';
            sysText.style.color = 'var(--accent)';
        }
    }
}

// === UTILS ===
function toggleMod(head) {
    const mod = head.parentElement;
    const wasActive = mod.classList.contains('active');
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    if(!wasActive) {
        mod.classList.add('active');
        setTimeout(() => {
            const offset = mod.getBoundingClientRect().top + window.scrollY - 150;
            window.scrollTo({top: offset, behavior: 'smooth'});
        }, 300);
    }
}

function openMod(id) {
    const mod = document.getElementById(id);
    if(!mod.classList.contains('active')) toggleMod(mod.querySelector('.mod-head'));
}

// === START ===
window.onload = () => {
    initMeteo();
    initChart();
    setInterval(simLoop, 1000);
    calcService();
};


