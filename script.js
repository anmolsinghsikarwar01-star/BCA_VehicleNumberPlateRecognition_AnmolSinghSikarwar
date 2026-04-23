/* Navigation */
const pageMap = {
    live:      { nav: 'nav-live',      page: 'page-live',      title: 'Vehicle Recognition Feed' },
    logs:      { nav: 'nav-logs',      page: 'page-logs',      title: 'Historical Detection Records' },
    analytics: { nav: 'nav-analytics', page: 'page-analytics', title: 'System Analytics & Reporting' }
};

function showPage(key) {
    Object.entries(pageMap).forEach(([k, v]) => {
        document.getElementById(v.nav).classList.toggle('active', k === key);
        document.getElementById(v.page).classList.toggle('active', k === key);
    });
    document.getElementById('page-title').innerHTML = pageMap[key].title;
    if (key === 'analytics') setTimeout(drawChart, 50);
}

/* Live tab switching */
function switchLiveTab(viewId, el) {
    el.closest('.tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('view-livefeed').style.display    = viewId === 'livefeed'     ? 'block' : 'none';
    document.getElementById('view-uploadvideo').style.display = viewId === 'uploadvideo'  ? 'flex'  : 'none';
}

/* File picker */
function triggerFileSelect() {
    document.getElementById('fileInput').click();
}

function handleFile(input) {
    if (!input.files || !input.files[0]) return;
    const url   = URL.createObjectURL(input.files[0]);
    const video = document.getElementById('uploadedVideo');
    const placeholder = document.getElementById('uploadPlaceholder');
    video.src = url;
    video.style.display = 'block';
    placeholder.style.display = 'none';
    document.getElementById('uploadVideoCard').style.cursor = 'default';
    document.getElementById('uploadVideoCard').onclick = null;
}

// --- NEW FUNCTION: UPLOAD AND PROCESS ---
async function uploadAndProcess() {
    const fileInput = document.getElementById('fileInput');
    const label = document.getElementById('initLabel');
    const startBtn = document.querySelector('.start-btn'); // Get the button
    
    if (!fileInput.files[0]) {
        alert("Please select a video file first!");
        return;
    }

    // 1. Visual Feedback: Disable button and show loading state
    startBtn.disabled = true; 
    startBtn.style.opacity = "0.5";
    startBtn.style.cursor = "not-allowed";
    label.textContent = 'SYSTEM RUNNING... PLEASE WAIT';
    
    // Optional: Add a CSS loading spinner or change color
    label.style.color = "#f1c40f"; 

    const formData = new FormData();
    formData.append('video', fileInput.files[0]);

    try {
        console.log("Sending video to backend...");
        const response = await fetch('/upload_video', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            label.textContent = 'PROCESSING COMPLETE';
            label.style.color = "#22c55e";
            updateLogsTable(data.result);
        } else {
            label.textContent = 'ERROR: ' + data.error;
            label.style.color = "#e74c3c";
        }
    } catch (error) {
        label.textContent = 'NETWORK ERROR';
        console.error("Error:", error);
    } finally {
        // 2. Re-enable button after processing is done
        startBtn.disabled = false;
        startBtn.style.opacity = "1";
        startBtn.style.cursor = "pointer";
    }
}

// Helper to add findings to your table
function updateLogsTable(plates) {
    const tableBody = document.querySelector('.table-body');
    const noRecords = document.querySelector('.no-records');
    
    if (noRecords) noRecords.remove();

    plates.forEach(plateInfo => {
        const row = document.createElement('div');
        row.className = 'table-row';
        
        // Remove grid and use flex for a single-line row
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.padding = '10px 12px';
        row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        row.style.fontSize = '14px'; // Keeps it compact

        const timestamp = new Date().toLocaleTimeString();
        const plateNumber = plateInfo.split(' (')[0];
        
        // Wrap items in spans to maintain spacing in the flexbox
        row.innerHTML = `
            <span style="color: #888; width: 80px;">${timestamp}</span>
            <span style="color: #22c55e; font-weight: bold; width: 100px;">${plateNumber}</span>
            <span style="flex-grow: 1; color: #ccc;">Vehicle Detected</span>
            <span style="width: 80px; color: #aaa;">CAM-01</span>
            <button class="export-btn" style="padding: 4px 10px; font-size: 11px; cursor: pointer;">View</button>
        `;

        tableBody.prepend(row);
    });
}

/* Init system */
function initSystem() {
    const label = document.getElementById('initLabel');
    const dot   = document.querySelector('.offline-dot');
    label.textContent = 'INITIALIZING...';
    setTimeout(() => {
        label.textContent = 'SYSTEM READY';
        dot.style.background = '#22c55e';
        dot.style.boxShadow  = '0 0 8px #22c55e';
        const badge = document.querySelector('.offline-badge');
        badge.childNodes.forEach(n => { 
            if (n.nodeType === 3 && n.textContent.includes('OFFLINE')) n.textContent = '\u00a0ONLINE'; 
        });
    }, 1800);
}

/* Chart */
function drawChart() {
    const card   = document.getElementById('chartCard');
    const canvas = document.getElementById('chartCanvas');
    if (!canvas) return; // Guard for non-analytics pages

    const dpr    = window.devicePixelRatio || 1;
    const W      = card.clientWidth - 48;
    const H      = 260;
    
    canvas.width        = W * dpr;
    canvas.height       = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const padL = 44, padR = 16, padT = 10, padB = 34;
    const cW   = W - padL - padR;
    const cH   = H - padT - padB;
    const yMax = 4;

    ctx.font      = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#4a5e74';
    ctx.textAlign = 'right';

    /* Horizontal grid + Y labels */
    for (let y = 0; y <= yMax; y++) {
        const cy = padT + cH - (y / yMax) * cH;
        ctx.strokeStyle = 'rgba(255,255,255,.055)';
        ctx.lineWidth   = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(padL, cy); ctx.lineTo(padL + cW, cy); ctx.stroke();
        ctx.fillText(y, padL - 8, cy + 4);
    }

    /* Vertical grid + X labels */
    const cols = 12;
    ctx.textAlign = 'center';
    for (let i = 0; i <= cols; i++) {
        const cx = padL + (i / cols) * cW;
        ctx.strokeStyle = 'rgba(255,255,255,.055)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(cx, padT); ctx.lineTo(cx, padT + cH); ctx.stroke();
        const hr = (i * 2).toString().padStart(2,'0');
        ctx.fillStyle = '#4a5e74';
        ctx.fillText(hr + ':00', cx, padT + cH + 20);
    }

    /* Axes */
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + cH);
    ctx.lineTo(padL + cW, padT + cH);
    ctx.stroke();
}

function displayCurrentDate() {
    const dateElement = document.getElementById('current-date');
    const today = new Date();

    const day = today.getDate();
    const month = today.getMonth() + 1; // Months are 0-indexed
    const year = today.getFullYear();

    // Create the format M/D/YYYY
    const fullDate = day + "/" + month + "/" + year;

    // Update the HTML
    dateElement.textContent = fullDate;
}

// Run the function immediately when the script loads
displayCurrentDate();

/* Event Listeners */
window.addEventListener('load', () => setTimeout(drawChart, 80));
window.addEventListener('resize', drawChart);

