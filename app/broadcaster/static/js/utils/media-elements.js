// Main reference for one-off audio (non-crossfade)
export const audioPreview = document.createElement('audio');
audioPreview.autoplay = true;

// Crossfade decks
export const audioA = document.createElement('audio');
audioA.autoplay = true;

export const audioB = document.createElement('audio');
audioB.autoplay = true;

// Video preview
export const videoPreview = document.createElement('video');
videoPreview.controls = true;
videoPreview.autoplay = true;
videoPreview.playsInline = true;
videoPreview.style.width = "100%";
videoPreview.style.height = "100%";

// Camera preview
export const cameraPreview = document.createElement('video');
cameraPreview.autoplay = true;
cameraPreview.muted = true;
cameraPreview.playsInline = true;
cameraPreview.style.width = "100%";
cameraPreview.style.height = "100%";
