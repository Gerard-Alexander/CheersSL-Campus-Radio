/**
 * Get the duration of a video file.
 * @param {string} url
 * @param {function} cb - Callback with formatted duration string (mm:ss)
 */
export function getVideoDuration(url, cb) {
  const video = document.createElement('video');
  video.src = url;
  video.preload = 'metadata';
  video.onloadedmetadata = () => {
    const duration = video.duration;
    const min = Math.floor(duration / 60);
    const sec = Math.floor(duration % 60);
    cb(`${min}:${String(sec).padStart(2, '0')}`);
  };
  video.onerror = () => cb('0:00');
}

/**
 * Get the duration of an audio file.
 * @param {string} url
 * @param {function} cb - Callback with formatted duration string (mm:ss)
 */
export function getAudioDuration(url, cb) {
  const audio = document.createElement('audio');
  audio.src = url;
  audio.preload = 'metadata';
  audio.onloadedmetadata = () => {
    const duration = audio.duration;
    const min = Math.floor(duration / 60);
    const sec = Math.floor(duration % 60);
    cb(`${min}:${String(sec).padStart(2, '0')}`);
  };
  audio.onerror = () => cb('0:00');
}

/**
 * Update the total duration display for the playlist.
 * @param {Array} playlistItems
 */
export function updateTotalDuration(playlistItems) {
  const totalSeconds = playlistItems.reduce((sum, item) => sum + (item.duration || 0), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const formatted = hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
  const display = document.getElementById('playlistTotalDuration');
  if (display) display.textContent = `🕒 Total Duration: ${formatted}`;
  console.log("[updateTotalDuration] Total duration updated:", formatted);
}

/**
 * Set the duration property for a playlist item (audio or video).
 * Calls the callback when done.
 * @param {object} item
 * @param {function} cb
 */
export function setMediaDuration(item, cb) {
  const ext = item.name.split('.').pop().toLowerCase();
  if (/(mp4|webm|avi|mov)/.test(ext)) {
    getVideoDuration(item.url, (formatted) => {
      const [min, sec] = formatted.split(':').map(Number);
      item.duration = min * 60 + sec;
      cb && cb();
    });
  } else if (/(mp3|wav|ogg|aac|flac|m4a)/.test(ext)) {
    getAudioDuration(item.url, (formatted) => {
      const [min, sec] = formatted.split(':').map(Number);
      item.duration = min * 60 + sec;
      cb && cb();
    });
  } else {
    item.duration = 0;
    cb && cb();
  }
}