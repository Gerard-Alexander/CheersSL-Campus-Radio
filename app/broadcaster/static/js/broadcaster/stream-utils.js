let sessionStartTime = null;
let sessionTimerInterval = null;
let currentViewers = 0;

const sessionTimeEl = document.querySelector('.session-time');
const viewerCountEl = document.querySelector('.viewers-count');

export function startSessionTimer() {
    sessionStartTime = Date.now();
    sessionTimerInterval = setInterval(updateSessionDisplay, 1000);
}

export function stopSessionTimer() {
    clearInterval(sessionTimerInterval);
    sessionTimeEl.textContent = "0:00:00";
}

function updateSessionDisplay() {
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    sessionTimeEl.textContent = formatDuration(elapsed);
}

function formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function updateViewerCount(count) {
    currentViewers = count;
    if (viewerCountEl) {
        viewerCountEl.textContent = count;
    }
}

export function incrementViewerCount() {
    updateViewerCount(currentViewers + 1);
}

export function decrementViewerCount() {
    updateViewerCount(Math.max(0, currentViewers - 1));
}
