import { audioPreview } from '../utils/media-elements.js';

let audioCtx = null;
const analyserMap = new WeakMap();     // maps audioA/audioB -> analyser
const gainMap = new WeakMap();         // maps audioA/audioB -> gainNode
const sourceMap = new WeakMap();       // maps audioA/audioB -> sourceNode

let animationId = null;
let dataArray = null;
let currentAnalyser = null;
let currentAudioElement = null;
let resizeObserver = null;

function mixColor(stops, t) {
    const scaled = Math.max(0, Math.min(1, t)) * (stops.length - 1);
    const index = Math.floor(scaled);
    const ratio = scaled - index;
    const start = stops[index];
    const end = stops[Math.min(index + 1, stops.length - 1)];

    return {
        r: Math.round(start.r + (end.r - start.r) * ratio),
        g: Math.round(start.g + (end.g - start.g) * ratio),
        b: Math.round(start.b + (end.b - start.b) * ratio)
    };
}

const spectrumStops = [
    { r: 255, g: 106, b: 0 },
    { r: 255, g: 196, b: 0 },
    { r: 255, g: 244, b: 71 },
    { r: 197, g: 255, b: 73 },
    { r: 74, g: 222, b: 128 },
    { r: 34, g: 211, b: 238 },
    { r: 59, g: 130, b: 246 },
    { r: 168, g: 85, b: 247 },
    { r: 236, g: 72, b: 153 },
    { r: 244, g: 63, b: 94 }
];

function resizeCanvasToDisplaySize(canvas) {
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    const displayWidth = Math.max(1, Math.floor(width * ratio));
    const displayHeight = Math.max(1, Math.floor(height * ratio));

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        return true;
    }

    return false;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
    ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
    ctx.arcTo(x, y + height, x, y, safeRadius);
    ctx.arcTo(x, y, x + width, y, safeRadius);
    ctx.closePath();
}

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

    resizeCanvasToDisplaySize(canvas);

    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(err => console.warn('[Visualizer] Failed to resume audio context:', err));
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
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.82;

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

    if (resizeObserver) {
        resizeObserver.disconnect();
    }

    const canvasContainer = canvas.parentElement;
    if (canvasContainer && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => resizeCanvasToDisplaySize(canvas));
        resizeObserver.observe(canvasContainer);
    }

    function draw() {
        animationId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        resizeCanvasToDisplaySize(canvas);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const width = canvas.width;
        const height = canvas.height;
        const centerY = height / 2;
        const barCount = Math.min(96, Math.max(48, Math.floor(width / 16)));
        const samplesPerBar = Math.max(1, Math.floor(dataArray.length / barCount));
        const barWidth = width / barCount;

        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, width, height);

        const glowGradient = ctx.createRadialGradient(width / 2, centerY, width * 0.05, width / 2, centerY, width * 0.6);
        glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
        glowGradient.addColorStop(0.45, 'rgba(154, 78, 255, 0.08)');
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < barCount; i++) {
            let peak = 0;
            const start = i * samplesPerBar;
            const end = Math.min(start + samplesPerBar, dataArray.length);
            for (let sampleIndex = start; sampleIndex < end; sampleIndex++) {
                peak = Math.max(peak, dataArray[sampleIndex] || 0);
            }

            const normalized = peak / 255;
            const curve = Math.pow(normalized, 0.72);
            const magnitude = Math.max(8, curve * (height * 0.44));
            const x = i * barWidth + barWidth * 0.15;
            const barThickness = Math.max(3, barWidth * 0.66);
            const hueMix = mixColor(spectrumStops, i / Math.max(1, barCount - 1));
            const glowMix = mixColor(spectrumStops, 1 - (i / Math.max(1, barCount - 1)));
            const topColor = `rgb(${hueMix.r}, ${hueMix.g}, ${hueMix.b})`;
            const bottomColor = `rgba(${glowMix.r}, ${glowMix.g}, ${glowMix.b}, 0.78)`;

            ctx.save();
            ctx.shadowColor = topColor;
            ctx.shadowBlur = 18;
            ctx.fillStyle = topColor;
            drawRoundedRect(ctx, x, centerY - magnitude, barThickness, magnitude, Math.max(3, barThickness * 0.45));
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.fillStyle = bottomColor;
            drawRoundedRect(ctx, x, centerY, barThickness, Math.min(magnitude * 0.92, height * 0.36), Math.max(3, barThickness * 0.45));
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const halo = ctx.createRadialGradient(width / 2, centerY, width * 0.1, width / 2, centerY, width * 0.55);
        halo.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
        halo.addColorStop(0.35, 'rgba(255, 64, 196, 0.06)');
        halo.addColorStop(0.7, 'rgba(59, 130, 246, 0.05)');
        halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }

    draw();
}

export function stopAudioVisualizer() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
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
