const connectOverlay = document.getElementById('connect-overlay');
const connectBtn = document.getElementById('connect-btn');
const video = document.getElementById('radio-stream');
const brb = document.getElementById('brb-standby');
const audioVisualizer = document.getElementById('audio-visualizer');
let socket = null;
let peerConnection = null;

// Audio visualizer setup
let audioContext, analyser, source, animationId;

function showAudioVisualizer(stream) {
  audioVisualizer.style.display = 'block';
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  const canvasCtx = audioVisualizer.getContext('2d');
  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    animationId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);

    canvasCtx.clearRect(0, 0, audioVisualizer.width, audioVisualizer.height);
    canvasCtx.fillStyle = '#222';
    canvasCtx.fillRect(0, 0, audioVisualizer.width, audioVisualizer.height);

    const barWidth = (audioVisualizer.width / bufferLength) * 2.5;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i];
      canvasCtx.fillStyle = 'rgb(' + (barHeight+100) + ',50,200)';
      canvasCtx.fillRect(x, audioVisualizer.height - barHeight/2, barWidth, barHeight/2);
      x += barWidth + 1;
    }
  }
  draw();
}

function hideAudioVisualizer() {
  audioVisualizer.style.display = 'none';
  if (animationId) cancelAnimationFrame(animationId);
  if (source) source.disconnect();
  if (analyser) analyser.disconnect();
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
      if (!receivedStream.getTracks().includes(event.track)) {
        receivedStream.addTrack(event.track);
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

      video.play().catch(e => console.warn('[Viewer] Autoplay blocked:', e));

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
  socket.on('disconnectPeer', id => {
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
    showBRB(true);
  });


  // Ticker logic
  let tickerTimeouts = [];
  socket.on('start-ticker', ({ message, speed, loops, interval }) => {
    const tickerContainer = document.getElementById('ticker-container');
    const tickerText = document.getElementById('ticker-content');
    tickerText.textContent = message;
    tickerText.style.animationDuration = `${speed}s`;
    tickerContainer.style.display = 'block';

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