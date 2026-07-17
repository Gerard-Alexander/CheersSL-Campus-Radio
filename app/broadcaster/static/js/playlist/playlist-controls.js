/**
 * Playlist playback controls: play, pause, next, previous, loop, shuffle.
 * Expects a playlistCore instance and a playMedia callback.
 */

export class PlaylistControls {
  constructor(playlistCore, playMediaCallback) {
    this.playlistCore = playlistCore;
    this.playMedia = playMediaCallback;
    this.loopMode = false;
    this.shuffleMode = false;
    this.shufflePool = [];
    this.playPauseButton = document.getElementById('btnPlayPause');
    this.playPauseIcon = document.getElementById('playPauseIcon');
    this.loopButton = document.getElementById('btnLoop');
    this.shuffleButton = document.getElementById('btnShuffle');
    window.playlistControls = this;
    this.setupControlButtons();
  }

  setupControlButtons() {
    console.log("[PlaylistControls] Setting up control buttons");
    document.getElementById('btnLoop')?.addEventListener('click', () => {
      console.log("[PlaylistControls] Loop mode toggled");
      this.loopMode = !this.loopMode;
      this.shuffleMode = false;
      this.updateModeButtons();
    });

    document.getElementById('btnShuffle')?.addEventListener('click', () => {
      console.log("[PlaylistControls] Shuffle mode toggled");
      this.shuffleMode = !this.shuffleMode;
      this.loopMode = false;
      if (this.shuffleMode) {
        this.resetShufflePool();
      } else {
        this.shufflePool = [];
      }
      this.updateModeButtons();
    });

    document.querySelector('.ctrl-btn-msc.prev')?.addEventListener('click', () => {
      console.log("[PlaylistControls] Previous button clicked");
      this.playPrevious();
    });

    document.querySelector('.ctrl-btn-msc.next')?.addEventListener('click', () => {
      console.log("[PlaylistControls] Next button clicked");
      this.playNext();
    });

    document.querySelector('.ctrl-btn-msc.playpause')?.addEventListener('click', () => {
      console.log("[PlaylistControls] Toggling play/pause");
      this.togglePause();
    });
  }

  updateModeButtons() {
    this.loopButton?.classList.toggle('active', this.loopMode);
    this.shuffleButton?.classList.toggle('active', this.shuffleMode);
  }

  resetShufflePool() {
    const totalItems = this.playlistCore.items.length;
    if (totalItems <= 0) {
      this.shufflePool = [];
      return;
    }

    this.shufflePool = [];
    for (let index = 0; index < totalItems; index++) {
      if (index !== this.playlistCore.currentIndex) {
        this.shufflePool.push(index);
      }
    }
  }

  getNextShuffledIndex() {
    const totalItems = this.playlistCore.items.length;
    if (totalItems === 0) return -1;
    if (totalItems === 1) return 0;

    if (!this.shufflePool.length) {
      this.resetShufflePool();
    }

    if (!this.shufflePool.length) {
      return -1;
    }

    const randomPosition = Math.floor(Math.random() * this.shufflePool.length);
    const [nextIndex] = this.shufflePool.splice(randomPosition, 1);
    return nextIndex;
  }

  getNextIndex() {
    const totalItems = this.playlistCore.items.length;
    if (totalItems === 0) return -1;

    if (this.shuffleMode) {
      return this.getNextShuffledIndex();
    }

    const nextIndex = this.playlistCore.currentIndex + 1;
    if (nextIndex < totalItems) return nextIndex;

    if (this.loopMode) return 0;

    return -1;
  }

  setPlayPauseButtonState(state) {
    if (!this.playPauseButton || !this.playPauseIcon) return;

    const label = state === 'playing' ? 'Pause' : state === 'paused' ? 'Resume' : 'Play';
    this.playPauseButton.title = label;
    this.playPauseButton.setAttribute('aria-label', label);
    this.playPauseIcon.src = state === 'playing'
      ? this.playPauseIcon.dataset.pauseIcon
      : this.playPauseIcon.dataset.playIcon;
    this.playPauseIcon.alt = label;
  }

  playPrevious() {
    if (this.playlistCore.currentIndex > 0) {
      this.playlistCore.currentIndex--;
      if (this.shuffleMode) {
        this.resetShufflePool();
      }
      this.playMedia();
    }
  }

  playNext() {
    const nextIndex = this.getNextIndex();
    if (nextIndex < 0) return;

    this.playlistCore.currentIndex = nextIndex;
    if (this.shuffleMode && this.shufflePool.length === 0) {
      this.resetShufflePool();
    }
    this.playMedia();
  }

  togglePause() {
    const media = window.currentActiveMedia;
    if (!media) {
      console.warn("[togglePause] No active media found.");
      return;
    }

    if (media.paused) {
      media.play()
        .then(() => {
          console.log("[togglePause] Resumed playback");
          this.setPlayPauseButtonState('playing');
        })
        .catch(err => console.warn("[togglePause] play() failed", err));
    } else {
      media.pause();
      this.setPlayPauseButtonState('paused');
      console.log("[togglePause] Paused playback");
    }
  }


  handleMediaEnd() {
    const nextIndex = this.getNextIndex();
    if (nextIndex < 0) {
      this.playlistCore.currentIndex = -1;
      this.setPlayPauseButtonState('idle');
      return;
    }

    this.playlistCore.currentIndex = nextIndex;
    this.playMedia();
  }
}