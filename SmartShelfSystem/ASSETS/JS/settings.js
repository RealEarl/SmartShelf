// SETTINGS PAGE JS
import { auth, database } from "../AUTH/firebaseAuth.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { ref, update, onDisconnect, onValue } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

// MODIFIED — Auth Guard: wrapped everything inside onAuthStateChanged
// instead of await requireAuth() na nagbo-block ng data loading
onAuthStateChanged(auth, (user) => {
    if (!user || !user.emailVerified) {
        window.location.href = "/";
        return;
    }
 
    // ✅ Only runs if logged in — all page logic is safe inside here
    initPage(user);
});

document.addEventListener('DOMContentLoaded', function() {
    const socket = io();

    // 1. Presence System
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userRef = ref(database, 'users/' + user.uid);
        const connectedRef = ref(database, '.info/connected');
        const phTime = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });

        onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                // Magiging online kapag nag-load ang page
                update(userRef, {
                    status: "online",
                    last_login: phTime
                });

                // Magiging offline lang kapag na-close ang tab o nawalan ng internet
                onDisconnect(userRef).update({
                    status: "offline",
                    last_logout: phTime
                });
            }
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