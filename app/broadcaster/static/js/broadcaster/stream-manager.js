import { cameraPreview, audioPreview, videoPreview } from '../utils/media-elements.js';
import { notifyBroadcaster, stopWebRTC } from './webrtc-handler.js';

let currentStream = null;
let currentMicStream = null;
let isStreaming = false;
let isMuted = false;
let statusDiv = null;

export function initStreamManager(statusElement) {
    statusDiv = statusElement;
}

export function getCurrentStream() {
    return currentStream;
}

export function setMicStream(micStream) {
    currentMicStream = micStream;

    if (currentStream) {
        // Remove all existing audio tracks
        currentStream.getAudioTracks().forEach(track => {
            currentStream.removeTrack(track);
        });

        // Add all audio tracks from micStream
        micStream.getAudioTracks().forEach(track => {
            currentStream.addTrack(track);
        });
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
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    currentStream = new MediaStream([
        ...stream.getVideoTracks(),
        ...stream.getAudioTracks()
    ]);

    // Reattach mic audio tracks (if any)
    if (currentMicStream) {
        currentMicStream.getAudioTracks().forEach(track => {
            currentStream.addTrack(track);
        });
    }

    cameraPreview.srcObject = currentStream;

    try {
        await cameraPreview.play();
    } catch (err) {
        console.warn('[DBG] cameraPreview play() failed:', err);
    }

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
