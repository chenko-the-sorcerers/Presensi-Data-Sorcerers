# Presensi Data Sorcerers: Orbital Gateway

## Overview

This repository hosts the **Presensi Data Sorcerers: Orbital Gateway** web application, a sophisticated biometric attendance and crew management system developed for Data Sorcerers Indonesia. The system is designed to streamline attendance tracking, new crew onboarding, and administrative oversight through a secure and intuitive interface. It leverages facial recognition technology for accurate identification and offers a comprehensive suite of features for both participants and administrators.

## Features

### User-Facing Features

*   **Orbital Gateway (Landing Page)**: The main entry point, providing access to key functionalities such as biometric attendance, new crew registration, and information about the internship program.
*   **Biometric Attendance (Presensi Kru)**: A secure system for registered crew members to log their attendance using facial recognition, ensuring accuracy and preventing proxy attendance.
*   **New Crew Registration (Registrasi Baru)**: A two-step onboarding protocol for new members, involving comprehensive data collection and initial biometric calibration.
*   **Mission Cockpit (Dashboard)**: A personalized dashboard for crew members to view their profile, monitor attendance status, and access their mission logs.
*   **Internship Program Portal**: A dedicated section for internship candidates, facilitating registration and talent verification (currently under development).

### Administrator-Facing Features (Overseer Command)

*   **Master Control Gerbang**: Manual control panel for administrators to manage attendance sessions, including setting active dates, opening/closing times, and target punctual times.
*   **Lokasi Radar Kalibrasi**: Geolocation calibration using an interactive map (Leaflet) to pinpoint and verify attendance locations, ensuring crew members are within designated areas.
*   **Transmisi Radar (Log Management)**: A detailed log of all attendance transmissions, allowing administrators to monitor crew check-ins, override statuses, and manage disciplinary points.
*   **Internal Klasemen (Leaderboard)**: A dynamic leaderboard displaying crew discipline points, fostering accountability and engagement.
*   **Security Protocols**: Features for secure logout and system initialization, ensuring administrative control and data integrity.

## Technology Stack

This project is built using a combination of front-end web technologies and external libraries to deliver a robust and interactive experience:

*   **HTML5**: For structuring the web content and defining the application layout.
*   **CSS3**: For styling the application, including a custom orbital-themed design, responsive components, and administrative interfaces.
*   **JavaScript**: Powers the interactive elements, client-side logic, and dynamic content loading.
*   **Face-api.js**: A JavaScript API for face detection, face recognition, and face landmark detection in the browser, crucial for the biometric attendance system.
*   **Leaflet.js**: An open-source JavaScript library for interactive maps, used in the admin panel for geolocation calibration.
*   **Flaticon UIcons**: For a consistent and modern icon set across the application.

## Project Structure

The repository is organized into logical directories to maintain a clear separation of concerns:

```
. 
├── admin-enroll.html       # Admin enrollment utility page
├── admin.html              # Administrator dashboard (Overseer Command)
├── components/             # Reusable HTML components (navbar, footer, sidebar, modal-alert)
├── css/                    # Stylesheets for various sections and components
├── dashboard.html          # User dashboard (Mission Cockpit)
├── error.html              # Generic error page
├── index.html              # Main landing page (Orbital Gateway)
├── internship.html         # Internship program page (under development)
├── js/                     # JavaScript files for core logic, API interactions, and page-specific functionalities
├── login.html              # Biometric login page
├── models/                 # Pre-trained models for face-api.js (e.g., face recognition, SSD MobileNetV1)
├── presensi.html           # Standalone biometric scan page
├── register.html           # New crew registration page
└── 404.html                # Custom 404 error page
```

## Setup and Installation

To set up and run the Presensi Data Sorcerers application locally, follow these steps:

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/chenko-the-sorcerers/Presensi-Data-Sorcerers.git
    cd Presensi-Data-Sorcerers
    ```

2.  **Navigate to the project directory**:
    ```bash
    cd presensi-ds
    ```

3.  **Open `index.html`**: 
    This is a front-end only application. You can open the `index.html` file directly in your web browser to access the Orbital Gateway. For local development with a server, you can use a simple HTTP server (e.g., `python3 -m http.server` or `npx serve`).

## Usage

Upon launching the application, users are presented with the Orbital Gateway, offering options for biometric attendance, new registrations, and internship program details. Registered crew members can log in via the biometric verification system to access their personalized dashboard. Administrators can utilize the Overseer Command panel to manage event parameters, monitor attendance logs, and oversee the crew leaderboard.

## Contributing

We welcome contributions to enhance the Presensi Data Sorcerers application. If you wish to contribute, please fork the repository, implement your changes, and submit a pull request. For significant modifications or new features, kindly open an issue first to discuss your proposed changes.

## License

This project is open-source and available under the [MIT License](LICENSE.md) (if applicable). Please refer to the `LICENSE.md` file for more details.
