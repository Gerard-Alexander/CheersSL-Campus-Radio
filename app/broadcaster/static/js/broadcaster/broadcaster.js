import { fileManager } from '../file/file-manager.js';
import { playlistManager } from '../playlist/playlist-manager.js';
import { audioPreview, videoPreview, cameraPreview } from '../utils/media-elements.js';
import { setupAudioVisualizer, stopAudioVisualizer } from './waveform-visualizer.js';

import { showMicSelectionPanel } from './mic-manager.js';
import { showCameraSelectionPanel } from './camera-manager.js';
import { setupTickerControls } from './ticker-controls.js';
import { setupThemeToggle, highlightSelectedElements } from './ui-controls.js';
import { setupWebRTCHandlers } from './webrtc-handler.js';
import { startSessionTimer, stopSessionTimer } from './stream-utils.js';
import { stopSideEffect } from '../file/sfx-player.js';

import {
    initStreamManager,
    startStream,
    stopStream,
    muteStream,
    isStreamMuted,
    getCurrentStream,
    isStreamActive,
    switchToStream
} from './stream-manager.js';

const muteBtn = document.getElementById('muteStream');
const startBtn = document.getElementById('startStream');
const stopBtn = document.getElementById('stopStream');
const statusDiv = document.getElementById('broadcast-status');
const socket = io();

function updateStartStreamButtonState() {
    if (startBtn) {
        startBtn.disabled = isStreamActive();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // --- Initialize modules ---
    fileManager.setup();
    document.getElementById('stopSfxBtn')?.addEventListener('click', () => {
        stopSideEffect();
    });
    playlistManager.render();
    setupThemeToggle();
    setupTickerControls(socket);
    highlightSelectedElements();
    setupWebRTCHandlers(socket, getCurrentStream);
    initStreamManager(statusDiv);
    setUpPlaylist();
    // Mount media preview elements
    document.getElementById('camera-preview-container')?.appendChild(cameraPreview);
    document.getElementById('video-preview-container')?.appendChild(videoPreview);

    statusDiv.textContent = "Select a camera or video to stream.";
    updateStartStreamButtonState();
});
let currentPlaylist = null;

async function refreshPlaylistList() {
    await setUpPlaylist();
}

document.getElementById("saveOrderBtn")?.addEventListener("click", async () => {
    const orderedFileIds = playlistManager.core.items.map(item => item.fileId);
    const orderedNames = playlistManager.core.items.map(item => item.name);

    console.log("[Save Order] Playlist fileId order:", orderedFileIds);
    console.log("[Save Order] Playlist item names:", orderedNames);

    if (currentPlaylist != null) {
        console.log("Saving it to", currentPlaylist);
        const result = await playlistManager.savePlaylist(currentPlaylist.trim());
        if (result?.success) {
            alert("Playlist order saved successfully.");
        } else {
            console.warn("Failed to save playlist:", result?.message);
            alert("Failed to save playlist.");
        }
    } else {
        alert("No playlist is currently selected.");
    }
});
async function setUpPlaylist() {
    try {
        const playlists = await playlistManager.listAllPlaylists();
        const container = document.getElementById('playlist-group');
        if (container) {
            container.innerHTML = '';
            playlists.forEach(playlist => {
                const row = document.createElement('div');
                row.className = 'playlist-entry';

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = playlist.name;
                btn.classList.add('playlist-btn');
                btn.addEventListener('click', () => {
                    playlistManager.loadPlaylist(playlist.name);
                    currentPlaylist = playlist.name;
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.className = 'playlist-delete-btn';
                deleteBtn.title = `Delete ${playlist.name}`;
                deleteBtn.setAttribute('aria-label', `Delete ${playlist.name}`);
                deleteBtn.innerHTML = `<img src="${window.STATIC_ICON_PATH}close.png" alt="Delete">`;
                deleteBtn.addEventListener('click', async (event) => {
                    event.stopPropagation();

                    const confirmed = confirm(`Delete playlist "${playlist.name}"? This cannot be undone.`);
                    if (!confirmed) return;

                    const result = await playlistManager.deletePlaylist(playlist.name);
                    if (result?.success) {
                        if (currentPlaylist === playlist.name) {
                            currentPlaylist = null;
                            playlistManager.clear();
                        }
                        await refreshPlaylistList();
                    } else {
                        alert(result?.message || 'Failed to delete playlist.');
                    }
                });

                row.append(btn, deleteBtn);
                container.appendChild(row);
            });
        }
    } catch (err) {
        console.error("[Broadcaster] Error listing playlists:", err);
    }
}
// --- Stream Control Buttons ---
muteBtn?.addEventListener('click', () => {
    const nowMuted = muteStream();
    muteBtn.textContent = nowMuted ? "Unmute" : "Mute";
});

startBtn?.addEventListener('click', () => {
    if (startBtn.disabled) return;
    startStream(socket, startSessionTimer);
    updateStartStreamButtonState();
});

stopBtn?.addEventListener('click', () => {
    stopStream(socket, stopSessionTimer);
    updateStartStreamButtonState();
});

// --- Device Selection ---
document.getElementById('cameraPlusBtn')?.addEventListener('click', async () => {
    console.log("[Broadcaster] Camera plus button clicked");
    showCameraSelectionPanel();
});
document.getElementById('microphonePlusBtn')?.addEventListener('click', async () => {
    console.log("[Broadcaster] Microphone plus button clicked");
    showMicSelectionPanel();
});
// --- Cleanup on Exit ---
window.onbeforeunload = () => {
    stopStream(socket, stopSessionTimer);
    stopWebRTC();
    socket.close();
};


audioPreview.addEventListener('pause', stopAudioVisualizer);
audioPreview.addEventListener('ended', stopAudioVisualizer);
// --- Expose Debug Access ---
window.currentStream = getCurrentStream();
window.switchToStream = switchToStream;
window.socket = socket;
