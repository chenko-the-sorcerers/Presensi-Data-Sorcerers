// js/login.js - Protokol Keamanan Ganda Data Sorcerers

document.addEventListener("DOMContentLoaded", () => {
    const btnLogin = document.getElementById("btnLogin");
    const inputId = document.getElementById("crewId");

    if (btnLogin) btnLogin.addEventListener("click", startAuthentication);
    if (inputId) {
        inputId.addEventListener("keypress", (e) => {
            if (e.key === "Enter") startAuthentication();
        });
    }

    // Status Awal: Standby
    updateStatus("SISTEM STANDBY - MASUKKAN ID", "status-wait");
});

// --- VARIABEL GLOBAL ---
const video = document.getElementById("loginVideo");
const canvas = document.getElementById("loginCanvas");
const statusEl = document.getElementById("cameraStatus");
const laserScan = document.getElementById("laserScan");
const btnLogin = document.getElementById("btnLogin");
const inputId = document.getElementById("crewId");

let storedEmbedding = null;
let userData = null;
let isScanned = false;
let faceMatched = false;
let matchStability = 0;
let livenessStep = 1; // 1: Kiri, 2: Kanan, 3: Success

// --- TAHAP 1: VALIDASI ID (DATABASE GAS) ---
async function startAuthentication() {
    const crewId = inputId.value.trim().toUpperCase();
    hideAlert();

    if (!crewId) return showAlert("ID DIPERLUKAN: Masukkan ID Kru.");

    // Lock UI
    btnLogin.disabled = true;
    inputId.disabled = true;
    btnLogin.innerHTML = `<i class="fi fi-rr-spinner-alt" style="animation: spin 1s linear infinite;"></i> MENGECEK DATABASE...`;
    updateStatus("MENGHUBUNGI PUSAT DATA...", "status-wait");

    try {
        // Memanggil GAS dengan action checkID (sesuai script GAS Anda)
        const response = await orbitalFetch({ action: "checkID", id: crewId });

        if (response.success && response.data.embedding) {
            // ID Valid! Simpan data dan lanjut ke Biometrik
            userData = response.data;
            storedEmbedding = new Float32Array(JSON.parse(userData.embedding));
            
            updateStatus("ID VALID. MENGAKTIFKAN SENSOR...", "status-ready");
            initBiometricScan();
        } else {
            // ID Tidak Ada
            resetUI();
            showAlert(response.message || "ID TIDAK TERDAFTAR: Akses Ditolak.");
        }
    } catch (error) {
        resetUI();
        showAlert("KEGAGALAN TRANSMISI: Periksa koneksi satelit Anda.");
    }
}

// --- TAHAP 2: INISIALISASI KAMERA & AI ---
async function initBiometricScan() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, facingMode: "user" } 
        });
        video.srcObject = stream;

        video.onloadedmetadata = async () => {
            canvas.width = video.clientWidth;
            canvas.height = video.clientHeight;

            updateStatus("MEMUAT NEURAL NETWORK...", "status-ready");
            
            const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);

            updateStatus("POSISIKAN WAJAH PADA RADAR", "status-ready");
            laserScan.style.display = "block";
            detectLoop();
        };
    } catch (err) {
        resetUI();
        showAlert("SENSOR OPTIK ERROR: Kamera tidak dapat diakses.");
    }
}

// --- TAHAP 3: FACE MATCH & LIVENESS ---
async function detectLoop() {
    if (isScanned) return;

    const ctx = canvas.getContext("2d");
    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                                 .withFaceLandmarks()
                                 .withFaceDescriptor();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detection) {
        const displaySize = { width: canvas.width, height: canvas.height };
        const resized = faceapi.resizeResults(detection, displaySize);

        if (!faceMatched) {
            // Cek Kemiripan (Euclidean Distance)
            const distance = faceapi.euclideanDistance(detection.descriptor, storedEmbedding);
            if (distance < 0.55) {
                matchStability++;
                updateStatus(`ANALISIS WAJAH: ${matchStability * 5}%`, "status-ready");
                if (matchStability >= 20) faceMatched = true;
            } else {
                matchStability = 0;
                updateStatus("WAJAH TIDAK COCOK", "status-error");
            }
        } else {
            // Protokol Liveness (Tengok Kiri/Kanan)
            handleLiveness(resized.landmarks, ctx);
        }
    } else {
        updateStatus("WAJAH TIDAK TERDETEKSI", "status-wait");
        matchStability = 0;
        faceMatched = false;
    }

    if (!isScanned) requestAnimationFrame(detectLoop);
}

function handleLiveness(landmarks, ctx) {
    const nose = landmarks.positions[30];
    const jawL = landmarks.positions[0];
    const jawR = landmarks.positions[16];
    const turnRatio = (nose.x - jawL.x) / (jawR.x - nose.x);

    // Visual feedback
    ctx.fillStyle = "#0ea5e9";
    ctx.beginPath(); ctx.arc(nose.x, nose.y, 5, 0, 2*Math.PI); ctx.fill();

    if (livenessStep === 1) {
        updateStatus("LIVENESS: TENGOK KIRI", "status-ready");
        if (turnRatio > 1.8) livenessStep = 2;
    } else if (livenessStep === 2) {
        updateStatus("LIVENESS: TENGOK KANAN", "status-ready");
        if (turnRatio < 0.55) {
            isScanned = true;
            grantAccess();
        }
    }
}

// --- TAHAP 4: OTORISASI BERHASIL ---
function grantAccess() {
    laserScan.style.display = "none";
    updateStatus("AKSES DITERIMA!", "status-ready");
    
    btnLogin.innerHTML = `<i class="fi fi-rr-check-circle"></i> WELCOME, ${userData.nama.toUpperCase()}`;
    btnLogin.style.backgroundColor = "#10b981";

    // Simpan data manifes ke session
    sessionStorage.setItem("ds_active_crew_id", inputId.value.toUpperCase());
    sessionStorage.setItem("ds_active_crew_name", userData.nama);
    sessionStorage.setItem("ds_active_crew_divisi", userData.divisi || userData.posisi);

    setTimeout(() => { window.location.href = "dashboard.html"; }, 1500);
}

// --- UTILITAS ---
function updateStatus(text, className) {
    statusEl.textContent = text;
    statusEl.className = `camera-status ${className}`;
}

function resetUI() {
    btnLogin.disabled = false;
    inputId.disabled = false;
    btnLogin.innerHTML = `<i class="fi fi-rr-face-viewfinder"></i> VERIFIKASI & MASUK`;
}

function showAlert(msg) {
    const box = document.getElementById("loginAlert");
    document.getElementById("alertMessage").textContent = msg;
    box.classList.remove("hidden");
}

function hideAlert() {
    document.getElementById("loginAlert").classList.add("hidden");
}
