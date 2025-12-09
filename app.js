// === 1. ZNALOSTNÍ BÁZE (ZDROJE DAT) ===
const KB = [
    { id: "107", t: "Kód 107 Hydrolock", b: "Převrácení stroje. Motor nouzově vypnut. Olej ve válcích. Postup: Postavit na pásy, čekat 30 min, VYŠROUBOVAT SVÍČKY, protočit motor." },
    { id: "olej", t: "Specifikace Olejů", b: "Motor: SAE 10W-40 (2.2L). Hydraulika: HV 46. Převodovka: SAE 80W90 (0.5L)." },
    { id: "czepos", t: "CZEPOS RTK", b: "Host: czepos.cuzk.cz, Port: 2101, Mount: VRS_RTCM32. Vyžaduje login od ČÚZK." },
    { id: "svah", t: "Limity Svahu", b: "Max 45° (100%) podélně. Max 20° při jízdě přímo do kopce/z kopce. Nad 35° se aktivuje varování (žlutý maják)." },
    { id: "tlak", t: "Tlak na půdu", b: "168 g/cm² - minimalizuje zhutnění půdy (LIGHT and STRONG filosofie)." },
    { id: "palivo", t: "Palivo", b: "Benzín. Nádrž 32 litrů (2x 16L). Výdrž cca 8 hodin. Rezerva 3 litry." }
];

// === 2. METEO & CHART (ZÁKLADNÍ FUNKCE) ===
async function initMeteo() {
    const widget = document.getElementById('meteo-widget');
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
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&windspeed_unit=kmh`);
        const data = await res.json();
        const w = data.current_weather;
        let icon = 'sun';
        if(w.weathercode > 3) icon = 'cloud';
        if(w.weathercode > 50) icon = 'cloud-rain';
        widget.innerHTML = `<i class="fas fa-${icon}"></i> ${w.temperature}°C | <i class="fas fa-wind"></i> ${w.windspeed} km/h`;
    } catch(e) { widget.innerHTML = `<span style="color:var(--danger)">Meteo Error</span>`; }
}

let chart;
function initChart() {
    const ctx = document.getElementById('teleChart');
    if(!ctx) return; 
    chart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: Array(20).fill(''),
            datasets: [{ label: 'Teplota El.Motoru °C', data: Array(20).fill(60), borderColor: '#00f3ff', borderWidth: 2, pointRadius: 0, tension: 0.4 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { grid: { color: '#222' }, ticks: { color: '#666' } } },
            animation: false
        }
    });
}

function simLoop() {
    // Simulace dat
    const rpm = 3600 + Math.floor(Math.random()*100 - 50);
    const temp = 65 + Math.floor(Math.random()*5);
    const load = 40 + Math.floor(Math.random()*20);
    const volt = 48.2 + (Math.random()*0.4 - 0.2);
    const tilt = Math.floor(Math.random()*10);

    // Update UI (pokud je modul aktivní)
    const elRpm = document.getElementById('val-rpm');
    if(elRpm) {
        elRpm.innerText = rpm;
        document.getElementById('val-temp').innerText = temp + "°C";
        document.getElementById('val-load').innerText = load + "%";
        document.getElementById('val-volt').innerText = volt.toFixed(1) + "V";
        document.getElementById('tilt-val').innerText = tilt + "°";
    }

    // Update Chart
    if(chart) {
        const data = chart.data.datasets[0].data;
        data.shift(); data.push(temp);
        chart.update();
    }

    // Simulace RTK statusu
    if(Math.random() > 0.95) {
        const isFixed = Math.random() > 0.3;
        const rtkEl = document.getElementById('rtk-val');
        const statText = document.getElementById('gps-status-text');
        const dot = document.getElementById('status-dot');
        const sysText = document.getElementById('system-status');

        if(isFixed) {
            rtkEl.innerText = 'FIXED'; rtkEl.style.color = 'var(--success)';
            if(statText) statText.innerText = 'FIXED';
            dot.className = 'status-dot ok'; sysText.innerText = 'AUTONOMY READY'; sysText.style.color = 'var(--success)';
        } else {
            rtkEl.innerText = 'FLOAT'; rtkEl.style.color = 'var(--accent)';
            if(statText) statText.innerText = 'FLOAT';
            dot.className = 'status-dot warn'; sysText.innerText = 'MANUAL ONLY'; sysText.style.color = 'var(--accent)';
        }
    }
}

// === 3. SERVISNÍ KNIHA (Nová Logika) ===
const ServiceBook = {
    data: [],
    
    // Otevřít modul
    open: function() {
        openMod('mod-service-book');
        this.init();
    },

    // Inicializace
    init: function() {
        const stored = localStorage.getItem('xrot_service_data');
        if (stored) this.data = JSON.parse(stored);
        this.renderList();
        this.updateStats();
    },

    // UI Toggle
    toggleForm: function() {
        const form = document.getElementById('add-service-form');
        form.classList.toggle('hidden');
        if (!form.classList.contains('hidden')) {
            document.getElementById('book-date').valueAsDate = new Date();
        }
    },

    // Uložení
    saveRecord: function() {
        const date = document.getElementById('book-date').value;
        const mth = parseFloat(document.getElementById('book-mth').value);
        const type = document.getElementById('book-type').value;
        const cost = parseFloat(document.getElementById('book-cost').value) || 0;
        const desc = document.getElementById('book-desc').value;

        if (!date || isNaN(mth)) return alert("Vyplňte Datum a MTH!");

        this.data.push({ id: Date.now(), date, mth, type, cost, desc });
        localStorage.setItem('xrot_service_data', JSON.stringify(this.data));
        
        this.toggleForm();
        this.renderList();
        this.updateStats();
        
        // Reset polí
        document.getElementById('book-desc').value = "";
        document.getElementById('book-cost').value = "";
    },

    // Statistiky
    updateStats: function() {
        if (this.data.length === 0) return;
        
        const maxMth = Math.max(...this.data.map(i => i.mth));
        document.getElementById('total-mth-display').innerText = maxMth.toFixed(1);
        
        const yr = new Date().getFullYear();
        const costs = this.data.filter(i => new Date(i.date).getFullYear() === yr).reduce((a,b)=>a+b.cost,0);
        document.getElementById('total-cost-display').innerText = costs + " Kč";

        const sorted = [...this.data].sort((a,b) => new Date(b.date) - new Date(a.date));
        document.getElementById('last-service-date').innerText = sorted[0].date;

        this.updateBar('100', 100, maxMth);
        this.updateBar('500', 500, maxMth);
    },

    updateBar: function(suffix, interval, current) {
        const next = Math.ceil((current + 0.1) / interval) * interval;
        const left = next - current;
        const pct = Math.max(0, Math.min(100, (left / interval) * 100)); 
        const fill = 100 - pct;
        
        document.getElementById(`countdown-${suffix}`).innerText = `Zbývá ${left.toFixed(1)}h`;
        const bar = document.getElementById(`bar-${suffix}`);
        bar.style.width = fill + "%";
        bar.style.background = fill > 90 ? "var(--danger)" : (fill > 75 ? "var(--accent)" : "var(--success)");
    },

    // Seznam
    renderList: function(filter = 'all') {
        const list = document.getElementById('service-list-output');
        list.innerHTML = "";
        
        let items = [...this.data].sort((a,b) => new Date(b.date) - new Date(a.date));
        if(filter !== 'all') items = items.filter(i => i.type === filter);

        items.forEach(i => {
            let color = "var(--text-main)";
            let icon = "fa-wrench";
            if(i.type === 'oil') { color = "var(--accent)"; icon = "fa-oil-can"; }
            if(i.type === 'repair') { color = "var(--danger)"; icon = "fa-tools"; }

            list.innerHTML += `
            <div class="log-item" style="border-left-color:${color}">
                <div class="log-left">
                    <div class="log-date">${i.date}</div>
                    <div class="log-type" style="color:${color}"><i class="fas ${icon}"></i> ${i.type.toUpperCase()}</div>
                </div>
                <div class="log-center"><div class="log-desc">${i.desc}</div></div>
                <div class="log-right">
                    <div class="log-mth">${i.mth} MTH</div>
                    <div class="log-cost">${i.cost} Kč</div>
                </div>
            </div>`;
        });
    },
    
    filterList: function(val) { this.renderList(val); },

    // Export/Import
    exportData: function() {
        const blob = new Blob([JSON.stringify(this.data)], {type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "xrot_service.json";
        a.click();
    },

    importData: function(input) {
        const file = input.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                this.data = JSON.parse(e.target.result);
                localStorage.setItem('xrot_service_data', JSON.stringify(this.data));
                this.init();
                alert("Data importována!");
            } catch(x) { alert("Chyba souboru"); }
        };
        reader.readAsText(file);
    }
};

// === 4. MODULOVÁ NAVIGACE A AI ===
function toggleMod(head) {
    const mod = head.parentElement;
    const wasActive = mod.classList.contains('active');
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    if(!wasActive) {
        mod.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }
}

function openMod(id) {
    const mod = document.getElementById(id);
    if(mod) {
        document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
        mod.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Přidána funkce close pro tlačítko "Zpět" v servisní knize
ServiceBook.close = function() {
    document.getElementById('mod-service-book').classList.remove('active');
    document.body.style.overflow = 'auto';
};

function toggleAI() { 
    document.getElementById('aiOverlay').classList.toggle('open'); 
    if(document.getElementById('aiOverlay').classList.contains('open')) {
        document.getElementById('ai-input').focus(); 
    }
}

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

// === START ===
window.onload = () => {
    initMeteo();
    initChart();
    setInterval(simLoop, 1000);
    // Servisní knihu inicializujeme při startu, aby se načetla data
    ServiceBook.init(); 
};


