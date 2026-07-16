import { audioPreview } from '../utils/media-elements.js';

let audioCtx = null;
const analyserMap = new WeakMap();     // maps audioA/audioB -> analyser
const gainMap = new WeakMap();         // maps audioA/audioB -> gainNode
const sourceMap = new WeakMap();       // maps audioA/audioB -> sourceNode

let animationId = null;
let dataArray = null;
let currentAnalyser = null;
let currentAudioElement = null;

export function setupAudioVisualizer(audioElement = audioPreview) {
    stopAudioVisualizer();

    if (!audioElement) {
        console.warn('[Visualizer] No audio element provided.');
        return;
    }

    let canvas = document.getElementById('audio-visualizer');
    if (!canvas) {
        const container = document.getElementById('audio-preview-container');
        if (!container) return console.warn("[Visualizer] No audio-preview-container found.");

        canvas = document.createElement('canvas');
        canvas.id = 'audio-visualizer';
        canvas.width = 800;
        canvas.height = 180;
        canvas.style.cssText = 'width:100%; height:180px; display:block; margin-bottom:8px;';
        container.insertBefore(canvas, container.firstChild);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.warn("[Visualizer] Canvas context is null.");
        return;
    }

    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    let sourceNode, analyser, gainNode;

    try {
        if (sourceMap.has(audioElement)) {
            sourceNode = sourceMap.get(audioElement);
            analyser = analyserMap.get(audioElement);
            gainNode = gainMap.get(audioElement);
        } else {
            sourceNode = audioCtx.createMediaElementSource(audioElement);

            gainNode = audioCtx.createGain();
            gainNode.gain.value = 1;

            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128;

            sourceNode.connect(gainNode);
            gainNode.connect(analyser);
            gainNode.connect(audioCtx.destination);

            sourceMap.set(audioElement, sourceNode);
            gainMap.set(audioElement, gainNode);
            analyserMap.set(audioElement, analyser);
        }
    } catch (e) {
        console.warn("[Visualizer] Failed to create audio graph:", e);
        return;
    }

    currentAnalyser = analyser;
    currentAudioElement = audioElement;
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    function draw() {
        animationId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const spacing = 2;
        const totalSpacing = spacing * (dataArray.length - 1);
        const barWidth = (canvas.width - totalSpacing) / dataArray.length;

        for (let i = 0; i < dataArray.length; i++) {
            const barHeight = (dataArray[i] / 255) * (canvas.height * 0.8);
            const x = i * (barWidth + spacing);
            ctx.fillStyle = "#4ade80";
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        }
    }

    draw();
}

export function stopAudioVisualizer() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    if (currentAnalyser) {
        try {
            currentAnalyser.disconnect();
        } catch (e) {
            console.warn('[Visualizer] Error disconnecting analyser:', e);
        }
        currentAnalyser = null;
    }

    const canvas = document.getElementById('audio-visualizer');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    currentAudioElement = null;
}

export function getDeckGainNode(audioElement) {
    return gainMap.get(audioElement) || null;
}
export function fadeGain(gainNode, from, to, duration = 3, callback) {
    if (!gainNode || typeof gainNode.gain.setValueAtTime !== 'function') {
        console.warn('[fadeGain] Invalid gainNode');
        return;
    }

    const now = audioCtx.currentTime;
    gainNode.gain.setValueAtTime(from, now);
    gainNode.gain.linearRampToValueAtTime(to, now + duration);

    if (callback) {
        setTimeout(callback, duration * 1000);
    }
}
export function setupDeckAudio(audioElement) {
    if (!audioElement) {
        console.warn('[setupDeckAudio] No audio element provided.');
        return null;
    }

    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (sourceMap.has(audioElement)) {
        return gainMap.get(audioElement);
    }

    try {
        const sourceNode = audioCtx.createMediaElementSource(audioElement);

        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 1;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;

        sourceNode.connect(gainNode);
        gainNode.connect(analyser);
        gainNode.connect(audioCtx.destination);

        sourceMap.set(audioElement, sourceNode);
        gainMap.set(audioElement, gainNode);
        analyserMap.set(audioElement, analyser);

        return gainNode;
    } catch (e) {
        console.warn('[setupDeckAudio] Failed to set up audio graph:', e);
        return null;
    }
}
