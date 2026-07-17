import { cameraPreview, audioPreview, videoPreview } from '../utils/media-elements.js';
import { notifyBroadcaster, stopWebRTC } from './webrtc-handler.js';

let currentStream = null;
let currentMicStream = null;
let isStreaming = false;
let isMuted = false;
let statusDiv = null;
let localMonitorAudioContext = null;
let localMonitorGain = null;
let localMonitorSources = [];

export function initStreamManager(statusElement) {
    statusDiv = statusElement;
}

export function getCurrentStream() {
    return currentStream;
}

function stopLocalAudioMonitor() {
    localMonitorSources.forEach(source => {
        try { source.disconnect(); } catch (err) { console.warn('[StreamManager] monitor source disconnect failed:', err); }
    });
    localMonitorSources = [];

    if (localMonitorGain) {
        try { localMonitorGain.disconnect(); } catch (err) { console.warn('[StreamManager] monitor gain disconnect failed:', err); }
        localMonitorGain = null;
    }
}

export function refreshLocalAudioMonitor() {
    const stream = currentStream;
    if (!stream) {
        stopLocalAudioMonitor();
        return;
    }

    const audioTracks = stream.getAudioTracks().filter(track => track.readyState === 'live');
    if (!audioTracks.length) {
        stopLocalAudioMonitor();
        return;
    }

    if (!localMonitorAudioContext || localMonitorAudioContext.state === 'closed') {
        localMonitorAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (localMonitorAudioContext.state === 'suspended') {
        localMonitorAudioContext.resume().catch(err => console.warn('[StreamManager] Failed to resume local monitor audio context:', err));
    }

    stopLocalAudioMonitor();

    localMonitorGain = localMonitorAudioContext.createGain();
    localMonitorGain.gain.value = 1;
    localMonitorGain.connect(localMonitorAudioContext.destination);

    audioTracks.forEach(track => {
        try {
            const trackStream = new MediaStream([track]);
            const source = localMonitorAudioContext.createMediaStreamSource(trackStream);
            source.connect(localMonitorGain);
            localMonitorSources.push(source);
        } catch (err) {
            console.warn('[StreamManager] Failed to attach monitor source:', err);
        }
    });
}

export function setMicStream(micStream) {
    const previousMicTracks = currentMicStream ? currentMicStream.getAudioTracks() : [];
    currentMicStream = micStream;

    if (currentStream) {
        // Replace only the previously attached mic tracks and preserve media audio tracks.
        previousMicTracks.forEach(track => {
            if (currentStream.getTracks().includes(track)) {
                currentStream.removeTrack(track);
            }
        });

        // Add all audio tracks from the new mic stream.
        micStream.getAudioTracks().forEach(track => {
            if (!currentStream.getTracks().includes(track)) {
                currentStream.addTrack(track);
            }
        });
    }

    refreshLocalAudioMonitor();
}

function getLiveMicTracks() {
    if (!currentMicStream) return [];
    return currentMicStream
        .getAudioTracks()
        .filter(track => track.readyState === 'live');
}

function stopCurrentStreamTracks() {
    if (!currentStream) return;

    const liveMicTracks = new Set(getLiveMicTracks());
    currentStream.getTracks().forEach(track => {
        if (!liveMicTracks.has(track)) {
            track.stop();
        }
    });
}

function resetPreviewElements() {
    try { cameraPreview.pause(); } catch (err) { console.warn('[StreamManager] cameraPreview pause failed:', err); }
    cameraPreview.srcObject = null;

    try { videoPreview.pause(); } catch (err) { console.warn('[StreamManager] videoPreview pause failed:', err); }
    videoPreview.srcObject = null;
    videoPreview.removeAttribute('src');
    videoPreview.load();

    try { audioPreview.pause(); } catch (err) { console.warn('[StreamManager] audioPreview pause failed:', err); }
    audioPreview.srcObject = null;
    audioPreview.removeAttribute('src');
    audioPreview.load();
}

export function clearStreamAndPreview() {
    stopCurrentStreamTracks();
    const liveMicTracks = getLiveMicTracks();
    currentStream = new MediaStream(liveMicTracks);
    resetPreviewElements();

    refreshLocalAudioMonitor();

    if (isStreaming) {
        notifyBroadcaster();
        updateStatus('Stream cleared.');
    }
}

export function startStream(socket, startSessionTimer) {
    console.log("Audio Track: ", currentStream.getAudioTracks());
    if (!currentStream || currentStream.getTracks().length === 0) {
        return alert("Nothing to stream.");
    }
    // Debug: confirm mic presence
    const audioTracks = currentStream.getAudioTracks();
    if (audioTracks.length === 0) {
        console.warn("[WARN] Starting stream with no audio tracks.");
    }

    socket.emit('broadcaster');
    isStreaming = true;
    startSessionTimer?.();
    updateStatus("Broadcasting...");
}

export function stopStream(socket, stopSessionTimer) {
    stopWebRTC();
    socket.emit('stop-broadcast');
    isStreaming = false;
    stopSessionTimer?.();
    updateStatus("Broadcast stopped.");
}

export function muteStream(applyToCurrent = true) {
    isMuted = !isMuted;
    if (applyToCurrent && currentStream) {
        currentStream.getAudioTracks().forEach(track => {
            track.enabled = !isMuted;
        });
    }
    updateStatus(isMuted ? "Audio muted for viewers." : "Audio unmuted.");
    return isMuted;
}

export async function switchToStream(stream) {
    const incomingTracks = stream ? [
        ...stream.getVideoTracks(),
        ...stream.getAudioTracks()
    ] : [];

    stopCurrentStreamTracks();

    currentStream = new MediaStream(incomingTracks);

    // Reattach mic audio tracks (if any)
    const liveMicTracks = getLiveMicTracks();
    if (liveMicTracks.length) {
        liveMicTracks.forEach(track => {
            currentStream.addTrack(track);
        });
    }

    const videoTracks = incomingTracks.filter(track => track.kind === 'video');
    videoTracks.forEach(track => {
        console.log('[StreamManager] switchToStream video track settings:', track.getSettings());
        console.log('[StreamManager] switchToStream video track constraints:', track.getConstraints());
    });

    if (!stream || incomingTracks.length === 0) {
        resetPreviewElements();
    } else {
        cameraPreview.srcObject = currentStream.getTracks().length ? currentStream : null;
    }

    try {
        if (cameraPreview.srcObject) {
            await cameraPreview.play();
        }
    } catch (err) {
        console.warn('[DBG] cameraPreview play() failed:', err);
    }

    refreshLocalAudioMonitor();

    if (isStreaming) {
        notifyBroadcaster();
        if (isMuted) muteStream();
        updateStatus("Broadcasting new stream.");
    }
}


function updateStatus(text) {
    if (statusDiv) statusDiv.textContent = text;
}

export function isStreamMuted() {
    return isMuted;
}

export function isStreamActive() {
    return isStreaming;
}
