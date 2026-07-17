import { audioPreview } from "../utils/media-elements";

// audio context elements
const audioCtx = new AudioContext();

//  DJ deck elements-need to be added first 
const audioA = document.getElementById('audioPreview');
const audioB = document.getElementById('audioB');
const playPauseA = document.getElementById('playPauseA');
const playPauseB = document.getElementById('playPauseB');
const volumeA = document.getElementById('volumeA');
const volumeB = document.getElementById('volumeB');
const crossfader = document.getElementById('crossfader');

// Play/Pause
playPauseA.addEventListener('click', () => {

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    // Play or pause track depending on state
    if (playPauseButton.dataset.playing === "false") {
      playPauseButton.dataset.playing = "true";
      playPauseButton.innerHTML = 'Pause';
      audioA.play();
    } else if (playPauseButton.dataset.playing === "true") {
      playPauseButton.dataset.playing = "false";
      playPauseButton.innerHTML = 'Play';
      audioA.pause();
    }
      console.log(musicQueueIndex);
    let state = 
      playPauseA.getAttribute("aria-checked") === "true" ? 'true': false;
      playPauseA.setAttribute("aria-checked", state ? true : false);
  },
  false
  );


playPauseB.addEventListener('click', () => {
  if (audioCtx.state === "suspended") {
      f.resume();
    }
    // Play or pause track depending on state
    if (playPauseButton.dataset.playing === "false") {
      playPauseButton.dataset.playing = "true";
      playPauseButton.innerHTML = 'Pause';
      audioB.play();
    } else if (playPauseButton.dataset.playing === "true") {
      playPauseButton.dataset.playing = "false";
      playPauseButton.innerHTML = 'Play';
      audioB.pause();
    }
      console.log(musicQueueIndex);
    let state = 
      playPauseB.getAttribute("aria-checked") === "true" ? 'true': false;
      playPauseB.setAttribute("aria-checked", state ? true : false);
  },
  false
  );

  // functions to add
  //load playlist to deck a and b
function loadPlaylist(){
}

function crossFadeToggle(){

} 
