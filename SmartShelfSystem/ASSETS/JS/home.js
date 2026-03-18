document.addEventListener('DOMContentLoaded', function() {
    const socket = io();
    let isDetectionRunning = false;

    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-btn');
    
    if (sidebar && toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebar-collapsed', isCollapsed);
        });

        const savedState = localStorage.getItem('sidebar-collapsed');
        if (savedState === 'true') {
            sidebar.classList.add('collapsed');
        }
    }

    const currentPage = window.location.pathname.split("/").pop();
    const navItems = document.querySelectorAll('#sidebar ul li');

    navItems.forEach(item => {
        const link = item.querySelector('a');
        if (link) {
            const href = link.getAttribute('href');
            if (href === currentPage || (currentPage === '' && href === 'index.html')) {
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            }
        }
    });

    const expandButtons = document.querySelectorAll('.btn-down');
    expandButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); 
            this.classList.toggle('active');
        });
    });

    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const cameraSelect = document.getElementById('cameraSelect');
    const loadingSpinner = document.getElementById('loadingSpinner');

    // INSTANTLY LOAD CAMERA OPTIONS
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
            if (frame) {
                if (cameraValue === 'phone') {
                    frame.src = 'http://192.168.137.234:8080/video';
                } else {
                    frame.src = ''; // Clear for USB base64 injection
                }
            }
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
            if (frame) {
                frame.src = '';
            }
            
            resetDashboardCounts();
        });
    }

    if (cameraSelect) {
        cameraSelect.addEventListener('change', function() {
            if (isDetectionRunning) {
                socket.emit('stop_detection');
                setTimeout(() => {
                    const cameraValue = this.value;
                    socket.emit('start_detection', { camera_index: cameraValue });
                }, 500);
            }
        });
    }

    socket.on('connect', function() {
        console.log("Connected to Flask Server");
        // Removed the slow socket.emit('list_cameras') request
    });

    socket.on('detection_data', function(data) {
        if (loadingSpinner) loadingSpinner.style.display = 'none';

        if (data.frame && cameraSelect.value !== 'phone') {
            const frameEl = document.getElementById('videoFeed');
            if (frameEl) {
                frameEl.src = "data:image/jpeg;base64," + data.frame;
            }
        }

        const totalCard = document.querySelector('.total-fruits .status-wrapper .status'); 
        if (totalCard) {
            totalCard.innerHTML = `Total Fruits <br> <span style="font-size: 1.5em; color: #065e20;">${data.total}</span>`;
        }

        const freshCard = document.querySelector('.fresh .status-wrapper .status');
        if (freshCard && data.labels) {
            const mainLabel = Object.keys(data.labels)[0] || "None";
            freshCard.innerHTML = `Fresh <br> <span style="font-size: 1.2em; color: #065e20;">${mainLabel}</span>`;
        }

        const spoiledCard = document.querySelector('.spoiled .status');
        if (spoiledCard && data.labels) {
             const spoiledCount = data.labels['Spoiled'] || 0;
             spoiledCard.innerHTML = `Spoiled <br> <span style="font-size: 1.5em; color: red;">${spoiledCount}</span>`;
        }

        const freshCountEl = document.getElementById('freshCount');
        if(freshCountEl) freshCountEl.textContent = data.labels['Fresh'] || 0;
        
        const spoiledCountEl = document.getElementById('spoiledCount');
        if(spoiledCountEl) spoiledCountEl.textContent = data.labels['Spoiled'] || 0;

        const attentionCountEl = document.getElementById('attentionCount');
        if(attentionCountEl) attentionCountEl.textContent = data.labels['Needs Attention'] || data.labels['Attention'] || 0; 
    });

    socket.on('sensor_data', function(data) {
        const fruits = ["pear", "avocado", "mangosteen"];
        fruits.forEach(function(fruit) {
            const hum = document.getElementById("humidity-" + fruit);
            if (hum) hum.innerText = data.HUM ? data.HUM + "%" : "0%";
            
            const temp = document.getElementById("temp-" + fruit);
            if (temp) temp.innerText = data.TEMP ? data.TEMP + "°C" : "0°C";
            
            const gas = document.getElementById("gas-" + fruit);
            if (gas) gas.innerText = (data.MQ3 && data.MQ135) ? `MQ3: ${data.MQ3}, MQ135: ${data.MQ135}` : "0";
            
            const time = document.getElementById("time-" + fruit);
            if (time) time.innerText = new Date().toLocaleTimeString();
            
            const status = document.getElementById("status-" + fruit);
            if (status) status.innerText = (data.HUM && data.TEMP) ? "Active" : "Waiting";
        });
    });

    socket.on('error', function(data) {
        console.error('Socket Error:', data);
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (startBtn) startBtn.disabled = false;
    });

    function resetDashboardCounts() {
        const totalCard = document.querySelector('.total-fruits .status-wrapper .status');
        if (totalCard) totalCard.innerHTML = `Total Fruits`;

        const freshCard = document.querySelector('.fresh .status-wrapper .status');
        if (freshCard) freshCard.innerHTML = `Fresh`;
        
        const spoiledCard = document.querySelector('.spoiled .status');
        if (spoiledCard) spoiledCard.innerHTML = `Spoiled`;

        if(document.getElementById('freshCount')) document.getElementById('freshCount').textContent = '0';
        if(document.getElementById('spoiledCount')) document.getElementById('spoiledCount').textContent = '0';
        if(document.getElementById('attentionCount')) document.getElementById('attentionCount').textContent = '0';
    }
});