document.addEventListener('DOMContentLoaded', function() {
    // --- GLOBAL VARIABLES ---
    // Initialize Socket.IO (Automatically connects to the Flask server)
    const socket = io();
    let isDetectionRunning = false;

    /*SECTION 1: UI & NAVIGATION LOGIC*/
    
    // 1. Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-btn');
    
    if (sidebar && toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            // Save preference to browser storage
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebar-collapsed', isCollapsed);
        });

        // Restore preference on load
        const savedState = localStorage.getItem('sidebar-collapsed');
        if (savedState === 'true') {
            sidebar.classList.add('collapsed');
        }
    }

    // 2. Active Link Highlighting
    const currentPage = window.location.pathname.split("/").pop();
    const navItems = document.querySelectorAll('#sidebar ul li');

    navItems.forEach(item => {
        const link = item.querySelector('a');
        if (link) {
            const href = link.getAttribute('href');
            // Highlight if paths match (or if root / matches index.html)
            if (href === currentPage || (currentPage === '' && href === 'index.html')) {
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            }
        }
    });

    // 3. Status Card Buttons (The little arrows)
    const expandButtons = document.querySelectorAll('.btn-down');
    expandButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); // Stop click from triggering parent elements
            this.classList.toggle('active');
        });
    });


    /*SECTION 2: CAMERA & DETECTION CONTROLS*/

    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const cameraSelect = document.getElementById('cameraSelect');
    const loadingSpinner = document.getElementById('loadingSpinner');

    // Button: Start Detection
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            const cameraIndex = parseInt(cameraSelect.value) || 0;
            
            // Send command to Python
            socket.emit('start_detection', { camera_index: cameraIndex });
            isDetectionRunning = true;
            
            // Update UI
            this.disabled = true;
            if (stopBtn) stopBtn.disabled = false;
            if (loadingSpinner) loadingSpinner.style.display = 'flex';
            
            // updateStatus('Starting detection...', 'info'); // Optional helper
        });
    }

    // Button: Stop Detection
    if (stopBtn) {
        stopBtn.addEventListener('click', function() {
            socket.emit('stop_detection');
            isDetectionRunning = false;
            
            this.disabled = true;
            if (startBtn) startBtn.disabled = false;
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            
            // Clear image
            const frame = document.getElementById('detectionFrame');
            if (frame) frame.src = ''; 
            
            // Reset Counts in UI
            resetDashboardCounts();

            // updateStatus('Detection stopped', 'info'); // Optional helper
        });
    }

    // Input: Switch Camera (Optional extra logic)
    if (cameraSelect) {
        cameraSelect.addEventListener('change', function() {
            if (isDetectionRunning) {
                // If running, restart with new camera
                socket.emit('stop_detection');
                setTimeout(() => {
                    const cameraIndex = parseInt(this.value);
                    socket.emit('start_detection', { camera_index: cameraIndex });
                }, 500);
            }
        });
    }


    /*SECTION 3: SOCKET.IO EVENT LISTENERS*/

    // 1. Connection Established
    socket.on('connect', function() {
        console.log("Connected to Flask Server");
        // Ask server for list of available cameras
        socket.emit('list_cameras');
    });

    // 2. Receive Detection Data (The Core Logic)
    socket.on('detection', function(data) {
        // A. Update Video Frame
        const frameEl = document.getElementById('detectionFrame');
        if (data.frame && frameEl) {
            frameEl.src = 'data:image/jpeg;base64,' + data.frame;
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        }

        // --- NEW: Update Top Status Cards ---

        // B. Update "Total Fruits" Card
        // Finds the .status span inside the .total-fruits card
        const totalCard = document.querySelector('.total-fruits .status-wrapper .status'); 
        if (totalCard) {
            // Replaces text with label + count
            totalCard.innerHTML = `Total Fruits <br> <span style="font-size: 1.5em; color: #065e20;">${data.total}</span>`;
        }

        // C. Update "Fresh" Card (Shows the main detected class)
        const freshCard = document.querySelector('.fresh .status-wrapper .status');
        if (freshCard && data.labels) {
            // Get the first detected fruit name (e.g., "Pear_A")
            const mainLabel = Object.keys(data.labels)[0] || "-";
            freshCard.innerHTML = `Fresh <br> <span style="font-size: 1.2em; color: #065e20;">${mainLabel}</span>`;
        }

        // D. Update "Spoiled" Card (Example: looks for "Spoiled" key in labels)
        const spoiledCard = document.querySelector('.spoiled .status');
        if (spoiledCard && data.labels) {
             const spoiledCount = data.labels['Spoiled'] || 0;
             spoiledCard.innerHTML = `Spoiled <br> <span style="font-size: 1.5em; color: red;">${spoiledCount}</span>`;
        }

        // --- End New Section ---

        // E. Update Freshness Overview List (Right Side Box)
        if (data.labels) {
            // Safely update text content if elements exist
            const freshCountEl = document.getElementById('freshCount');
            if(freshCountEl) freshCountEl.textContent = data.labels['Fresh'] || 0;
            
            const spoiledCountEl = document.getElementById('spoiledCount');
            if(spoiledCountEl) spoiledCountEl.textContent = data.labels['Spoiled'] || 0;

            const attentionCountEl = document.getElementById('attentionCount');
            // Assuming "Needs Attention" might be a label like "Ripe" or similar
            if(attentionCountEl) attentionCountEl.textContent = data.labels['Ripe'] || 0; 
        }

        // F. Update FPS (Optional)
        const fpsEl = document.getElementById('fpsCounter');
        if (fpsEl && data.fps) fpsEl.textContent = 'FPS: ' + data.fps;
    });

    // 3. Handle Errors from Server
    socket.on('error', function(data) {
        console.error('Socket Error:', data);
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (startBtn) startBtn.disabled = false;
    });

    // 4. Populate Camera List
    socket.on('cameras_list', function(data) {
        if (cameraSelect && data.cameras) {
            // Keep the default option
            cameraSelect.innerHTML = '<option value="0">Camera 0 (Default)</option>';
            
            // Add other found cameras
            data.cameras.forEach(index => {
                if (index !== 0) {
                    const option = document.createElement('option');
                    option.value = index;
                    option.text = `Camera ${index}`;
                    cameraSelect.appendChild(option);
                }
            });
        }
    });

    /*HELPER FUNCTIONS*/
    
    function resetDashboardCounts() {
        // Reset Total
        const totalCard = document.querySelector('.total-fruits .status-wrapper .status');
        if (totalCard) totalCard.innerHTML = `Total Fruits`;

        // Reset Fresh
        const freshCard = document.querySelector('.fresh .status-wrapper .status');
        if (freshCard) freshCard.innerHTML = `Fresh`;
        
        // Reset Spoiled
        const spoiledCard = document.querySelector('.spoiled .status');
        if (spoiledCard) spoiledCard.innerHTML = `Spoiled`;

        // Reset List
        if(document.getElementById('freshCount')) document.getElementById('freshCount').textContent = '0';
        if(document.getElementById('spoiledCount')) document.getElementById('spoiledCount').textContent = '0';
        if(document.getElementById('attentionCount')) document.getElementById('attentionCount').textContent = '0';
    }
});