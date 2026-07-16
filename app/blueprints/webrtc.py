from flask import Blueprint, request
from flask_socketio import emit

webrtc_bp = Blueprint('webrtc', __name__)
broadcaster_sid = None
viewers = {}  # key = viewer sid, value = True

def register_webrtc_events(socketio):
    global broadcaster_sid, viewers

    @socketio.on('broadcaster')
    def handle_broadcaster():
        global broadcaster_sid
        broadcaster_sid = request.sid
        print("[Server] Broadcaster connected:", broadcaster_sid)
        emit('broadcaster', broadcast=True, include_self=False)

    @socketio.on('watcher')
    def handle_watcher():
        sid = request.sid
        if broadcaster_sid:
            print(f"[Server] Watcher connected: {sid}")
            viewers[sid] = True
            emit('watcher', sid, room=broadcaster_sid)

    @socketio.on('offer')
    def handle_offer(watcher_id, description):
        print(f"[Server] Offer from broadcaster to {watcher_id}")
        emit('offer', (request.sid, description), room=watcher_id)

    @socketio.on('answer')
    def handle_answer(broadcaster_id, description):
        print(f"[Server] Answer from watcher to broadcaster")
        emit('answer', (request.sid, description), room=broadcaster_id)

    @socketio.on('candidate')
    def handle_candidate(peer_id, candidate):
        print(f"[Server] ICE candidate from {request.sid} to {peer_id}")
        emit('candidate', (request.sid, candidate), room=peer_id)

    @socketio.on('disconnect')
    def handle_disconnect():
        global broadcaster_sid
        sid = request.sid
        print(f"[Server] Disconnected: {sid}")

        if sid == broadcaster_sid:
            print("[Server] Broadcaster disconnected")
            broadcaster_sid = None
            # Disconnect all viewers
            for viewer_sid in viewers:
                emit('disconnectPeer', sid, room=viewer_sid)
            viewers.clear()
        elif sid in viewers:
            print(f"[Server] Viewer disconnected: {sid}")
            # Notify the broadcaster about this viewer
            if broadcaster_sid:
                emit('disconnectPeer', sid, room=broadcaster_sid)
            viewers.pop(sid, None)
            
    @socketio.on('start-ticker')
    def handle_start_ticker(data):
        print(f"[Ticker Start] {data}")
        emit('start-ticker', data, broadcast=True)

    @socketio.on('stop-ticker')
    def handle_stop_ticker():
        print("[Ticker Stop]")
        emit('stop-ticker', broadcast=True)
    