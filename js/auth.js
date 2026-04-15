// js/auth.js - Orbital Gateway Authentication Protocol

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const crewIdInput = document.getElementById("crewId");
    const loginMsg = document.getElementById("loginMsg");
    const loginBtn = document.getElementById("loginBtn");

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // Mencegah halaman reload

        // Ambil input dan ubah jadi huruf besar otomatis (misal: ds-001 -> DS-001)
        const crewId = crewIdInput.value.trim().toUpperCase();

        if (!crewId) {
            showMsg("ERROR: ID tidak boleh kosong.", "error");
            return;
        }

        // --- TAHAP 1: Mode Siaga (Loading) ---
        showMsg("Menghubungi Database Orbital...", "loading");
        loginBtn.disabled = true; // Kunci tombol agar tidak di-klik 2 kali
        loginBtn.style.opacity = "0.5";

        try {
            // --- TAHAP 2: Cek ke Google Sheets (via api.js) ---
            // Pastikan fungsi checkCrewId sudah ada di js/api.js kamu
            const response = await checkCrewId(crewId);

            if (response.status === "success") {
                // JIKA ID DITEMUKAN
                showMsg(`Akses Diterima. Memuat profil ${response.data.nama}...`, "success");
                
                // Simpan Crew ID di kantong memori browser (Session Storage)
                sessionStorage.setItem("ds_crew_id", crewId);
                
                // Catatan: ds_is_verified belum kita set 'true' karena belum lolos scan wajah.
                // Itu tugasnya js/face-logic.js nanti.

                // Alihkan ke halaman Radar (Kamera) setelah 1.5 detik
                setTimeout(() => {
                    window.location.href = "presensi.html";
                }, 1500);

            } else {
                // JIKA ID TIDAK ADA DI DATABASE
                showMsg("AKSES DITOLAK: ID tidak terdaftar di manifes.", "error");
                resetButton();
            }
        } catch (error) {
            console.error("Auth Error:", error);
            showMsg("GANGGUAN SINYAL: Gagal terhubung ke pusat data.", "error");
            resetButton();
        }
    });

    // Fungsi kecil untuk mengatur warna pesan teks terminal
    function showMsg(text, type) {
        loginMsg.textContent = text;
        if (type === "error") {
            loginMsg.style.color = "#ef4444"; // Merah bahaya
        } else if (type === "success") {
            loginMsg.style.color = "#10b981"; // Hijau sukses
        } else {
            loginMsg.style.color = "var(--text-secondary)"; // Abu-abu default
        }
    }

    // Fungsi untuk mengembalikan tombol jika gagal login
    function resetButton() {
        loginBtn.disabled = false;
        loginBtn.style.opacity = "1";
    }
});
