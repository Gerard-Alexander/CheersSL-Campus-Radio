export function setupTickerControls(socket) {
    const startBtn = document.getElementById('startTickerBtn');
    const stopBtn = document.getElementById('stopTickerBtn');
    let hasActiveTicker = false;

    const updateTickerButtonState = () => {
        if (startBtn) {
            startBtn.disabled = hasActiveTicker;
        }
    };

    startBtn?.addEventListener('click', () => {
        if (hasActiveTicker) return;

        const message = document.getElementById('tickerMessage').value;
        const speed = parseFloat(document.getElementById('tickerSpeed').value) || 10;
        const loops = parseInt(document.getElementById('tickerLoops').value) || 0;
        const interval = parseFloat(document.getElementById('tickerInterval').value) || 0;

        hasActiveTicker = true;
        updateTickerButtonState();
        console.log("[Ticker] Sending start-ticker");
        socket.emit('start-ticker', { message, speed, loops, interval });
    });

    stopBtn?.addEventListener('click', () => {
        hasActiveTicker = false;
        updateTickerButtonState();
        socket.emit('stop-ticker');
        console.log("[Ticker] Sending stop-ticker");
    });

    socket.on('start-ticker', () => {
        hasActiveTicker = true;
        updateTickerButtonState();
    });

    socket.on('stop-ticker', () => {
        hasActiveTicker = false;
        updateTickerButtonState();
    });

    updateTickerButtonState();
}
