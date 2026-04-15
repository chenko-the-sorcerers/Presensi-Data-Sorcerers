// ==========================================
// DATA SORCERERS - ORBITAL CORE SYSTEMS
// Project: Orbital Cockpit // Version 2.1 (Responsive)
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    loadNavbar();
    loadFooter();
});

function loadNavbar() {
    const container = document.getElementById("navbar-container");
    if (!container) return;

    const crewId   = sessionStorage.getItem("ds_active_crew_id");
    const crewName = sessionStorage.getItem("ds_active_crew_name");

    let navLinks  = '';
    let statusHtml = '';
    let hamburgerHtml = ''; 

    if (crewId) {
        navLinks = `
            <li><a href="dashboard.html" class="nav-link">Dashboard</a></li>
            <li><a href="presensi.html" class="nav-link">Radar Scan</a></li>
            <li><a href="#" id="navLogoutBtn" class="nav-link" style="color:#ef4444;">
                <i class="fi fi-rr-sign-out-alt"></i> Eject
            </a></li>
        `;
        statusHtml = `
            <div class="nav-status">
                <div class="status-indicator online"></div>
                <span class="status-text">SYSTEM ONLINE</span>
            </div>
        `;
        // Tombol menu responsif (Hamburger)
        hamburgerHtml = `
            <div class="menu-toggle" id="mobile-menu-btn">
                <i class="fi fi-rr-menu-burger"></i>
            </div>
        `;
    } else {
        navLinks  = ``;
        statusHtml = `
            <div class="nav-status locked">
                <div class="status-indicator offline"></div>
                <span class="status-text warning">MENUNGGU OTORISASI</span>
            </div>
        `;
        hamburgerHtml = ``; 
    }

    container.innerHTML = `
        <nav class="navbar-component">
            <div class="nav-container">
                <div class="nav-brand">DATA SORCERERS</div>
                ${hamburgerHtml}
                <ul class="nav-menu" id="nav-menu-list">
                    ${navLinks}
                </ul>
                ${statusHtml}
            </div>
        </nav>
    `;

    // Logika Tombol Eject
    const navLogoutBtn = document.getElementById("navLogoutBtn");
    if (navLogoutBtn) {
        navLogoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            sessionStorage.removeItem("ds_active_crew_id");
            sessionStorage.removeItem("ds_active_crew_name");
            sessionStorage.removeItem("ds_active_crew_divisi");
            window.location.href = "login.html";
        });
    }

    // Logika Toggle Menu Mobile
    const menuBtn = document.getElementById("mobile-menu-btn");
    const navMenu = document.getElementById("nav-menu-list");
    if (menuBtn && navMenu) {
        menuBtn.addEventListener("click", () => {
            navMenu.classList.toggle("active");
        });
    }
}

function loadFooter() {
    const container = document.getElementById("footer-container");
    if (!container) return;

    container.innerHTML = `
        <footer class="footer-component">
            <div class="footer-container">
                <span>&copy; 2026 PT. Data Sorcerers Indonesia</span>
                <span class="sector-code">SECTOR: INDONESIA | SECURITY PROTOCOL v2.3.7</span>
            </div>
        </footer>
    `;
}
