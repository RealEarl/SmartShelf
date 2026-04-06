// HOME PAGE JS - CAMERA & LOGOUT ONLY
import { auth, database } from "../AUTH/firebaseAuth.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { ref, update, onDisconnect } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

document.addEventListener('DOMContentLoaded', function() {
    const socket = io();
    let isDetectionRunning = false;

    // Presence System
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const userRef = ref(database, 'users/' + user.uid);
            const phTime = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
            onDisconnect(userRef).update({ status: "offline", last_logout: phTime });
        }
    });

    // Sidebar Active State Logic
    const currentPage = window.location.pathname.split("/").pop();
    const navItems = document.querySelectorAll('#sidebar ul li');
    navItems.forEach(item => {
        const link = item.querySelector('a');
        if (link && (link.getAttribute('href') === currentPage || (currentPage === '' && link.getAttribute('href') === 'index.html'))) {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        }
    });

    // Camera Controls
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const cameraSelect = document.getElementById('cameraSelect');
    const loadingSpinner = document.getElementById('loadingSpinner');

    if (cameraSelect) {
        cameraSelect.innerHTML = `
            <option value="phone">Phone Camera (IP)</option>
            <option value="0">USB Camera 0 (Default/BuiltIn)</option>
            <option value="1">USB Camera 1</option>
        `;
    }

    if (startBtn) {
        startBtn.addEventListener('click', function() {
            const cameraValue = cameraSelect.value;
            socket.emit('start_detection', { camera_index: cameraValue });
            isDetectionRunning = true;
            this.disabled = true;
            if (stopBtn) stopBtn.disabled = false;
            if (loadingSpinner) loadingSpinner.style.display = 'flex';
            const frame = document.getElementById('videoFeed');
            if (frame && cameraValue === 'phone') frame.src = 'http://192.168.137.234:8080/video';
        });
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', function() {
            socket.emit('stop_detection');
            isDetectionRunning = false;
            this.disabled = true;
            if (startBtn) startBtn.disabled = false;
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            const frame = document.getElementById('videoFeed');
            if (frame) frame.src = '';
            resetDashboardCounts();
        });
    }

    // Detection Data (Cards Update Only)
    socket.on('detection_data', function(data) {
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (data.frame && cameraSelect.value !== 'phone') {
            const frameEl = document.getElementById('videoFeed');
            if (frameEl) frameEl.src = "data:image/jpeg;base64," + data.frame;
        }
        // Dashboard Summary Cards Update
        if(document.getElementById('freshCount')) document.getElementById('freshCount').textContent = data.labels['Fresh'] || 0;
        if(document.getElementById('spoiledCount')) document.getElementById('spoiledCount').textContent = data.labels['Spoiled'] || 0;
    });

    function resetDashboardCounts() {
        if(document.getElementById('freshCount')) document.getElementById('freshCount').textContent = '0';
        if(document.getElementById('spoiledCount')) document.getElementById('spoiledCount').textContent = '0';
    }

    // Logout Logic (Exactly mirrored with Reports)
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function (e) {
            e.preventDefault();
            if (confirm("Are you sure you want to logout?")) {
                try {
                    const user = auth.currentUser;
                    if (user) {
                        const userRef = ref(database, 'users/' + user.uid);
                        const phTime = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
                        console.log("Updating status to offline...");
                        await update(userRef, { status: "offline", last_logout: phTime });
                        console.log("Database updated!");
                    }
                    await signOut(auth);
                    localStorage.clear();
                    sessionStorage.clear();
                    console.log("Redirecting...");
                    window.location.href = '/';
                } catch (error) {
                    console.error("Logout Error:", error);
                    window.location.href = '/';
                }
            }
        });
    }

    socket.on('connect', function() {
    console.log("Connected to Flask Server (Home)");
});
});