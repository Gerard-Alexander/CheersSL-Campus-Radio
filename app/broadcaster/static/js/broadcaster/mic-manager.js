import { setMicStream } from "./stream-manager.js";
let audioContext = null;
let micStreams = [];
let micSources = [];
let combinedDestination = null;
let selectedMicIds = [];
let currentMicStream = null;
let isMuted = false;

export function setMuteState(muted) {
    isMuted = muted;
    muteCombinedStream();
}

export function getCurrentMicStream() {
    return currentMicStream;
}

export async function showMicSelectionPanel() {
    console.log("[Mic Manager] Showing Microphone Selection");
    const selectionPanel = document.getElementById('microphone-selection-panel');
    selectionPanel.innerHTML = '';
    selectionPanel.style.display = 'block';

    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices.filter(d => d.kind === 'audioinput');

    for (const mic of mics) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('microphone-card');
        wrapper.dataset.deviceId = mic.deviceId;

        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 30;
        canvas.classList.add('mic-visualizer');
        wrapper.appendChild(canvas);

        const label = document.createElement('div');
        label.classList.add('mic-label');
        label.textContent = mic.label || `Microphone ${selectionPanel.childElementCount + 1}`;
        wrapper.appendChild(label);

        selectionPanel.appendChild(wrapper);

        let stream = null;
        let ctx = null;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { ideal: mic.deviceId } } });

            ctx = new (window.AudioContext || window.webkitAudioContext)();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const canvasCtx = canvas.getContext('2d');
            source.connect(analyser);

            function draw() {
                requestAnimationFrame(draw);
                analyser.getByteFrequencyData(dataArray);
                canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
                const barWidth = (canvas.width / bufferLength) * 1.5;
                let x = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const barHeight = dataArray[i] / 2;
                    canvasCtx.fillStyle = 'limegreen';
                    canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                    x += barWidth + 1;
                }
            }
            draw();
        } catch (err) {
            label.textContent += " (preview failed)";
        }

        wrapper.addEventListener('click', () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
            if (ctx && ctx.state !== 'closed') ctx.close();

            selectionPanel.style.display = 'none';
            addMicToSidebar(mic);
        });
    }
}

function addMicToSidebar(mic) {
    const container = document.querySelector('.microphone-list');
    if (!container || selectedMicIds.includes(mic.deviceId)) return;

    selectedMicIds.push(mic.deviceId);

    const card = document.createElement('div');
    card.classList.add('microphone-card');
    card.dataset.deviceId = mic.deviceId;

    const label = document.createElement('div');
    label.classList.add('mic-label');
    label.textContent = mic.label || 'Unnamed Microphone';

    const statusBadge = document.createElement('span');
    statusBadge.classList.add('mic-status-badge');
    statusBadge.textContent = '🔊 In Use';
    statusBadge.style.marginLeft = '10px';
    statusBadge.style.color = 'limegreen';
    label.appendChild(statusBadge);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '❌ Remove';
    removeBtn.classList.add('remove-mic-btn');

    card.appendChild(label);
    card.appendChild(removeBtn);
    container.appendChild(card);
    container.style.display = 'block';

    removeBtn.addEventListener('click', () => {
        selectedMicIds = selectedMicIds.filter(id => id !== mic.deviceId);
        updateCombinedMicStream();
        card.remove();
    });

    updateCombinedMicStream();
}

async function updateCombinedMicStream() {
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (!combinedDestination) {
        combinedDestination = audioContext.createMediaStreamDestination();
        const micTrack = combinedDestination.stream.getAudioTracks()[0];
        if (micTrack) {
            currentMicStream = new MediaStream([micTrack]);
        }
    }

    micSources.forEach(src => src.disconnect());
    micStreams.forEach(stream => stream.getTracks().forEach(t => t.stop()));
    micSources = [];
    micStreams = [];

    for (const deviceId of selectedMicIds) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { ideal: deviceId } } });
            micStreams.push(stream);

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(combinedDestination);
            micSources.push(source);
        } catch (err) {
            console.warn(`Failed to get mic stream for ${deviceId}:`, err);
        }
    }
    if (combinedDestination) {
        currentMicStream = combinedDestination.stream;
        setMicStream(currentMicStream); // 👈 This is what was missing
        console.log('[Mic Manager] Updated combined mic stream:', currentMicStream.getAudioTracks());
    }
}

function muteCombinedStream() {
    if (!currentMicStream) return;
    currentMicStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
    });
}
