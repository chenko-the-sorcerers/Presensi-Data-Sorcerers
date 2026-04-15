// js/face-logic.js - Orbital Security Protocol (Head Rotation Liveness)

document.addEventListener("DOMContentLoaded", async () => {
    // --- 1. INISIALISASI ELEMEN DOM ---
    const video = document.getElementById("videoElement");
    const canvas = document.getElementById("overlayCanvas");
    const ctx = canvas.getContext("2d");
    const displayId = document.getElementById("displayCrewId");
    const instructionText = document.getElementById("instructionText");
    const laserScan = document.getElementById("laserScan");

    // Variabel Kontrol Sistem
    let crewName = "Unknown Crew";
    let storedEmbedding = null;
    let isScanned = false;
    let faceMatched = false;
    let matchStability = 0;
    
    // Variabel Liveness (Head Rotation)
    let livenessStep = 1; // 1: Cek Kiri, 2: Cek Kanan, 3: Lolos

    // --- 2. CEK OTORISASI SESSION ---
    const crewId = sessionStorage.getItem("ds_crew_id");
    if (!crewId) {
        window.location.href = "login.html";
        return;
    }

    // --- FUNGSI MATEMATIKA UNTUK ROTASI KEPALA ---
    // Mengukur jarak hidung ke tepi kiri/kanan wajah untuk mengetahui arah hadap
    function getHeadTurnRatio(landmarks) {
        const jawLeft = landmarks.positions[0];   // Tepi rahang kiri (gambar)
        const jawRight = landmarks.positions[16]; // Tepi rahang kanan (gambar)
        const nose = landmarks.positions[30];     // Pucuk hidung

        const distLeft = nose.x - jawLeft.x;
        const distRight = jawRight.x - nose.x;

        if (distRight === 0) return 1; // Cegah error bagi-nol
        return distLeft / distRight;
    }

    /**
     * TAHAP 1: SINKRONISASI BIOMETRIK
     */
    async function syncCrewData() {
        instructionText.textContent = "Sinkronisasi Manifes Kru...";
        try {
            const response = await checkCrewId(crewId);
            if (response.status === "success" && response.data.embedding) {
                crewName = response.data.nama;
                displayId.textContent = `${crewId} | ${crewName}`;
                storedEmbedding = new Float32Array(JSON.parse(response.data.embedding));
                return true;
            } else {
                instructionText.textContent = "BIOMETRIK TIDAK DITEMUKAN!";
                instructionText.style.color = "#ef4444";
                return false;
            }
        } catch (error) {
            instructionText.textContent = "INTERUPSI SINYAL DATABASE.";
            return false;
        }
    }

    /**
     * TAHAP 2: INISIALISASI KAMERA
     */
    async function setupCamera() {
        instructionText.textContent = "Menginisialisasi Optik...";
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: "user" }
            });
            video.srcObject = stream;
            return new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    canvas.width = video.clientWidth;
                    canvas.height = video.clientHeight;
                    resolve(video);
                };
            });
        } catch (err) {
            instructionText.textContent = "SENSOR OPTIK ERROR!";
        }
    }

    /**
     * TAHAP 3: SCANNING, RECOGNITION & HEAD ROTATION
     */
    async function initSecureScan() {
        const identityReady = await syncCrewData();
        if (!identityReady) return;

        await setupCamera();

        instructionText.textContent = "Memuat Neural Network (Tiny Mode)...";
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        instructionText.textContent = "SISTEM ONLINE. Posisikan Wajah.";
        laserScan.style.display = "block";

        async function detectLoop() {
            if (isScanned) return;

            const detection = await faceapi.detectSingleFace(
                video, 
                new faceapi.TinyFaceDetectorOptions()
            ).withFaceLandmarks().withFaceDescriptor();

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (detection) {
                const displaySize = { width: canvas.width, height: canvas.height };
                const resizedDetections = faceapi.resizeResults(detection, displaySize);
                
                // Gambar HUD Dasar
                faceapi.draw.drawDetections(canvas, resizedDetections);

                // --- LOGIKA 1: PENCOCOKAN WAJAH ---
                if (!faceMatched) {
                    const distance = faceapi.euclideanDistance(detection.descriptor, storedEmbedding);
                    
                    if (distance < 0.6) { // Wajah Mirip
                        matchStability++;
                        instructionText.textContent = `ANALISIS KECOCOKAN: ${matchStability * 5}%`;
                        instructionText.style.color = "#10b981";
                        
                        if (matchStability >= 20) {
                            faceMatched = true; // Kunci Identitas
                        }
                    } else { // Wajah Beda
                        matchStability = 0;
                        instructionText.textContent = "IDENTITAS TIDAK COCOK!";
                        instructionText.style.color = "#ef4444";
                    }
                } 
                // --- LOGIKA 2: PROTOKOL LIVENESS (TENGOK KIRI/KANAN) ---
                else {
                    const landmarks = resizedDetections.landmarks;
                    const turnRatio = getHeadTurnRatio(landmarks);

                    // Visual Feedback: Titik di ujung rahang dan hidung
                    ctx.fillStyle = "#0ea5e9"; // Cyan untuk tepi
                    ctx.beginPath(); ctx.arc(landmarks.positions[0].x, landmarks.positions[0].y, 4, 0, 2*Math.PI); ctx.fill();
                    ctx.beginPath(); ctx.arc(landmarks.positions[16].x, landmarks.positions[16].y, 4, 0, 2*Math.PI); ctx.fill();
                    
                    ctx.fillStyle = "#f59e0b"; // Oranye untuk hidung (radar)
                    ctx.beginPath(); ctx.arc(landmarks.positions[30].x, landmarks.positions[30].y, 6, 0, 2*Math.PI); ctx.fill();

                    // Mesin State Liveness
                    if (livenessStep === 1) {
                        instructionText.textContent = "PROTOKOL AKTIF: TENGOK KE KIRI (1/2)";
                        instructionText.style.color = "#f59e0b";
                        
                        // Jika hidung condong ke kanan gambar (artinya user nengok kiri di dunia nyata)
                        if (turnRatio > 1.8) { 
                            livenessStep = 2; // Lanjut ke tahap 2
                            ctx.fillStyle = "rgba(16, 185, 129, 0.4)";
                            ctx.fillRect(0,0, canvas.width, canvas.height); // Flash hijau tanda sukses
                        }
                    } 
                    else if (livenessStep === 2) {
                        instructionText.textContent = "PROTOKOL AKTIF: TENGOK KE KANAN (2/2)";
                        instructionText.style.color = "#f59e0b";
                        
                        // Jika hidung condong ke kiri gambar (artinya user nengok kanan)
                        if (turnRatio < 0.55) {
                            livenessStep = 3;
                            isScanned = true; // Selesai!
                            processAttendance();
                        }
                    }
                }
            } else {
                // Wajah hilang dari jangkauan kamera, restart proses
                faceMatched = false;
                matchStability = 0;
                livenessStep = 1;
                instructionText.textContent = "POSISIKAN WAJAH PADA RADAR";
                instructionText.style.color = "var(--color-btn-main)";
            }

            if (!isScanned) {
                requestAnimationFrame(detectLoop);
            }
        }

        detectLoop();
    }

    /**
     * TAHAP 4: FINALISASI & TRANSMISI
     */
    async function processAttendance() {
        instructionText.textContent = "LIVENESS VALID. Mentransmisikan Data...";
        laserScan.style.display = "none";
        
        ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const payload = {
            action: "submit_attendance",
            crew_id: crewId,
            nama: crewName,
            lokasi: "-7.747, 110.374", 
            status: "Hadir",
            keterangan: "Verified via Secure Liveness (Head Yaw)"
        };

        try {
            const result = await submitAttendance(payload);
            
            if (result.status === "success") {
                sessionStorage.setItem("ds_is_verified", "true"); 
                instructionText.textContent = `AKSES DITERIMA. Selamat Bertugas, ${crewName}.`;
                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 2500);
            } else {
                instructionText.textContent = "TRANSMISI GAGAL. Mencoba kembali...";
                resetScanState();
            }
        } catch (error) {
            instructionText.textContent = "INTERUPSI TRANSMISI.";
            resetScanState();
        }
    }

    function resetScanState() {
        isScanned = false;
        faceMatched = false;
        matchStability = 0;
        livenessStep = 1;
        initSecureScan();
    }

    initSecureScan();
});
