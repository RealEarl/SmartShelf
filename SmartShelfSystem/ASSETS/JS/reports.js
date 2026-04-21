// REPORTS PAGE JS - PURE FIREBASE LIVE SYNC
import { auth, database } from "../AUTH/firebaseAuth.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { ref, update, onDisconnect, onValue, get } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

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
    const socket = io(); // Used only for video frame if needed
    const tableBody = document.querySelector('.table-body');

    // --- 1. PIE CHART INITIALIZATION ---
    const ctx = document.getElementById('freshnessChart').getContext('2d');
    const freshnessChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Fresh', 'Overripe', 'Spoiled'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#065e20', '#d18e31', '#bd2924'],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
            }
        }
    });

    // --- 2. LINE CHART INITIALIZATION (Spoilage Overtime) ---
    const spoilageCtx = document.getElementById('spoilageChart').getContext('2d');
    const spoilageChart = new Chart(spoilageCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Pear — Actual',
                    data: [],
                    borderColor: '#065e20',
                    backgroundColor: 'rgba(6,94,32,0.08)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false,
                },
                {
                    label: 'Pear — Forecast',
                    data: [],
                    borderColor: '#065e20',
                    borderDash: [6, 4],
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false,
                },
                {
                    label: 'Avocado — Actual',
                    data: [],
                    borderColor: '#f0ad4e',
                    backgroundColor: 'rgba(240,173,78,0.08)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false,
                },
                {
                    label: 'Avocado — Forecast',
                    data: [],
                    borderColor: '#f0ad4e',
                    borderDash: [6, 4],
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 100, title: { display: true, text: 'Spoilage (%)' } }
            }
        }
    });

    // --- 3. LIVE DATABASE LISTENER (The Core Logic) ---
    const fruitRef = ref(database, 'shelf/fruit');
    onValue(fruitRef, (snapshot) => {
        const fruitData = snapshot.val();
        if (!fruitData) return;

        if (tableBody) tableBody.innerHTML = ''; 

        let counts = { Fresh: 0, Overripe: 0, Spoiled: 0 };
        let pearActual = [], pearForecast = [], avoActual = [], avoForecast = [], timeLabels = [];
        
        // ---modified: Stats variables---
        let totalShelfLife = 0;
        let totalFruitsWithShelfLife = 0;
        // ---end modified---

        ['pear', 'avocado'].forEach(fruitType => {
            if (fruitData[fruitType]) {
                const ids = Object.keys(fruitData[fruitType]).sort((a, b) => 
                    parseInt(a.replace('ID', '')) - parseInt(b.replace('ID', '')));
                
                ids.forEach((idKey, index) => {
                    const item = fruitData[fruitType][idKey];
                    
                    if (counts[item.status] !== undefined) counts[item.status]++;

                    if(item.estimated_shelf_life_days !== undefined && item.estimated_shelf_life_days !== null) {
                        totalShelfLife += parseFloat(item.estimated_shelf_life_days);
                        totalFruitsWithShelfLife++;
                    }

                    // ---modified: Time, Date and Image Formatting---
                    const cleanTimestamp = item.timestamp.split('.')[0].replace(/-/g, "/");
                    const dateObj = new Date(cleanTimestamp);
                    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
                    const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    const fullDisplayTime = `${formattedDate} | ${formattedTime}`;

                    // Piliin ang tamang image base sa fruit type
                    const fruitImg = fruitType.toLowerCase() === 'pear' ? 'IMAGE/pear-image.png' : 'IMAGE/avocado-image.png';
                    const imgPath = `/ASSETS/${fruitImg}`;
                    // ---end modified---

                    const row = document.createElement('div');
                    row.className = 'table-row';
                    let sColor = item.status === "Fresh" ? "#065e20" : (item.status === "Overripe" ? "#f0ad4e" : "#d9534f");

                    row.innerHTML = `
                        <div class="col-fruit">
                            <img src="${imgPath}" class="fruit-img">
                            <span>${item.label} (${idKey})</span>
                        </div>
                        <div class="col-status" style="color: ${sColor}; font-weight: bold;">${item.status}</div>
                        <div class="col-time">${fullDisplayTime}</div>
                    `;
                    tableBody.appendChild(row);

                    if (fruitType === 'pear') {
                        timeLabels.push(`Scan ${index + 1}`);
                        pearActual.push(item.blemish_area_percentage || 0);
                        pearForecast.push(item.estimated_shelf_life_days || 0);
                    } else {
                        avoActual.push(item.blemish_area_percentage || 0);
                        avoForecast.push(item.estimated_shelf_life_days || 0);
                    }
                });
            }
        });

        // ---modified: Update Top Mini Metrics---
        const spoiledTotalEl = document.getElementById('spoilage-total');
        const shelfAvgEl = document.getElementById('spoilage-avg-shelf');
        if (spoiledTotalEl) spoiledTotalEl.textContent = counts.Spoiled;
        if (shelfAvgEl) {
            const avg = totalFruitsWithShelfLife > 0 ? (totalShelfLife / totalFruitsWithShelfLife).toFixed(1) : "0";
            shelfAvgEl.textContent = `${avg} Days`;
        }
        // ---end modified---

        document.getElementById('freshCount').textContent = counts.Fresh;
        document.getElementById('overripeCount').textContent = counts.Overripe;
        document.getElementById('spoiledCount').textContent = counts.Spoiled;
        freshnessChart.data.datasets[0].data = [counts.Fresh, counts.Overripe, counts.Spoiled];
        freshnessChart.update();

        spoilageChart.data.labels = timeLabels;
        spoilageChart.data.datasets[0].data = pearActual;
        spoilageChart.data.datasets[1].data = pearForecast;
        spoilageChart.data.datasets[2].data = avoActual;
        spoilageChart.data.datasets[3].data = avoForecast;
        spoilageChart.update();
    });

    // --- 4. EXCEL EXPORT ---
    const exportBtn = document.getElementById('export-excel-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async function() {
            exportBtn.textContent = '⏳ Preparing...';
            try {
                const [fruitSnap] = await Promise.all([ get(ref(database, 'shelf/fruit')) ]);
                const wb = XLSX.utils.book_new();
                let fruitArray = [];
                const fruits = fruitSnap.val() || {};
                Object.entries(fruits).forEach(([name, ids]) => {
                    Object.entries(ids).forEach(([id, data]) => {
                        fruitArray.push({ Fruit: name, ID: id, ...data });
                    });
                });
                const ws1 = XLSX.utils.json_to_sheet(fruitArray);
                XLSX.utils.book_append_sheet(wb, ws1, 'Detections');
                XLSX.writeFile(wb, `SmartShelf_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            } catch (err) { alert('Export failed.'); }
            exportBtn.textContent = '📥 Export Excel';
        });
    }

    // --- 5. LOGOUT & PRESENCE ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const userRef = ref(database, 'users/' + user.uid);
            update(userRef, { status: "online", last_login: new Date().toLocaleString('en-PH') });
            onDisconnect(userRef).update({ status: "offline", last_logout: new Date().toLocaleString('en-PH') });
        }
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (confirm("Are you sure you want to logout?")) {
                await signOut(auth);
                window.location.href = '/';
            }
        });
    }
});