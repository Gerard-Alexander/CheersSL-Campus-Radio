import { switchToStream } from '../broadcaster/stream-manager.js';
import { updateNowPlaying } from './playlist-ui.js';
import { videoPreview, audioPreview, audioA, audioB } from '../utils/media-elements.js';
import {
  stopAudioVisualizer,
  setupAudioVisualizer,
  setupDeckAudio,
  fadeGain
} from '../broadcaster/waveform-visualizer.js';

let currentDeck = audioA;
let lastDeck = null;
const crossfadeDuration = 3;
window.currentActiveMedia = null;

function stopCurrentAudioDeck(callback) {
  if (!lastDeck && !currentDeck) return callback?.();

  const fadeOutTarget = currentDeck || lastDeck;
  if (!fadeOutTarget || fadeOutTarget.paused) return callback?.();

  console.log('[Deck] Fading out audio for video switch');
  const fadeOutGain = setupDeckAudio(fadeOutTarget);
  if (fadeOutGain) {
    fadeGain(fadeOutGain, 1, 0, crossfadeDuration, () => {
      fadeOutTarget.pause();
      fadeOutTarget.currentTime = 0;
      fadeOutTarget.src = '';
      callback?.();
    });
  } else {
    fadeOutTarget.pause();
    fadeOutTarget.currentTime = 0;
    fadeOutTarget.src = '';
    callback?.();
  }
}

export function playMediaItem(item, onEnd) {
  const ext = item.name.split('.').pop().toLowerCase();
  console.log('[playMediaItem] Playing item:', item.name, '| Extension:', ext);

  videoPreview?.pause();
  videoPreview.srcObject = null;
  videoPreview.removeAttribute('src');
  videoPreview.load();

  audioPreview?.pause();
  audioPreview.src = '';
  audioPreview.load();

  if (/(mp4|webm|avi|mov)/.test(ext)) {
    stopCurrentAudioDeck(() => {
      window.currentActiveMedia = videoPreview;
      videoPreview.src = item.url;
      videoPreview.controls = true;
      videoPreview.autoplay = true;
      videoPreview.muted = false;

      videoPreview.onplaying = () => {
        const stream = videoPreview.captureStream?.();
        if (stream) switchToStream(stream);
      };

      videoPreview.onended = () => onEnd?.();

      const container = document.getElementById('video-preview-container');
      container.style.display = 'block';
      document.getElementById('audio-preview-container').style.display = 'none';
      document.getElementById('camera-preview-container').style.display = 'none';
      container.innerHTML = '';
      container.appendChild(videoPreview);

      videoPreview.play().catch(err => console.warn('[play()] error:', err));
      updateNowPlaying(item);
    });
    return;
  }

  if (/(mp3|wav|ogg|aac|flac|m4a)/.test(ext)) {
    stopAudioVisualizer();

    const nextDeck = currentDeck === audioA ? audioB : audioA;
    const prevDeck = currentDeck;

    const isSameTrack = nextDeck.src === item.url;
    const isSameDeck = nextDeck.currentTime > 0 && !nextDeck.paused;

    if (isSameTrack && isSameDeck) {
      console.log('[Replay] Restarting same track');
      nextDeck.pause();
      nextDeck.currentTime = 0;

      nextDeck.onplaying = () => {
        const gain = setupDeckAudio(nextDeck);
        if (!gain) return;

        const stream = nextDeck.captureStream?.();
        if (stream) {
          audioPreview.srcObject = stream;
          audioPreview.muted = true;
          audioPreview.play().catch(err => console.warn('[audioPreview.play()] error:', err));
          switchToStream(stream);
          setupAudioVisualizer(nextDeck);
        }

        fadeGain(gain, 0, 1, crossfadeDuration);
      };

      nextDeck.play().catch(err => console.warn('[Replay] play() error', err));
      updateNowPlaying(item);
      return;
    }

    console.log('[Crossfade] Switching to:', nextDeck === audioA ? 'audioA' : 'audioB');
    nextDeck.pause();
    nextDeck.src = item.url;
    nextDeck.load();

    nextDeck.onplaying = () => {
      console.log('[Crossfade] Next deck is playing');

      const gainNext = setupDeckAudio(nextDeck);
      const gainPrev = setupDeckAudio(prevDeck);

      const stream = nextDeck.captureStream?.();
      if (stream) {
        audioPreview.srcObject = stream;
        audioPreview.muted = true;
        audioPreview.play().catch(err => console.warn('[audioPreview.play()] error:', err));
        switchToStream(stream);
        setupAudioVisualizer(nextDeck);
      } else {
        console.warn('[Crossfade] captureStream failed');
      }

      if (gainNext) fadeGain(gainNext, 0, 1, crossfadeDuration);
      if (prevDeck && gainPrev) {
        fadeGain(gainPrev, 1, 0, crossfadeDuration, () => {
          prevDeck.pause();
          prevDeck.currentTime = 0;
          prevDeck.src = '';
        });
      }
    };

    nextDeck.onended = () => onEnd?.();

    const container = document.getElementById('audio-preview-container');
    const visualizer = document.getElementById('audio-visualizer');
    container.style.display = 'block';
    document.getElementById('video-preview-container').style.display = 'none';
    document.getElementById('camera-preview-container').style.display = 'none';
    container.innerHTML = '';
    if (visualizer) container.appendChild(visualizer);
    container.appendChild(audioPreview);
    container.appendChild(audioA);
    container.appendChild(audioB);

    audioA.style.display = nextDeck === audioA ? 'block' : 'none';
    audioB.style.display = nextDeck === audioB ? 'block' : 'none';
    audioPreview.style.display = 'block';

    nextDeck.play()
      .then(() => console.log('[Crossfade] nextDeck.play() success'))
      .catch(err => console.warn('[Crossfade play()] error:', err));

    updateNowPlaying(item);
    lastDeck = prevDeck;
    currentDeck = nextDeck;
    window.currentActiveMedia = nextDeck;
    return;
  }

  console.warn('[playMediaItem] Unsupported media type');
}
