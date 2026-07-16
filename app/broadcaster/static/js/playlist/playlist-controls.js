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
    this.setupControlButtons();
  }

  setupControlButtons() {
    console.log("[PlaylistControls] Setting up control buttons");
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

    document.querySelector('.ctrl-btn-msc.loop')?.addEventListener('click', () => {
      console.log("[PlaylistControls] Loop mode toggled");
      this.loopMode = !this.loopMode;
      this.shuffleMode = false;
      this.updateModeButtons();
    });

    document.querySelector('.ctrl-btn-msc.shuffle')?.addEventListener('click', () => {
      console.log("[PlaylistControls] Shuffle mode toggled");
      this.shuffleMode = !this.shuffleMode;
      this.loopMode = false;
      this.updateModeButtons();
    });
  }

  updateModeButtons() {
    document.querySelector('.ctrl-btn-msc.loop')?.classList.toggle('active', this.loopMode);
    document.querySelector('.ctrl-btn-msc.shuffle')?.classList.toggle('active', this.shuffleMode);
  }

  playPrevious() {
    if (this.playlistCore.currentIndex > 0) {
      this.playlistCore.currentIndex--;
      this.playMedia();
    }
  }

  playNext() {
    if (this.playlistCore.currentIndex < this.playlistCore.items.length - 1) {
      this.playlistCore.currentIndex++;
      this.playMedia();
    }
  }

  togglePause() {
    const media = window.currentActiveMedia;
    if (!media) {
      console.warn("[togglePause] No active media found.");
      return;
    }

    if (media.paused) {
      media.play()
        .then(() => console.log("[togglePause] Resumed playback"))
        .catch(err => console.warn("[togglePause] play() failed", err));
    } else {
      media.pause();
      console.log("[togglePause] Paused playback");
    }
  }


  handleMediaEnd() {
    if (this.loopMode) {
      this.playMedia();
    } else if (this.shuffleMode) {
      let next;
      do next = Math.floor(Math.random() * this.playlistCore.items.length);
      while (next === this.playlistCore.currentIndex);
      this.playlistCore.currentIndex = next;
      this.playMedia();
    } else if (this.playlistCore.currentIndex < this.playlistCore.items.length - 1) {
      this.playlistCore.currentIndex++;
      this.playMedia();
    } else {
      this.playlistCore.currentIndex = -1;
    }
  }
}