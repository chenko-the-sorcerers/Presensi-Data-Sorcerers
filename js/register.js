// js/register.js - Enrollment Protocol

document.addEventListener("DOMContentLoaded", () => {
    const step1 = document.getElementById("step1");
    const step2 = document.getElementById("step2");
    const btnNext = document.getElementById("btnNextStep");
    const btnBack = document.getElementById("btnBack");
    const btnSubmit = document.getElementById("btnSubmit");
    const regForm = document.getElementById("regForm");
    const regStatus = document.getElementById("regStatus");

    // Elemen Kamera
    const video = document.getElementById("regVideo");
    const canvas = document.getElementById("regCanvas");
    const laserScan = document.getElementById("laserScan");
    const ctx = canvas ? canvas.getContext("2d") : null;

    let localStream = null;
    let finalFaceEmbedding = null; // Menyimpan data wajah
    let captureProgress = 0; // Butuh beberapa frame agar akurat

    // --- TRANSISI TAHAP 1 KE TAHAP 2 ---
    btnNext.addEventListener("click", () => {
        // Validasi HTML bawaan (apakah required sudah diisi)
        if (!regForm.checkValidity()) {
            regForm.reportValidity();
            return;
        }
        step1.style.display = "none";
        step2.style.display = "block";
        initCameraAndAI();
    });

    btnBack.addEventListener("click", () => {
        stopCamera();
        step2.style.display = "none";
        step1.style.display = "block";
        finalFaceEmbedding = null;
        btnSubmit.style.display = "none";
    });

    // --- LOGIKA AI & KAMERA ---
    async function initCameraAndAI() {
        regStatus.textContent = "Memuat Neural Network...";
        regStatus.style.color = "#f59e0b"; // Oranye

        try {
            const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);

            regStatus.textContent = "Menghidupkan Optik...";
            localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
            video.srcObject = localStream;

            video.onloadedmetadata = () => {
                canvas.width = video.clientWidth;
                canvas.height = video.clientHeight;
                regStatus.textContent = "SISTEM ONLINE. Tatap kamera lurus.";
                regStatus.style.color = "#10b981"; // Hijau
                laserScan.style.display = "block";
                extractFaceData();
            };

        } catch (error) {
            regStatus.textContent = "ERROR KAMERA/MODEL AI.";
            regStatus.style.color = "#ef4444";
        }
    }

    async function extractFaceData() {
        // Jika sudah dapat wajahnya, hentikan loop
        if (finalFaceEmbedding) return;

        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                                .withFaceLandmarks().withFaceDescriptor();

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detection) {
            const resized = faceapi.resizeResults(detection, { width: canvas.width, height: canvas.height });
            faceapi.draw.drawDetections(canvas, resized);
            faceapi.draw.drawFaceLandmarks(canvas, resized);

            // Pastikan AI yakin itu wajah (score deteksi > 0.8)
            if (detection.detection.score > 0.8) {
                captureProgress++;
                regStatus.textContent = `MENGEKSTRAK BIOMETRIK: ${Math.min(100, captureProgress * 5)}%`;

                // Jika sudah stabil selama 20 frame (~1.5 detik), simpan!
                if (captureProgress >= 20) {
                    finalFaceEmbedding = JSON.stringify(Array.from(detection.descriptor));
                    
                    laserScan.style.display = "none";
                    ctx.fillStyle = "rgba(16, 185, 129, 0.4)";
                    ctx.fillRect(0,0, canvas.width, canvas.height); // Flash layar
                    
                    regStatus.textContent = "EKSTRAKSI SUKSES! Siap mentransmisikan.";
                    regStatus.style.color = "#10b981";
                    btnSubmit.style.display = "block"; // Munculkan tombol kirim
                }
            } else {
                captureProgress = 0;
            }
        } else {
            captureProgress = 0;
            regStatus.textContent = "POSISIKAN WAJAH PADA RADAR";
            regStatus.style.color = "#f59e0b";
        }

        if (!finalFaceEmbedding) {
            requestAnimationFrame(extractFaceData);
        }
    }

    function stopCamera() {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        laserScan.style.display = "none";
    }

    // --- PENGIRIMAN DATA KE DATABASE (GAS) ---
    regForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!finalFaceEmbedding) {
            alert("Selesaikan pemindaian wajah terlebih dahulu!");
            return;
        }

        btnSubmit.disabled = true;
        btnSubmit.textContent = "MENGIRIM TRANSMISI...";

        // Susun payload sesuai dengan 14 kolom di GAS
        const payload = {
            action: "register_crew",
            crew_id: document.getElementById("regId").value.trim().toUpperCase(),
            nama: document.getElementById("regNama").value.trim(),
            email: document.getElementById("regEmail").value.trim(),
            wa: document.getElementById("regWa").value.trim(),
            tanggal_lahir: document.getElementById("regLahir").value,
            posisi: document.getElementById("regPosisi").value,
            kampus: document.getElementById("regKampus").value.trim(),
            jurusan: document.getElementById("regJurusan").value.trim(),
            tahun_masuk: document.getElementById("regTahun").value.trim(),
            ig: document.getElementById("regIg").value.trim(),
            github: document.getElementById("regGithub").value.trim(),
            linkedin: document.getElementById("regLinkedin").value.trim(),
            motto: document.getElementById("regMotto").value.trim(),
            embedding: finalFaceEmbedding // Array Angka Wajah (String)
        };

        try {
            // Karena fungsi ini mandiri, kita fetch langsung (Ganti BASE_URL dari api.js jika perlu)
            // Asumsi BASE_URL sudah dideklarasi di js/api.js yang dimuat sebelumnya
            const response = await fetch(BASE_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.status === "success") {
                stopCamera();
                
                // Munculkan Pop-up Keren
                const successModal = document.getElementById("successModal");
                successModal.classList.add("show");

                // Berikan event klik pada tombol di dalam pop-up
                document.getElementById("btnModalClose").addEventListener("click", () => {
                    window.location.href = "login.html"; // Lempar ke halaman login
                });
            } else {
                alert("ERROR DATABASE: " + result.message);
                btnSubmit.disabled = false;
                btnSubmit.textContent = "KIRIM ULANG MANIFES";
            }
        } catch (error) {
            alert("GANGGUAN SINYAL: Gagal mengirim data.");
            btnSubmit.disabled = false;
            btnSubmit.textContent = "KIRIM ULANG MANIFES";
        }
    });
});
