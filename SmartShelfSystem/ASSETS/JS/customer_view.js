// DEBUG VERSION
console.log("Customer View JS Loaded");

import { database } from "../AUTH/firebaseAuth.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

// 1. Siguraduhin na connected sa Database
if (!database) {
    console.error("Database connection failed. Check your import path.");
} else {
    console.log("Firebase Database object connected.");
}

function initCustomerView() {
    const fruitRef = ref(database, 'shelf/fruit');
    
    console.log("Listening to path: shelf/fruit...");

    onValue(fruitRef, (snapshot) => {
        const fruitData = snapshot.val();
        console.log("Snapshot received:", fruitData);

        if (!fruitData) {
            console.warn("No data found at 'shelf/fruit'. Check your Firebase structure.");
            return;
        }

        let totalCount = 0;
        let freshCount = 0;
        let overripeCount = 0;
        let spoiledCount = 0;

        const trayContainer = document.getElementById('tray-container');
        if (trayContainer) {
            trayContainer.innerHTML = ''; 
        }

        // Loop gaya ng nasa home.js mo
        for (const fruitType in fruitData) {
            const ids = fruitData[fruitType];
            for (const idKey in ids) {
                const details = ids[idKey];
                totalCount++;

                if (details.status === "Fresh") freshCount++;
                else if (details.status === "Overripe") overripeCount++;
                else if (details.status === "Spoiled") spoiledCount++;

                if (trayContainer) {
                    let sColor = "#000";
                    if (details.status === "Fresh") sColor = "#065e20";
                    else if (details.status === "Overripe") sColor = "#f0ad4e";
                    else if (details.status === "Spoiled") sColor = "#d9534f";

                    const trayDiv = document.createElement('div');
                    trayDiv.className = 'tray-card';
                    trayDiv.innerHTML = `
                        <div class="tray-header">TRAY ${totalCount}:</div>
                        <div class="tray-details">
                            <p><strong>FRUIT:</strong> ${details.label || fruitType} (${idKey})</p>
                            <p><strong>STATUS:</strong> <span style="color: ${sColor}; font-weight: bold;">${details.status || "N/A"}</span></p>
                            <p><strong>ESTIMATED SPOILAGE:</strong> ${details.estimated_shelf_life_days ?? 0} Days</p>
                        </div>
                    `;
                    trayContainer.appendChild(trayDiv);
                }
            }
        }

        // Update UI
        document.getElementById('total-fruits-count').textContent = totalCount;
        document.getElementById('stats-count').textContent = freshCount;
        document.getElementById('overripe-count').textContent = overripeCount;
        document.getElementById('spoiled-count').textContent = spoiledCount;
        
    }, (error) => {
        console.error("Firebase Read Error:", error);
    });
}

initCustomerView();