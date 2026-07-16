import { switchToStream } from './stream-manager.js';
import { audioA, audioB, audioPreview, cameraPreview, videoPreview } from '../utils/media-elements.js';

const statusDiv = document.getElementById('broadcast-status');

export async function showCameraSelectionPanel() {
    console.log("[CameraManager] Camera selection panel opened");

    const selectionPanel = document.getElementById('camera-selection-panel');
    selectionPanel.innerHTML = '';
    selectionPanel.style.display = 'block';

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');

    for (const cam of cameras) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('camera-card');
        wrapper.dataset.deviceId = cam.deviceId;

        const preview = document.createElement('video');
        preview.autoplay = true;
        preview.muted = true;
        preview.playsInline = true;
        preview.classList.add('thumbnail-preview');

        const label = document.createElement('div');
        label.classList.add('camera-label');
        label.textContent = cam.label || `Camera ${selectionPanel.childElementCount + 1}`;

        wrapper.appendChild(preview);
        wrapper.appendChild(label);
        selectionPanel.appendChild(wrapper);

        try {
            const thumbStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { ideal: cam.deviceId } },
                audio: false
            });
            preview.srcObject = thumbStream;
        } catch (err) {
            label.textContent += " (preview failed)";
        }

        wrapper.addEventListener('click', () => {
            if (preview.srcObject) preview.srcObject.getTracks().forEach(t => t.stop());
            addCameraToSidebar(cam);
            selectionPanel.style.display = 'none';
        });
    }
}

export function addCameraToSidebar(cam) {
    const container = document.querySelector('.camera-list');
    if (!container) return;

    if (container.querySelector(`[data-device-id="${cam.deviceId}"]`)) return;

    const card = document.createElement('div');
    card.classList.add('camera-card');
    card.dataset.deviceId = cam.deviceId;

    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.classList.add('thumbnail-preview');
    video.style.width = "100%";
    video.style.height = "100px";
    video.style.borderRadius = "6px";

    const label = document.createElement('div');
    label.classList.add('camera-label');
    label.textContent = cam.label || 'Unnamed Camera';

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '❌ Remove';
    removeBtn.classList.add('remove-camera-btn');

    card.appendChild(video);
    card.appendChild(label);
    card.appendChild(removeBtn);
    container.appendChild(card);
    container.style.display = 'block';

    navigator.mediaDevices.getUserMedia({
        video: { deviceId: { ideal  : cam.deviceId } },
        audio: false
    }).then(stream => {
        video.srcObject = stream;
        card._previewStream = stream;
    }).catch(err => {
        label.textContent += ' (preview failed)';
        console.error('Camera preview failed:', err);
    });

    card.addEventListener('click', async (e) => {
        if (e.target === removeBtn) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: cam.deviceId } },
                audio: false
            }); 
            pauseIfPlaying();
            toggleVisibility('camera');
            await switchToStream(stream);
        } catch (err) {
            statusDiv.textContent = "Camera access error.";
            console.log("Camera access error:", err);
        }
    });

    removeBtn.addEventListener('click', () => {
        if (card._previewStream) {
            card._previewStream.getTracks().forEach(t => t.stop());
        }

        if (cameraPreview.srcObject) {
            const previewTrack = cameraPreview.srcObject.getTracks()[0];
            const activeId = previewTrack?.getSettings()?.deviceId;

            if (activeId === cam.deviceId) {
                // Stop and clear preview
                cameraPreview.srcObject.getTracks().forEach(t => t.stop());
                cameraPreview.srcObject = null;

                // Also stop current broadcast stream if this camera is being streamed
                import('./stream-manager.js').then(({ getCurrentStream, switchToStream }) => {
                    const currentStream = getCurrentStream();
                    const currentTrack = currentStream?.getTracks()[0];
                    const currentId = currentTrack?.getSettings()?.deviceId;
                    if (currentId === cam.deviceId) {
                        currentStream?.getTracks().forEach(t => t.stop());
                        switchToStream(null); // clear the stream
                    }
                });

                statusDiv.textContent = "Camera removed from preview and broadcast.";
            }
        }

        card.remove();
    });
}

export async function populateCameraPreviews() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');
    const container = document.querySelector('.camera-list');
    if (!container) return;

    container.innerHTML = '';

    for (const cam of cameras) {
        if (document.querySelector(`.camera-entry[data-device-id="${cam.deviceId}"]`)) continue;

        const camEntry = document.createElement('div');
        camEntry.classList.add('camera-entry');
        camEntry.textContent = cam.label || `Camera ${container.childElementCount + 1}`;
        camEntry.dataset.deviceId = cam.deviceId;

        camEntry.addEventListener('click', async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        deviceId: { exact: cam.deviceId },
                        frameRate: { ideal: 60, max: 60 },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    },
                    audio: false
                });
                pauseIfPlaying();
                toggleVisibility('camera');
                await switchToStream(stream);
            } catch (err) {
                statusDiv.textContent = "Camera access error.";
                console.log("Camera access error:", err);
            }
        });

        container.appendChild(camEntry);
    }
}

function pauseIfPlaying() {
    if (!videoPreview.paused && !videoPreview.srcObject) {
        videoPreview.pause();
    }
    if (!audioPreview.paused && !audioPreview.srcObject) {
        audioPreview.pause();
    }
}

function toggleVisibility(source) {
    const cameraDiv = document.getElementById('camera-preview-container');
    const videoDiv = document.getElementById('video-preview-container');
    const audioDiv = document.getElementById('audio-preview-container');
    if (source === 'camera') {
        cameraDiv.style.display = 'block';
        videoDiv.style.display = 'none';
        audioDiv.style.display = 'none';
        audioA.pause();
        audioB.pause();
        if (!audioPreview.paused) audioPreview.pause();
    } else if (source === 'video') {
        videoDiv.style.display = 'block';
        cameraDiv.style.display = 'none';
        audioDiv.style.display = 'none';
        if (!audioPreview.paused) audioPreview.pause();
    } else if (source === 'audio') {
        audioDiv.style.display = 'block';
        cameraDiv.style.display = 'none';
        videoDiv.style.display = 'none';
    }
}
