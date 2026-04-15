// ==========================================
// DATA SORCERERS - OVERSEER COMMAND LOGIC
// Project: Orbital Admin Center // 2026
// ==========================================

let mapRadar, markerRadar; // Global variables untuk Radar GPS

document.addEventListener("DOMContentLoaded", () => {
    // 1. Injeksi & Navigasi Sidebar (Original)
    loadAdminSidebar();

    // 2. Hidupkan Jam Real-time WIB (Original)
    initClock();

    // 3. Kalibrasi Radar Lokasi (New: GPS Map)
    initMapRadar();

    // 4. Sinkronisasi Data dari Pangkalan (New: GAS Sync)
    syncConfigFromBase();
    loadLeaderboardData(); // Real data dari GAS
    loadMockupData();      // Mockup data asli Kapten (Log Transmisi)

    // --- EVENT LISTENERS GLOBAL (Delegation) ---
    
    document.addEventListener("click", async (e) => {
        // A. Tombol Simpan Konfigurasi Sesi (Update: Bulk Params)
        if (e.target && e.target.id === "btnUpdateParams") {
            saveSessionParameters();
        }

        // B. Tombol Master Switch (New: Initialize System Open)
        if (e.target && e.target.id === "btnMasterSwitch") {
            toggleMasterSwitch();
        }
        
        // C. Tombol Shutdown/Logout Sidebar (Original)
        if (e.target && (e.target.id === "adminLogoutBtn" || e.target.closest("#adminLogoutBtn"))) {
            sessionStorage.clear();
            window.location.href = "login.html";
        }
    });
    
    // Live update text di kotak info alert (Original)
    document.addEventListener("input", (e) => {
        if (e.target && (e.target.id === "cfgOpen" || e.target.id === "cfgClose")) {
            updateInfoAlertText();
        }
    });
});

// ==========================================
// 1. RADAR LOKASI: GPS PINPOINT LOGIC
// ==========================================
function initMapRadar() {
    const mapContainer = document.getElementById('mapRadar');
    if (!mapContainer) return;

    // Default Point: Yogyakarta (-7.747, 110.374)
    const defLat = -7.747;
    const defLng = 110.374;

    mapRadar = L.map('mapRadar').setView([defLat, defLng], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(mapRadar);

    // Marker Taktis yang bisa digeser
    markerRadar = L.marker([defLat, defLng], { draggable: true }).addTo(mapRadar);

    // Update input saat pin digeser
    markerRadar.on('dragend', function (e) {
        const pos = markerRadar.getLatLng();
        document.getElementById('cfgLat').value = pos.lat.toFixed(6);
        document.getElementById('cfgLng').value = pos.lng.toFixed(6);
    });

    // Update input saat peta diklik
    mapRadar.on('click', function (e) {
        markerRadar.setLatLng(e.latlng);
        document.getElementById('cfgLat').value = e.latlng.lat.toFixed(6);
        document.getElementById('cfgLng').value = e.latlng.lng.toFixed(6);
    });
}

// ==========================================
// 2. MASTER CONTROL: SINKRONISASI PUSAT
// ==========================================

async function syncConfigFromBase() {
    try {
        const res = await orbitalFetch({ action: "get_config" });
        if (res && res.status === "success") {
            const c = res.data;
            if (document.getElementById("cfgDate")) document.getElementById("cfgDate").value = c.SESSION_DATE || "";
            if (document.getElementById("cfgOpen")) document.getElementById("cfgOpen").value = c.JAM_MULAI || "18:45";
            if (document.getElementById("cfgTarget")) document.getElementById("cfgTarget").value = c.JAM_TARGET || "19:00";
            if (document.getElementById("cfgClose")) document.getElementById("cfgClose").value = c.JAM_BATAS || "19:10";
            if (document.getElementById("cfgLat")) document.getElementById("cfgLat").value = c.LATITUDE || "";
            if (document.getElementById("cfgLng")) document.getElementById("cfgLng").value = c.LONGITUDE || "";
            
            // Update Marker Peta jika ada koordinat tersimpan
            if (c.LATITUDE && c.LONGITUDE) {
                const pos = [c.LATITUDE, c.LONGITUDE];
                markerRadar.setLatLng(pos);
                mapRadar.setView(pos, 15);
            }

            updateMasterUI(c.IS_SYSTEM_OPEN === true);
            updateInfoAlertText();
        }
    } catch (e) { console.error("Gagal sinkronisasi pangkalan."); }
}

async function saveSessionParameters() {
    const btn = document.getElementById("btnUpdateParams");
    const payload = {
        action: "update_config_bulk",
        sessionDate: document.getElementById("cfgDate").value,
        openTime: document.getElementById("cfgOpen").value,
        targetTime: document.getElementById("cfgTarget").value,
        closeTime: document.getElementById("cfgClose").value,
        lat: document.getElementById("cfgLat").value,
        lng: document.getElementById("cfgLng").value
    };

    if (!payload.sessionDate || !payload.lat) {
        alert("PROTOKOL DITOLAK: Tanggal dan Lokasi Radar wajib diisi!");
        return;
    }

    btn.innerHTML = "<i class='fi fi-rr-spinner spinner'></i> TRANSMITTING...";
    btn.disabled = true;

    try {
        const res = await orbitalPost(payload);
        if (res.status === "success") {
            btn.innerHTML = "<i class='fi fi-rr-check'></i> PARAMETER TERKUNCI";
            btn.style.borderColor = "#10b981";
            setTimeout(() => {
                btn.innerHTML = "<i class='fi fi-rr-disk'></i> SIMPAN PARAMETER";
                btn.style.borderColor = "";
                btn.disabled = false;
            }, 2500);
        }
    } catch (e) { 
        alert("GAGAL: Sinyal pangkalan terganggu."); 
        btn.disabled = false;
    }
}

async function toggleMasterSwitch() {
    const btn = document.getElementById("btnMasterSwitch");
    const isOpen = btn.classList.contains("active");
    const newStatus = !isOpen;

    btn.innerHTML = "TRANSMITTING...";
    btn.disabled = true;

    try {
        const res = await orbitalPost({
            action: "toggle_system",
            status: newStatus ? "TRUE" : "FALSE"
        });
        if (res.status === "success") {
            updateMasterUI(newStatus);
        }
    } catch (e) { alert("ERROR: Otoritas Gagal."); }
    finally { btn.disabled = false; }
}

function updateMasterUI(isOpen) {
    const btn = document.getElementById("btnMasterSwitch");
    const textStatus = document.getElementById("masterStatusText");

    if (isOpen) {
        btn.innerHTML = "<i class='fi fi-rr-power'></i> DEACTIVATE SYSTEM";
        btn.classList.add("active");
        if (textStatus) {
            textStatus.textContent = "SYSTEM ACTIVE & OPEN";
            textStatus.className = "status-indicator on";
        }
    } else {
        btn.innerHTML = "<i class='fi fi-rr-power'></i> INITIALIZE SYSTEM OPEN";
        btn.classList.remove("active");
        if (textStatus) {
            textStatus.textContent = "SYSTEM DEACTIVATED";
            textStatus.className = "status-indicator off";
        }
    }
}

// ==========================================
// 3. INJEKSI & NAVIGASI SIDEBAR (ORIGINAL)
// ==========================================
async function loadAdminSidebar() {
    const container = document.getElementById("sidebar-container");
    if (!container) return;
    try {
        const response = await fetch('components/sidebar.html');
        if (!response.ok) throw new Error("Sidebar file not found");
        const html = await response.text();
        container.innerHTML = html;
        initSidebarNavigation();
    } catch (error) { console.error("Gagal memuat sidebar:", error); }
}

function initSidebarNavigation() {
    const menuItems = document.querySelectorAll(".admin-tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    const pageTitle = document.getElementById("pageTitle");

    menuItems.forEach(item => {
        item.addEventListener("click", () => {
            menuItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            tabContents.forEach(content => content.classList.remove("active"));
            const targetId = item.getAttribute("data-target");
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add("active");
                if (pageTitle) pageTitle.textContent = item.querySelector('span').textContent;
            }
        });
    });
}

// ==========================================
// 4. LOGIKA ZONA WAKTU (ORIGINAL)
// ==========================================
function getWIBTime() {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utcTime + (3600000 * 7));
}

function initClock() {
    const clockEl = document.getElementById("wibClock");
    if (!clockEl) return;
    setInterval(() => {
        const wib = getWIBTime();
        const h = String(wib.getHours()).padStart(2, '0');
        const m = String(wib.getMinutes()).padStart(2, '0');
        const s = String(wib.getSeconds()).padStart(2, '0');
        clockEl.textContent = `${h}:${m}:${s} WIB`;
    }, 1000);
}

function updateInfoAlertText() {
    const txtOpen = document.getElementById("txtOpen");
    const txtClose = document.getElementById("txtClose");
    const inputOpen = document.getElementById("cfgOpen");
    const inputClose = document.getElementById("cfgClose");
    if (txtOpen && inputOpen) txtOpen.textContent = inputOpen.value;
    if (txtClose && inputClose) txtClose.textContent = inputClose.value;
}

// ==========================================
// 5. ENGINE KALKULASI POIN & DATA (ORIGINAL)
// ==========================================
window.calculateSecretPoints = function(timeScannedStr, targetTimeStr) {
    if (!timeScannedStr || !targetTimeStr) return 0;
    const [scanH, scanM] = timeScannedStr.split(":").map(Number);
    const [targetH, targetM] = targetTimeStr.split(":").map(Number);
    const scanTotalMinutes = (scanH * 60) + scanM;
    const targetTotalMinutes = (targetH * 60) + targetM;
    if (scanTotalMinutes <= targetTotalMinutes) return 100;
    const minutesLate = scanTotalMinutes - targetTotalMinutes;
    let points = 100 - (minutesLate * 5);
    return points < 0 ? 0 : points; 
};

async function loadLeaderboardData() {
    const leaderboardBody = document.getElementById("leaderboardBody");
    if (!leaderboardBody) return;
    try {
        const res = await orbitalFetch({ action: "get_leaderboard" });
        if (res && res.status === "success") {
            leaderboardBody.innerHTML = "";
            res.data.forEach((kru, index) => {
                leaderboardBody.innerHTML += `
                    <tr>
                        <td><span class="rank-badge">${index + 1}</span></td>
                        <td><span class="crew-id-badge">${kru.id}</span></td>
                        <td><strong>${kru.nama}</strong></td>
                        <td><span class="divisi-tag">${kru.divisi}</span></td>
                        <td class="points-cell">${kru.points} PTS</td>
                    </tr>`;
            });
        }
    } catch (e) { leaderboardBody.innerHTML = "<tr><td colspan='5'>Error Sinkronisasi Klasemen.</td></tr>"; }
}

function loadMockupData() {
    const logsBody = document.getElementById("adminLogsBody");
    if(logsBody) {
        logsBody.innerHTML = `
            <tr>
                <td>18:55 WIB</td>
                <td><strong>Marchel Andrian (Chen)</strong></td>
                <td><span class="system-status">VALID</span></td>
                <td><select class="orbital-input"><option>Hadir</option></select></td>
                <td class="points-cell">100 PTS</td>
            </tr>`;
    }
}
