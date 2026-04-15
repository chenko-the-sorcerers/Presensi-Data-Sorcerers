// ==========================================
// DATA SORCERERS - ORBITAL API BRIDGE 4.1
// Project: Overseer Command Center // 2026
// Update: Error Handling Redirection (500/503)
// ==========================================

/** * PENTING: Jika Kapten melakukan 'New Deployment' di GAS,
 * pastikan URL di bawah ini diperbarui sesuai dengan URL yang diberikan Google.
 */
const BASE_URL = "https://script.google.com/macros/s/AKfycbxiTFe-Ie6Q3wjSleVw1S25GuPRTfkdSphZwvUoyMAGAKU-i3fVvFxy24DOZJEEbb_n/exec";

/**
 * 1. PROTOKOL GET (Universal Fetcher)
 * Ditambahkan: Redirection logic untuk kegagalan sinyal satelit.
 */
async function orbitalFetch(params) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${BASE_URL}?${queryString}`;

    try {
        const response = await fetch(url);
        
        // Handling Sektor 503: Service Unavailable (Maintenance)
        if (response.status === 503) {
            window.location.href = 'error.html?type=503';
            return;
        }

        if (!response.ok) throw new Error("Base Station Offline");
        
        const result = await response.json();
        return result;

    } catch (error) {
        console.error("Signal Interpretation Error:", error);
        // Redirection ke Sektor 500: Internal Server Error / Connection Lost
        window.location.href = 'error.html?type=500';
    }
}

/**
 * 2. PROTOKOL POST (Universal Transmitter)
 */
async function orbitalPost(payload) {
    try {
        const response = await fetch(BASE_URL, {
            method: "POST",
            body: JSON.stringify(payload),
            redirect: "follow",
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
        });

        // Handling Sektor 503 pada metode POST
        if (response.status === 503) {
            window.location.href = 'error.html?type=503';
            return;
        }

        const result = await response.json();
        return result;

    } catch (error) {
        console.error("Critical Signal Loss:", error);
        // Redirection ke Sektor 500 jika transmisi gagal total
        window.location.href = 'error.html?type=500';
    }
}

/**
 * 3. LEGACY WRAPPERS (Protokol Lama)
 * Dipertahankan agar komponen lama tetap berfungsi.
 */

// Mengecek Crew ID (Dossier Sync)
async function checkCrewId(id) {
    return await orbitalFetch({ 
        action: "get_crew", 
        id: id 
    });
}

// Mengirim Presensi (Attendance Submit)
async function submitAttendance(data) {
    return await orbitalPost({ 
        action: "submit_attendance", 
        ...data 
    });
}

/**
 * 4. NEW OVERSEER COMMANDS
 * Fungsi spesifik untuk Dashboard Admin Kapten.
 */

// Sinkronisasi Konfigurasi Pangkalan
async function getConfig() {
    return await orbitalFetch({ action: "get_config" });
}

// Menarik Klasemen Intelijen
async function getLeaderboard() {
    return await orbitalFetch({ action: "get_leaderboard" });
}

// Update Embedding Wajah (Biometrik)
async function enrollFace(crewId, embedding) {
    return await orbitalPost({
        action: "enroll_face",
        crew_id: crewId,
        embedding: embedding
    });
}
