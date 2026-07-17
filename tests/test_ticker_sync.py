from app.blueprints import webrtc


class FakeSocketIO:
    def __init__(self):
        self.events = []

    def emit(self, event, data=None, room=None, **kwargs):
        self.events.append((event, data, room))


def test_sync_ticker_state_emits_start_event_to_new_viewer():
    socketio = FakeSocketIO()
    ticker_state = {"message": "Live now", "speed": 10, "loops": 0, "interval": 2}

    webrtc.sync_ticker_state(socketio, "viewer-1", ticker_state)

    assert socketio.events == [("start-ticker", ticker_state, "viewer-1")]


def test_sync_ticker_state_skips_empty_state():
    socketio = FakeSocketIO()

    webrtc.sync_ticker_state(socketio, "viewer-1", None)

    assert socketio.events == []
