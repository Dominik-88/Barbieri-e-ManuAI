// === 1. DATA STROJŮ ===
const MACHINES = [
    { id: 'XROT95', name: 'Barbieri XROT 95 EVO', type: 'autonomous', color: 'var(--accent)', icon: 'fa-robot' },
    { id: 'AS940RC', name: 'AS 940 Sherpa RC', type: 'simple', color: 'var(--success)', icon: 'fa-truck-monster' },
    { id: 'XCUT80', name: 'Barbieri XCUT 80', type: 'simple', color: 'var(--primary)', icon: 'fa-tractor' },
    { id: 'OVIS1000', name: 'AS 1000 Ovis RC', type: 'simple', color: 'var(--danger)', icon: 'fa-snowplow' },
    { id: 'Z560X', name: 'Husqvarna Z560X', type: 'simple', color: 'var(--purple)', icon: 'fa-mitten' }
];

const KB = [
    { id: "107", t: "Kód 107 Hydrolock", b: "Převrácení. Motor vypnut. Postup: Postavit, čekat 30min, vyšroubovat svíčky, protočit." },
    { id: "olej", t: "Olej", b: "Motor: 10W-40 (2.2L). Hydraulika: HV 46." }
];

// === 2. APLIKAČNÍ LOGIKA (NAVIGACE) ===
const App = {
    activeMachine: null,

    init: function() {
        this.renderMachines();
        // Pokud je uložen poslední stroj, otevřeme ho (volitelné, zde vypnuto pro testování výběru)
        // const last = localStorage.getItem('lastMachine');
        // if(last) this.selectMachine(last);
    },

    renderMachines: function() {
        const grid = document.getElementById('machine-grid');
        grid.innerHTML = '';
        MACHINES.forEach(m => {
            grid.innerHTML += `
            <div class="card" style="--c:${m.color}" onclick="App.selectMachine('${m.id}')">
                <div class="card-icon"><i class="fas ${m.icon}"></i></div>
                <div class="card-title">${m.name}</div>
                <div class="card-sub">${m.type === 'autonomous' ? 'AUTONOMNÍ SYSTÉM' : 'DÁLKOVĚ OVLÁDANÉ'}</div>
            </div>`;
        });
    },

    selectMachine: function(id) {
        const m = MACHINES.find(x => x.id === id);
        if (!m) return;
        
        this.activeMachine = m;
        // Uložit do storage
        localStorage.setItem('lastMachine', id);

        // Update UI
        document.getElementById('header-title').innerHTML = m.name;
        document.getElementById('system-status').innerText = "SYSTEM ONLINE";
        document.getElementById('status-dot').className = "status-dot ok";

        // Přepnout pohled
        document.getElementById('view-selector').classList.add('hidden');
        document.getElementById('view-dashboard').classList.remove('hidden');

        // Inicializovat moduly pro tento stroj
        ServiceBook.machineId = id; // Nastavit ID pro servisní knihu
        ServiceBook.init();
    },

    goBack: function() {
        document.getElementById('view-dashboard').classList.add('hidden');
        document.getElementById('view-selector').classList.remove('hidden');
        document.getElementById('header-title').innerHTML = "XROT <span>MANUAL</span>";
        document.getElementById('system-status').innerText = "SELECT MACHINE...";
        document.getElementById('status-dot').className = "status-dot warn";
        this.activeMachine = null;
        localStorage.removeItem('lastMachine');
    }
};

// === 3. SERVISNÍ KNIHA ===
const ServiceBook = {
    data: [],
    machineId: 'default', // Bude přepsáno při výběru stroje
    
    open: function() { openMod('mod-service-book'); },
    close: function() { document.getElementById('mod-service-book').classList.remove('active'); },

    init: function() {
        // Načíst data specifická pro tento stroj
        const stored = localStorage.getItem('service_data_' + this.machineId);
        this.data = stored ? JSON.parse(stored) : [];
        this.renderList();
        this.updateStats();
    },

    toggleForm: function() {
        const form = document.getElementById('add-service-form');
        form.classList.toggle('hidden');
        if (!form.classList.contains('hidden')) document.getElementById('book-date').valueAsDate = new Date();
    },

    saveRecord: function() {
        const date = document.getElementById('book-date').value;
        const mth = parseFloat(document.getElementById('book-mth').value);
        const type = document.getElementById('book-type').value;
        const cost = parseFloat(document.getElementById('book-cost').value) || 0;
        const desc = document.getElementById('book-desc').value;

        if (!date || isNaN(mth)) return alert("Chybí Datum nebo MTH!");

        this.data.push({ id: Date.now(), date, mth, type, cost, desc });
        this.saveData();
        this.toggleForm();
        this.init();
    },

    saveData: function() {
        localStorage.setItem('service_data_' + this.machineId, JSON.stringify(this.data));
    },

    updateStats: function() {
        if (this.data.length === 0) {
            document.getElementById('total-mth-display').innerText = "0.0";
            return;
        }
        const maxMth = Math.max(...this.data.map(i => i.mth));
        document.getElementById('total-mth-display').innerText = maxMth.toFixed(1);
        
        // Progress Bars
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
        bar.style.background = fill > 90 ? "var(--danger)" : "var(--success)";
    },

    renderList: function(filter = 'all') {
        const list = document.getElementById('service-list-output');
        list.innerHTML = "";
        let items = [...this.data].sort((a,b) => new Date(b.date) - new Date(a.date));
        if(filter !== 'all') items = items.filter(i => i.type === filter);

        items.forEach(i => {
            let color = "#fff";
            if(i.type === 'oil') color = "var(--accent)";
            if(i.type === 'repair') color = "var(--danger)";
            list.innerHTML += `
            <div class="log-item" style="border-left-color:${color}">
                <div class="log-left"><div class="log-date">${i.date}</div><div class="log-type" style="color:${color}">${i.type}</div></div>
                <div class="log-center"><div class="log-desc">${i.desc}</div></div>
                <div class="log-right"><div class="log-mth">${i.mth} MTH</div></div>
            </div>`;
        });
    },
    
    filterList: function(val) { this.renderList(val); },
    
    exportData: function() {
        const blob = new Blob([JSON.stringify(this.data)], {type:'application/json'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `service_${this.machineId}.json`; a.click();
    },
    
    importData: function(input) {
        const file = input.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            this.data = JSON.parse(e.target.result);
            this.saveData(); this.init(); alert("Data nahrána!");
        };
        reader.readAsText(file);
    }
};

// === 4. UTILS & START ===
function openMod(id) { document.getElementById(id).classList.add('active'); }
function toggleMod(head) { head.parentElement.classList.remove('active'); } // Simple close
function toggleAI() { document.getElementById('aiOverlay').classList.toggle('open'); }

// Start Aplikace
window.onload = function() {
    App.init();
    // Simulace počasí
    document.getElementById('meteo-widget').innerHTML = '<i class="fas fa-sun"></i> 22°C | <i class="fas fa-wind"></i> 5 km/h';
    
    // Graf Simulace (Telemetrie)
    if(document.getElementById('teleChart')) {
        const ctx = document.getElementById('teleChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: { labels: Array(20).fill(''), datasets: [{ label: 'Teplota', data: Array(20).fill(60), borderColor: '#00f3ff', tension: 0.4 }] },
            options: { responsive: true, animation: false, scales: { x: {display: false}, y: {grid: {color: '#222'}} } }
        });
        setInterval(() => {
            if(!App.activeMachine) return; // Běží jen v dashboardu
            const temp = 60 + Math.random() * 10;
            const d = chart.data.datasets[0].data; d.shift(); d.push(temp); chart.update();
            document.getElementById('val-rpm').innerText = (3000+Math.random()*500).toFixed(0);
            document.getElementById('val-temp').innerText = temp.toFixed(1) + "°C";
        }, 1000);
    }
};


