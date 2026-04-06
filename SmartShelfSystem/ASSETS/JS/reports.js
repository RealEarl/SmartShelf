// REPORTS PAGE JS
import { auth, database } from "../AUTH/firebaseAuth.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { ref, update, onDisconnect } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

document.addEventListener('DOMContentLoaded', function() {
    const socket = io();

    // 1. Presence System (Keep this so status updates even on reports page)
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

    // 2. Table Logic (Time and Status Updates Only)
    socket.on('sensor_data', function(data) {
        // Pear and Avocado (Mangosteen removed from scope)
        const fruits = ["pear", "avocado"];
        
        fruits.forEach(function(fruit) {
            // Update Time Column
            const timeEl = document.getElementById("time-" + fruit);
            if (timeEl) {
                timeEl.innerText = new Date().toLocaleTimeString('en-PH');
            }

            // Update Status Column
            // Nilagay nating 'Active' kung may narereceive na kahit anong data packet
            const statusEl = document.getElementById("status-" + fruit);
            if (statusEl) {
                statusEl.innerText = (data.HUM && data.TEMP) ? "Active" : "Waiting";
                statusEl.style.color = (data.HUM && data.TEMP) ? "#065e20" : "#888";
            }
        });
    });

    // 3. Logout Logic
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

                        await update(userRef, { 
                            status: "offline",
                            last_logout: phTime 
                        });
                    }

                    await signOut(auth);
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '/';

                } catch (error) {
                    console.error("Logout Error:", error);
                    window.location.href = '/';
                }
            }
        });
    }

    // 4. Socket Connection Log
    socket.on('connect', function() {
        console.log("Connected to Flask Server - Reports View");
    });
});