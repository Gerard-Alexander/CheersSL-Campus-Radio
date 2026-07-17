const connectOverlay = document.getElementById('connect-overlay');
const connectBtn = document.getElementById('connect-btn');
const video = document.getElementById('radio-stream');
const brb = document.getElementById('brb-standby');
const audioPanel = document.getElementById('audio-panel');
const audioVisualizer = document.getElementById('audio-visualizer');
const audioTrackTitle = document.getElementById('audio-track-title');
let socket = null;
let peerConnection = null;
let playbackRetryTimer = null;

// Audio visualizer setup
let audioContext, analyser, source, animationId, resizeObserver;

if (brb?.dataset?.brbImage) {
  brb.style.display = 'flex';
  brb.style.background = `url('${brb.dataset.brbImage}') center center no-repeat`;
  brb.style.backgroundSize = 'contain';
}

function resizeCanvasToDisplaySize(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const { width, height } = canvas.getBoundingClientRect();
  const displayWidth = Math.max(1, Math.floor(width * ratio));
  const displayHeight = Math.max(1, Math.floor(height * ratio));
  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
}

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

function updateAudioTitle(title = 'No audio playing') {
  if (audioTrackTitle) {
    audioTrackTitle.textContent = title.replace(/\.(mp3|wav|ogg|aac|flac|m4a|mp4|webm|avi|mov)$/i, '');
  }
}

function showAudioVisualizer(stream) {
  if (!audioPanel || !audioVisualizer) return;
  audioPanel.style.display = 'flex';
  audioVisualizer.style.display = 'block';

  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(err => console.warn('[Viewer] Failed to resume audio context:', err));
  }
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.86;
  source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  const canvasCtx = audioVisualizer.getContext('2d');
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => resizeCanvasToDisplaySize(audioVisualizer));
    resizeObserver.observe(audioPanel);
  }

  resizeCanvasToDisplaySize(audioVisualizer);

  function draw() {
    animationId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);

    resizeCanvasToDisplaySize(audioVisualizer);

    const width = audioVisualizer.width;
    const height = audioVisualizer.height;
    const centerY = height / 2;
    canvasCtx.clearRect(0, 0, width, height);

    canvasCtx.fillStyle = '#050505';
    canvasCtx.fillRect(0, 0, width, height);

    const glowGradient = canvasCtx.createRadialGradient(width / 2, centerY, width * 0.05, width / 2, centerY, width * 0.6);
    glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    glowGradient.addColorStop(0.45, 'rgba(154, 78, 255, 0.08)');
    glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    canvasCtx.fillStyle = glowGradient;
    canvasCtx.fillRect(0, 0, width, height);

    const barCount = Math.min(96, Math.max(48, Math.floor(width / 16)));
    const samplesPerBar = Math.max(1, Math.floor(bufferLength / barCount));
    const barWidth = width / barCount;

    for (let i = 0; i < barCount; i++) {
      let peak = 0;
      const start = i * samplesPerBar;
      const end = Math.min(start + samplesPerBar, bufferLength);
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

      canvasCtx.save();
      canvasCtx.shadowColor = topColor;
      canvasCtx.shadowBlur = 18;
      canvasCtx.fillStyle = topColor;
      drawRoundedRect(canvasCtx, x, centerY - magnitude, barThickness, magnitude, Math.max(3, barThickness * 0.45));
      canvasCtx.fill();

      canvasCtx.shadowBlur = 0;
      canvasCtx.fillStyle = bottomColor;
      drawRoundedRect(canvasCtx, x, centerY, barThickness, Math.min(magnitude * 0.92, height * 0.36), Math.max(3, barThickness * 0.45));
      canvasCtx.fill();
      canvasCtx.restore();
    }

    canvasCtx.save();
    canvasCtx.globalCompositeOperation = 'screen';
    const halo = canvasCtx.createRadialGradient(width / 2, centerY, width * 0.1, width / 2, centerY, width * 0.55);
    halo.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
    halo.addColorStop(0.35, 'rgba(255, 64, 196, 0.06)');
    halo.addColorStop(0.7, 'rgba(59, 130, 246, 0.05)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    canvasCtx.fillStyle = halo;
    canvasCtx.fillRect(0, 0, width, height);
    canvasCtx.restore();
  }
  draw();
}

function hideAudioVisualizer() {
  if (audioVisualizer) {
    audioVisualizer.style.display = 'none';
    const ctx = audioVisualizer.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, audioVisualizer.width, audioVisualizer.height);
  }
  if (audioPanel) audioPanel.style.display = 'none';
  if (animationId) cancelAnimationFrame(animationId);
  if (source) source.disconnect();
  if (analyser) analyser.disconnect();
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  source = null;
  analyser = null;
  animationId = null;
}

function showBRB(show) {
  if (show) {
    brb.style.display = 'flex';
    video.style.display = 'none';
    hideAudioVisualizer();
    video.pause();
    video.srcObject = null;
  } else {
    brb.style.display = 'none';
    video.style.display = '';
  }
}
function showConnectOverlay() {
  connectOverlay.style.display = 'flex';
  video.style.display = 'none';
  brb.style.display = 'none';
  hideAudioVisualizer();
}

function clearPlaybackRetry() {
  if (playbackRetryTimer) {
    clearTimeout(playbackRetryTimer);
    playbackRetryTimer = null;
  }
}

function attemptViewerPlayback() {
  if (!video || !video.srcObject) return;

  const tryPlay = () => {
    video.play()
      .then(() => {
        clearPlaybackRetry();
      })
      .catch(err => {
        if (err?.name === 'AbortError') {
          clearPlaybackRetry();
          playbackRetryTimer = setTimeout(tryPlay, 250);
          return;
        }
        if (err?.name !== 'NotAllowedError') {
          console.warn('[Viewer] Playback failed:', err);
        }
      });
  };

  tryPlay();
}

// Hide overlay and show video
function hideConnectOverlay() {
  connectOverlay.style.display = 'none';
  video.style.display = '';
}
function startViewerConnection() {
  socket = io.connect();

  // Hide the connect overlay
  hideConnectOverlay();

  // Show BRB while connecting
  showBRB(true);

  // Emit watcher event to server
  socket.on('connect', () => {
    console.log('[Viewer] Connected to signaling server');
    socket.emit('watcher');
  });
  socket.on('offer', async (id, description) => {
    console.log('[Viewer] Received offer from broadcaster:', id);

    peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    let receivedStream = new MediaStream();

    peerConnection.ontrack = event => {
      const incomingStream = event.streams?.[0] || null;
      if (incomingStream) {
        incomingStream.getTracks().forEach(track => {
          if (!receivedStream.getTracks().includes(track)) {
            receivedStream.addTrack(track);
          }
        });
      } else if (!receivedStream.getTracks().includes(event.track)) {
        receivedStream.addTrack(event.track);
      }

      if (video.srcObject !== receivedStream) {
        video.srcObject = receivedStream;
      }

      // Detect if stream is audio-only
      const hasVideo = receivedStream.getVideoTracks().length > 0;
      const hasAudio = receivedStream.getAudioTracks().length > 0;
      if (hasAudio && !hasVideo) {
        showAudioVisualizer(receivedStream);
      } else {
        hideAudioVisualizer();
      }
      video.style.display = '';

      showBRB(false);
      video.muted = false;
      video.playsInline = true;
      attemptViewerPlayback();

      // Optional: Debug actual resolution
      const receiver = peerConnection.getReceivers().find(r => r.track.kind === 'video');
      if (receiver) {
        setInterval(async () => {
          const stats = await receiver.getStats();
          stats.forEach(report => {
            if (report.type === 'inbound-rtp' && report.kind === 'video') {
              console.log(`[Viewer] Resolution: ${report.frameWidth}x${report.frameHeight}, FPS: ${report.framesPerSecond}`);
            }
          });
        }, 3000);
      }
    };

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('candidate', id, event.candidate);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
        showBRB(true);
      }
    };

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(description));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('answer', id, peerConnection.localDescription);
    } catch (err) {
      console.error('[Viewer] Error handling offer:', err);
      showBRB(true);
    }

  });
  socket.on('candidate', (id, candidate) => {
    if (peerConnection) {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
        .catch(err => console.error('[Viewer] Error adding ICE candidate:', err));
    }
  });
  socket.on('broadcaster', () => {
    socket.emit('watcher');
  });

  socket.on('now-playing', ({ title }) => {
    updateAudioTitle(title || 'No audio playing');
  });
  socket.on('disconnectPeer', id => {
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
    showBRB(true);
    updateAudioTitle('No audio playing');
  });


  // Ticker logic
  let tickerTimeouts = [];
  socket.on('start-ticker', ({ message, speed, loops, interval }) => {
    const tickerContainer = document.getElementById('ticker-container');
    const tickerText = document.getElementById('ticker-content');
    tickerText.textContent = message;
    tickerText.style.animationDuration = `${speed}s`;
    tickerContainer.style.display = 'flex';

    tickerTimeouts.forEach(clearTimeout);
    tickerTimeouts = [];

    let count = 0;
    const loopTicker = () => {
      tickerText.style.animation = 'none';
      void tickerText.offsetWidth;
      tickerText.style.animation = `scroll-left ${speed}s linear`;
      count++;
      if (loops === 0 || count < loops) {
        tickerTimeouts.push(setTimeout(loopTicker, (speed + interval) * 1000));
      }
    };
    loopTicker();
  });

  socket.on('stop-ticker', () => {
    const tickerContainer = document.getElementById('ticker-container');
    tickerContainer.style.display = 'none';
    tickerTimeouts.forEach(clearTimeout);
    tickerTimeouts = [];
  });

  socket.on('error', err => {
    console.error('[Viewer] Socket error:', err);
    showBRB(true);
  });
}

connectBtn.addEventListener('click', () => {
  hideConnectOverlay();
  startViewerConnection();
});

showConnectOverlay();
// showBRB(true);
// startViewerConnection();

window.onbeforeunload = () => {
  if (socket) socket.close();
  if (peerConnection) {
    peerConnection.close();
  }
};

video.onended = () => {
  showBRB(true);
};