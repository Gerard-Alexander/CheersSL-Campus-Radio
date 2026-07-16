import { incrementViewerCount, decrementViewerCount } from './stream-utils.js';

let socket;
let peerConnections = {};
let pendingCandidates = {};
let connectedViewers = new Set();
let getCurrentStream;

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

        pc.onicecandidate = e => {
            if (e.candidate) socket.emit('candidate', id, e.candidate);
        };

        try {
            await pc.setLocalDescription(await pc.createOffer());
            socket.emit('offer', id, pc.localDescription);
        } catch (err) {
            console.error(`Offer error for ${id}:`, err);
        }
    });

    socket.on('answer', async (id, desc) => {
        const pc = peerConnections[id];
        if (!pc) return;
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

export function notifyBroadcaster() {
    if (socket && getCurrentStream()?.getTracks().length) {
        socket.emit('broadcaster');
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
