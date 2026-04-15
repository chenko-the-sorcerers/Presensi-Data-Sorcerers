// ==========================================
// DATA SORCERERS - COCKPIT OPERATIONAL LOGIC
// Project: Orbital Cockpit // Version 6.8 (Absolute & Anti-Redundancy)
// ==========================================

let activeCameraStream = null; 
let storedEmbedding = null;      
let isScanningActive = false;    

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Validasi Kredensial Lapis Pertama
    const crewId = sessionStorage.getItem("ds_active_crew_id");
    if (!crewId) { 
        triggerLockdown("AKSES ILEGAL: Kredensial tidak ditemukan.");
        return; 
    }

    // 2. Validasi Lapis Kedua & Sinkronisasi Biometrik dari Server
    const isAuthorized = await validateCrewClearance(crewId);
    if (!isAuthorized) return; 

    // 3. Inisialisasi Sistem Dasar
    initDigitalClock();
    setupSecurityProtocol();
    initializeCockpit(crewId);
});

// ==========================================
// 🔒 PROTOKOL VALIDASI KEAMANAN
// ==========================================
async function validateCrewClearance(id) {
    const badge = document.getElementById("gateStatusBadge");
    const msg = document.getElementById("gateMessage");
    
    if (badge) { badge.textContent = "VALIDATING..."; badge.className = "gate-badge"; }
    if (msg) msg.innerHTML = "Mengeksekusi protokol validasi kredensial dan biometrik...";

    try {
        const response = await orbitalFetch({ action: "checkID", id: id });
        if (response && response.success) {
            // Simpan embedding wajah ke memori untuk Face-API
            if (response.data.embedding) {
                storedEmbedding = new Float32Array(JSON.parse(response.data.embedding));
            }
            return true;
        } else {
            triggerLockdown("OTORISASI DITOLAK: Kredensial tidak valid.");
            return false;
        }
    } catch (error) {
        triggerLockdown("KONEKSI TERPUTUS: Gagal menghubungi satelit keamanan.");
        return false;
    }
}

function triggerLockdown(reason) {
    alert("SECURITY LOCKDOWN\n" + reason);
    sessionStorage.clear();
    window.location.replace("login.html"); 
}

// ==========================================
// ⚙️ INISIALISASI COCKPIT UTAMA
// ==========================================
async function initializeCockpit(id) {
    // Sinkronisasi Data Profil
    await fetchFullDossier(id);
    
    // Sinkronisasi Log & Pengecekan Redundansi Harian
    await fetchMissionLogs(id);
    
    // Validasi Pembukaan Gerbang
    performGateCheck();
}

async function fetchFullDossier(id) {
    try {
        const response = await orbitalFetch({ action: "checkID", id: id });
        if (response && response.success) {
            const d = response.data;
            const setVal = (elId, val) => { const el = document.getElementById(elId); if(el) el.textContent = val || "-"; };

            setVal("displayName", d.nama ? d.nama.toUpperCase() : "KRU ANONYMOUS");
            setVal("displayId", d.id || id);
            setVal("displayDivisi", d.posisi || "FIELD AGENT");
            setVal("p-kampus", d.kampus);
            setVal("p-jurusan", d.jurusan);
            setVal("p-angkatan", d.angkatan);
            setVal("p-email", d.email);
            setVal("p-wa", d.wa);
            setVal("p-tgl-lahir", d.tgl_lahir);

            const igLink = document.getElementById("p-ig"), ghLink = document.getElementById("p-github"), liLink = document.getElementById("p-linkedin");
            if (d.ig && igLink) igLink.href = d.ig;
            if (d.github && ghLink) ghLink.href = d.github;
            if (d.linkedin && liLink) liLink.href = d.linkedin;

            const mottoEl = document.getElementById("p-motto");
            if (mottoEl) mottoEl.textContent = d.motto ? `"${d.motto}"` : '"No manifest recorded."';

            sessionStorage.setItem("ds_active_crew_name", d.nama);
        }
    } catch (error) { console.error("Dossier Sync Error"); }
}

async function fetchMissionLogs(id) {
    const logContainer = document.getElementById("logContainer");
    if (!logContainer) return;

    try {
        const response = await orbitalFetch({ action: "get_logs", crew_id: id });
        if (response.status === "success" && response.data.length > 0) {
            logContainer.innerHTML = "";
            let hasCheckedInToday = false;
            
            // Format tanggal hari ini untuk perbandingan: DD/MM/YYYY
            const now = getWIBTime();
            const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

            response.data.slice(0, 10).forEach(log => {
                // PENGECEKAN REDUNDANSI: Jika ada log yang mengandung tanggal hari ini
                if (log.timestamp.includes(todayStr)) {
                    hasCheckedInToday = true;
                }

                logContainer.innerHTML += `
                    <div class="log-item">
                        <div class="log-time">[ ${log.timestamp} ]</div>
                        <div class="log-desc">${log.keterangan || 'Biometric Sync Success'}</div>
                        <div class="log-status">${log.status.toUpperCase()}</div>
                    </div>`;
            });
            
            // Simpan status redundansi ke session agar Gate bisa memutuskan
            sessionStorage.setItem("ds_mission_completed", hasCheckedInToday);
        } else {
            logContainer.innerHTML = '<div class="log-placeholder">Belum ada catatan misi terdokumentasi.</div>';
            sessionStorage.setItem("ds_mission_completed", false);
        }
    } catch (e) {
        console.error("Log Fetch Error");
        sessionStorage.setItem("ds_mission_completed", false);
    }
}

// ==========================================
// 📡 MISSION CONTROL: GERBANG TRANSMISI
// ==========================================
function performGateCheck() {
    const btnScan     = document.getElementById("btnInitiateScan");
    const badge       = document.getElementById("gateStatusBadge");
    const msg         = document.getElementById("gateMessage");
    const actionArea  = document.getElementById("attendanceActionArea");
    const successArea = document.getElementById("missionAccomplished");

    const setBtn = (enabled) => {
        if (!btnScan) return;
        btnScan.disabled = !enabled;
        btnScan.classList.remove("hidden"); 
        enabled ? btnScan.classList.remove("disabled") : btnScan.classList.add("disabled");
    };

    const validate = async () => {
        // 1. CEK REDUNDANSI: Jika sudah presensi hari ini, kunci gerbang selamanya.
        const isCompleted = sessionStorage.getItem("ds_mission_completed") === "true";

        if (isCompleted) {
            if (actionArea) actionArea.classList.add("hidden");
            if (successArea) successArea.classList.remove("hidden");
            if (msg) msg.innerHTML = "STATUS: Transmisi harian sudah tercatat dalam manifes harian.";
            if (badge) { badge.textContent = "COMPLETED"; badge.className = "gate-badge badge-ready"; }
            setBtn(false);
            return; 
        }

        // 2. CEK KONFIGURASI SERVER (Jam & Status Open)
        try {
            const res = await orbitalFetch({ action: "get_config" });
            if (!res || res.status !== "success") return setBtn(false);

            const config = res.data;
            const now = getWIBTime();
            const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

            if (successArea) successArea.classList.add("hidden");
            if (actionArea)  actionArea.classList.remove("hidden");

            if (config.IS_SYSTEM_OPEN !== true) {
                if (msg)   msg.innerHTML = "SYSTEM DEACTIVATED: Menunggu otorisasi Overseer.";
                if (badge) { badge.textContent = "STANDBY"; badge.className = "gate-badge"; }
                setBtn(false);
            } else if (currentTime < config.JAM_MULAI) {
                if (msg)   msg.innerHTML = `Gerbang dibuka pada <span style="color:#0ea5e9">${config.JAM_MULAI} WIB</span>.`;
                if (badge) { badge.textContent = "WAITING"; badge.className = "gate-badge"; }
                setBtn(false);
            } else if (currentTime > config.JAM_BATAS) {
                if (msg)   msg.innerHTML = "SISTEM TERKUNCI: Batas waktu operasional berakhir.";
                if (badge) { badge.textContent = "CLOSED"; badge.className = "gate-badge status-alpha"; }
                setBtn(false);
            } else {
                // GERBANG TERBUKA
                if (msg)   msg.innerHTML = "SISTEM ONLINE: Radar aktif. Silakan lakukan pemindaian.";
                if (badge) { badge.textContent = "READY"; badge.className = "gate-badge badge-ready"; }
                setBtn(true);
                btnScan.onclick = () => openBiometricModal(config); 
            }
        } catch (e) { setBtn(false); }
    };

    validate();
    setInterval(validate, 30000); // Polling setiap 30 detik
}

// ==========================================
// 🧬 FACE-API & BIOMETRIC LOOP
// ==========================================
async function startBiometricScanner(config, locationStr) {
    const video = document.getElementById("cameraFeed");
    const locStatus = document.getElementById("locationStatus");
    const container = document.querySelector(".video-scanner-container");
    const laser = document.getElementById("laserScan");

    if (!storedEmbedding) {
        locStatus.innerHTML = "<span class='text-danger'>GAGAL: Data biometrik tidak sinkron.</span>";
        return;
    }

    locStatus.textContent = "MENGINISIALISASI NEURAL NETWORK...";
    const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models'; 
    
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
    } catch (e) {
        locStatus.innerHTML = "<span class='text-danger'>GAGAL MEMUAT AI: Periksa koneksi satelit.</span>";
        return;
    }

    locStatus.textContent = "POSISIKAN WAJAH PADA RADAR";
    if (laser) laser.style.display = "block";

    let canvas = document.getElementById("overlayCanvas");
    if (!canvas) {
        canvas = faceapi.createCanvasFromMedia(video);
        canvas.id = "overlayCanvas";
        canvas.style.position = "absolute";
        canvas.style.top = "0"; canvas.style.left = "0";
        canvas.style.width = "100%"; canvas.style.height = "100%";
        canvas.style.transform = "scaleX(-1)"; 
        container.appendChild(canvas);
    }
    const ctx = canvas.getContext("2d");

    let faceMatched = false;
    let matchStability = 0;
    let livenessStep = 1;

    async function detectLoop() {
        if (!isScanningActive) return;

        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detection) {
            const displaySize = { width: video.clientWidth, height: video.clientHeight };
            canvas.width = displaySize.width;
            canvas.height = displaySize.height;
            const resized = faceapi.resizeResults(detection, displaySize);

            if (!faceMatched) {
                const distance = faceapi.euclideanDistance(detection.descriptor, storedEmbedding);
                if (distance < 0.55) { 
                    matchStability++;
                    locStatus.innerHTML = `<span style="color:#0ea5e9">ANALISIS WAJAH: ${matchStability * 5}%</span>`;
                    if (matchStability >= 20) faceMatched = true; 
                } else {
                    matchStability = 0;
                    locStatus.innerHTML = "<span class='text-danger'>WAJAH TIDAK COCOK</span>";
                }
            } 
            else {
                handleLiveness(resized.landmarks, ctx, config, locationStr);
            }
        } else {
            faceMatched = false; matchStability = 0; livenessStep = 1;
            locStatus.innerHTML = "<span style='color:#94a3b8'>WAJAH TIDAK TERDETEKSI</span>";
        }

        if (isScanningActive) requestAnimationFrame(detectLoop);
    }

    function handleLiveness(landmarks, ctx, config, locationStr) {
        const nose = landmarks.positions[30];
        const jawL = landmarks.positions[0];
        const jawR = landmarks.positions[16];
        const distLeft = nose.x - jawL.x;
        const distRight = jawR.x - nose.x;
        const turnRatio = distRight === 0 ? 1 : distLeft / distRight;

        // Feedback Visual (Titik Biru di Hidung)
        ctx.fillStyle = "#0ea5e9";
        ctx.beginPath(); ctx.arc(nose.x, nose.y, 5, 0, 2*Math.PI); ctx.fill();

        if (livenessStep === 1) {
            locStatus.innerHTML = "<span style='color:#f59e0b'>LIVENESS: TENGOK KIRI</span>";
            if (turnRatio > 1.8) livenessStep = 2;
        } else if (livenessStep === 2) {
            locStatus.innerHTML = "<span style='color:#f59e0b'>LIVENESS: TENGOK KANAN</span>";
            if (turnRatio < 0.55) {
                isScanningActive = false; 
                locStatus.innerHTML = "<span class='text-success'>AKSES DITERIMA. Mentransmisikan...</span>";
                if (laser) laser.style.display = "none";
                ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                submitPresence(config, locationStr);
            }
        }
    }

    isScanningActive = true;
    detectLoop();
}

// ==========================================
// 📡 TRANSMISI DATA KE SATELIT
// ==========================================
function openBiometricModal(config) {
    const modal      = document.getElementById("attendanceModal"), 
          locStatus  = document.getElementById("locationStatus"), 
          btnConfirm = document.getElementById("btnConfirmPresence"), 
          btnCancel  = document.getElementById("btnCancelScan");
    
    modal.classList.remove("hidden");
    btnConfirm.disabled = true; 
    btnConfirm.textContent = "MENUNGGU WAJAH";

    const video = document.getElementById("cameraFeed");
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } }).then(stream => {
            activeCameraStream = stream;
            video.srcObject = stream;
            
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const loc = `${pos.coords.latitude},${pos.coords.longitude}`;
                    startBiometricScanner(config, loc);
                },
                () => { locStatus.innerHTML = "<span class='text-danger'>GAGAL: GPS tidak aktif. Transmisi diblokir.</span>"; }
            );
        }).catch(err => locStatus.innerHTML = "<span class='text-danger'>GAGAL: Kamera tidak dapat diakses.</span>");
    }

    btnCancel.onclick = () => {
        isScanningActive = false;
        if (activeCameraStream) { activeCameraStream.getTracks().forEach(t => t.stop()); activeCameraStream = null; }
        modal.classList.add("hidden");
    };
}

async function submitPresence(config, locationStr) {
    const btnConfirm = document.getElementById("btnConfirmPresence");
    const crewId     = sessionStorage.getItem("ds_active_crew_id"), 
          crewName   = sessionStorage.getItem("ds_active_crew_name");

    btnConfirm.textContent = "TRANSMITTING...";
    const now = getWIBTime();
    const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const status = currentTime <= config.JAM_TARGET ? "Hadir" : "Terlambat";

    const payload = {
        action: "submit_attendance",
        crew_id: crewId,
        nama: crewName,
        lokasi: locationStr,
        status: status,
        keterangan: `Verified via Biometric Liveness (${currentTime} WIB)`
    };

    try {
        const res = await orbitalPost(payload);
        if (res.status === "success") {
            isScanningActive = false;
            if (activeCameraStream) { activeCameraStream.getTracks().forEach(t => t.stop()); activeCameraStream = null; }
            document.getElementById("attendanceModal").classList.add("hidden");
            
            // PAKSA REFRESH LOG & GATE STATUS
            await fetchMissionLogs(crewId);
            performGateCheck();
            alert(`TRANSMISI BERHASIL: Status Anda - ${status.toUpperCase()}`);
        } else {
            alert("TRANSMISI DITOLAK: Gagal menulis data ke pangkalan.");
        }
    } catch (e) {
        alert("TRANSMISI GAGAL: Terjadi gangguan sinyal satelit.");
    }
}

// ==========================================
// 🛠️ UTILITIES (Waktu & Keamanan)
// ==========================================
function setupSecurityProtocol() {
    const modal = document.getElementById("securityModal");
    history.pushState(null, null, location.href);
    window.onpopstate = () => { history.pushState(null, null, location.href); if (modal) modal.classList.remove("hidden"); };
    
    const btnForce = document.getElementById("btnForceLogout"), btnStay = document.getElementById("btnStay");
    if (btnForce) btnForce.onclick = () => { sessionStorage.clear(); window.location.href = "login.html"; };
    if (btnStay) btnStay.onclick = () => { if (modal) modal.classList.add("hidden"); history.pushState(null, null, location.href); };
}

function getWIBTime() { return new Date(new Date().getTime() + (new Date().getTimezoneOffset() * 60000) + (3600000 * 7)); }

function initDigitalClock() {
    const clockEl = document.getElementById("dashClock"), dateEl = document.getElementById("dashDate");
    const tick = () => {
        const wib = getWIBTime();
        if (clockEl) clockEl.textContent = wib.toLocaleTimeString('id-ID', { hour12: false }) + " WIB";
        if (dateEl) {
            const d = String(wib.getDate()).padStart(2, '0');
            const m = String(wib.getMonth() + 1).padStart(2, '0');
            const y = wib.getFullYear();
            dateEl.textContent = `${d}/${m}/${y}`;
        }
    };
    tick(); setInterval(tick, 1000);
}
