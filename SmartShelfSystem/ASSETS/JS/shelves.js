// SETTINGS PAGE JS
import { auth, database } from "../AUTH/firebaseAuth.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { ref, update, onDisconnect } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

document.addEventListener('DOMContentLoaded', function() {
    const socket = io();

    // Presence System (Update status to offline if tab is closed)
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const userRef = ref(database, 'users/' + user.uid);
            const phTime = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
            onDisconnect(userRef).update({
                status: "offline",
                last_logout: phTime
            });
        }
    });

    // --- SAME LOGOUT LOGIC AS HOME & REPORTS ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function (e) {
            e.preventDefault();
            const confirmLogout = confirm("Are you sure you want to logout?");
            if (confirmLogout) {
                try {
                    const user = auth.currentUser;
                    if (user) {
                        const userRef = ref(database, 'users/' + user.uid);
                        const phTime = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });

                        console.log("Updating status to offline...");
                        await update(userRef, { 
                            status: "offline",
                            last_logout: phTime 
                        });
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

    socket.on('connect', () => console.log("Connected to Flask Server (Settings)"));
});