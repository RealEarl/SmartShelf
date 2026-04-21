// HOME PAGE JS - CLEAN FIREBASE ONLY VERSION
import { auth, database } from "../AUTH/firebaseAuth.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { ref, update, onDisconnect, onValue } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

// 1. Auth Guard
onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        initPage(user);
    } else {
        window.location.href = "/";
    }
});

function initPage(user) {
    // 2. Presence System (Optional pero maganda para sa Admin status)
    const userRef = ref(database, 'users/' + user.uid);
    const phTime = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    update(userRef, { status: "online", last_login: phTime });
    onDisconnect(userRef).update({ status: "offline", last_logout: phTime });

    // 3. MAIN LOGIC: COUNTER & TRAY GENERATOR
    const fruitRef = ref(database, 'shelf/fruit');
    
    onValue(fruitRef, (snapshot) => {
        const fruitData = snapshot.val();
        
        let totalCount = 0;
        let freshCount = 0;
        let overripeCount = 0;
        let spoiledCount = 0;

        const trayContainer = document.getElementById('tray-container');
        if (trayContainer) {
            trayContainer.innerHTML = ''; // Linisin muna ang container
        }

        if (fruitData) {
            let trayCounter = 1;

            // I-loop ang pear, avocado, etc.
            for (const fruitType in fruitData) {
                const ids = fruitData[fruitType];

                // I-loop ang ID1, ID2, ID3...
                for (const idKey in ids) {
                    const details = ids[idKey];
                    totalCount++;

                    // Counter Logic
                    if (details.status === "Fresh") freshCount++;
                    else if (details.status === "Overripe") overripeCount++;
                    else if (details.status === "Spoiled") spoiledCount++;

                    // --- GENERATE TRAY CARD ---
                    if (trayContainer) {
                        let sColor = "#000";
                        if (details.status === "Fresh") sColor = "#065e20";
                        else if (details.status === "Overripe") sColor = "#f0ad4e";
                        else if (details.status === "Spoiled") sColor = "#d9534f";

                        const trayDiv = document.createElement('div');
                        trayDiv.className = 'tray-card';
                        trayDiv.innerHTML = `
                            <div class="tray-header">TRAY ${trayCounter}:</div>
                            <div class="tray-details">
                                <p><strong>FRUIT:</strong> ${details.label || fruitType} (${idKey})</p>
                                <p><strong>STATUS:</strong> <span style="color: ${sColor}; font-weight: bold;">${details.status || "N/A"}</span></p>
                                <p><strong>ESTIMATED OVERRIPE:</strong> N/A Days</p>
                                <p><strong>ESTIMATED SPOILAGE:</strong> ${details.estimated_shelf_life_days ?? 0} Days</p>
                            </div>
                        `;
                        trayContainer.appendChild(trayDiv);
                        trayCounter++;
                    }
                }
            }
        }

        // --- UPDATE TOP CARDS ---
        const updateUI = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        updateUI('total-fruits-count', totalCount);
        updateUI('stats-count', freshCount);
        updateUI('overripe-count', overripeCount);
        updateUI('spoiled-count', spoiledCount);
        
    }, (error) => {
        console.error("Firebase Error:", error);
    });

    // 4. Logout
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        if (confirm("Logout?")) {
            await signOut(auth);
            window.location.href = "/";
        }
    });
}