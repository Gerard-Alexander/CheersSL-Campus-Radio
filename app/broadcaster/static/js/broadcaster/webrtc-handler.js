import { incrementViewerCount, decrementViewerCount } from './stream-utils.js';

let socket;
let peerConnections = {};
let pendingCandidates = {};
let connectedViewers = new Set();
let getCurrentStream;

async function createPeerConnection(id) {
    const stream = getCurrentStream();
    if (!stream || !socket) return null;

    const existingPc = peerConnections[id];
    if (existingPc && existingPc.signalingState !== 'closed' && existingPc.connectionState !== 'closed') {
        return existingPc;
    }

    const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' },
        {
            urls: 'turn:10.13.139.23:3478',
            username: 'user',
            credential: 'password'
        }
        ],
        iceTransportPolicy: 'all'
    });

    peerConnections[id] = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    const sender = pc.getSenders().find(s => s.track.kind === 'video');
    if (sender) {
        const params = sender.getParameters();
        if (!params.encodings) params.encodings = [{}];
        params.encodings[0].maxBitrate = 3_000_000;
        sender.setParameters(params).catch(err =>
            console.warn(`Bitrate setting failed:`, err)
        );
    }

    const audio_sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
    if (audio_sender) {
        const params = audio_sender.getParameters();
        if (!params.encodings) params.encodings = [{}];
        params.encodings[0].maxBitrate = 128_000;
        audio_sender.setParameters(params).catch(err =>
            console.warn(`Audio bitrate setting failed:`, err)
        );
    }

    pc.onicecandidate = e => {
        if (e.candidate) socket.emit('candidate', id, e.candidate);
    };

    try {
        await pc.setLocalDescription(await pc.createOffer());
        socket.emit('offer', id, pc.localDescription);
    } catch (err) {
        console.error(`Offer error for ${id}:`, err);
    }

    return pc;
}

export function setupWebRTCHandlers(io, streamGetter) {
    socket = io;
    getCurrentStream = streamGetter;

    socket.on('watcher', async (id) => {
        const stream = getCurrentStream();
        if (!stream) return;

        if (!connectedViewers.has(id)) {
            connectedViewers.add(id);
            incrementViewerCount(); // Optional: you can pass a callback for this
        }

        await createPeerConnection(id);
    });

    socket.on('answer', async (id, desc) => {
        const pc = peerConnections[id];
        if (!pc) return;

        if (pc.signalingState === 'stable' && pc.remoteDescription) {
            console.warn(`[WebRTC] Ignoring duplicate answer for ${id}`);
            return;
        }

        if (pc.signalingState !== 'have-local-offer') {
            console.warn(`[WebRTC] Skipping answer for ${id} in state ${pc.signalingState}`);
            return;
        }

        try {
            await pc.setRemoteDescription(desc);
            if (pendingCandidates[id]) {
                for (const c of pendingCandidates[id]) {
                    pc.addIceCandidate(new RTCIceCandidate(c));
                }
                delete pendingCandidates[id];
            }
        } catch (err) {
            console.error(`Answer error for ${id}:`, err);
        }
    });

    socket.on('candidate', (id, candidate) => {
        const pc = peerConnections[id];
        if (pc?.remoteDescription) {
            pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
            (pendingCandidates[id] = pendingCandidates[id] || []).push(candidate);
        }
    });

    socket.on('disconnectPeer', (id) => {
        if (peerConnections[id]) {
            peerConnections[id].close();
            delete peerConnections[id];
        }
        if (connectedViewers.has(id)) {
            connectedViewers.delete(id);
            decrementViewerCount(); // Optional
        }
    });
}

export async function syncCurrentStreamToViewers() {
    const stream = getCurrentStream();
    if (!socket || !stream) return;

    const viewerIds = Array.from(Object.keys(peerConnections));
    for (const id of viewerIds) {
        const oldPc = peerConnections[id];
        if (oldPc) {
            oldPc.close();
            delete peerConnections[id];
        }

        await createPeerConnection(id);
    }
}

export function notifyBroadcaster() {
    if (socket && getCurrentStream()?.getTracks().length) {
        socket.emit('broadcaster');
        syncCurrentStreamToViewers().catch(err => console.warn('[WebRTC] Stream sync failed:', err));
    }
}

export function stopWebRTC() {
    Object.values(peerConnections).forEach(pc => pc.close());
    peerConnections = {};
    connectedViewers.clear();
}

export function getPeerConnections() {
    return peerConnections;
}
