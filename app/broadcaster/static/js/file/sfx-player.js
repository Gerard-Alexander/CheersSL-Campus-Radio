import { getCurrentStream, refreshLocalAudioMonitor } from '../broadcaster/stream-manager.js';
import { notifyBroadcaster } from '../broadcaster/webrtc-handler.js';

let activeSfxAudio = null;
let audioContext = null;
let sfxDestination = null;
let attachedSfxTrack = null;
let attachedSfxStream = null;

function ensureSfxAudioGraph() {
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume().catch(err => console.warn('[SFX] Failed to resume audio context:', err));
    }

    if (!sfxDestination) {
        sfxDestination = audioContext.createMediaStreamDestination();
    }

    return { audioContext, sfxDestination };
}

function attachSfxToBroadcast(audio) {
    const { audioContext, sfxDestination } = ensureSfxAudioGraph();
    const stream = getCurrentStream();

    if (!audio.__sfxConnected) {
        const source = audioContext.createMediaElementSource(audio);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1;
        source.connect(gainNode);
        gainNode.connect(sfxDestination);

        audio.__sfxConnected = true;
        audio.__sfxSource = source;
        audio.__sfxGainNode = gainNode;
    }

    if (!stream) return;

    const destinationTracks = sfxDestination.stream.getAudioTracks();
    if (!destinationTracks.length) return;

    const track = destinationTracks[0];
    const alreadyAttached = attachedSfxTrack && attachedSfxStream?.getTracks().includes(attachedSfxTrack);

    if (!alreadyAttached || attachedSfxTrack?.id !== track.id) {
        if (attachedSfxTrack && attachedSfxStream?.getTracks().includes(attachedSfxTrack)) {
            attachedSfxStream.removeTrack(attachedSfxTrack);
        }

        attachedSfxTrack = track;
        attachedSfxStream = stream;
        stream.addTrack(track);
        notifyBroadcaster();
        refreshLocalAudioMonitor();
    }
}

function detachSfxFromBroadcast() {
    if (attachedSfxTrack && attachedSfxStream?.getTracks().includes(attachedSfxTrack)) {
        attachedSfxStream.removeTrack(attachedSfxTrack);
        notifyBroadcaster();
        refreshLocalAudioMonitor();
    }

    attachedSfxTrack = null;
    attachedSfxStream = null;
}

export function playSideEffect(url, name = 'Sound effect') {
    if (activeSfxAudio && !activeSfxAudio.paused) {
        activeSfxAudio.pause();
        activeSfxAudio.currentTime = 0;
    }

    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.volume = 1;
    audio.onended = () => {
        if (activeSfxAudio === audio) {
            activeSfxAudio = null;
            detachSfxFromBroadcast();
        }
    };

    activeSfxAudio = audio;
    audio.play()
        .then(() => {
            attachSfxToBroadcast(audio);
        })
        .catch(err => {
            console.warn('[SFX] Playback failed for', name, err);
            activeSfxAudio = null;
            detachSfxFromBroadcast();
        });

    return audio;
}

export function stopSideEffect() {
    if (activeSfxAudio) {
        activeSfxAudio.pause();
        activeSfxAudio.currentTime = 0;
        activeSfxAudio = null;
    }

    detachSfxFromBroadcast();
}
