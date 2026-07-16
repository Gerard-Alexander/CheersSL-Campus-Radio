export function setupTickerControls(socket) {
    const startBtn = document.getElementById('startTickerBtn');
    const stopBtn = document.getElementById('stopTickerBtn');

    startBtn?.addEventListener('click', () => {
        const message = document.getElementById('tickerMessage').value;
        const speed = parseFloat(document.getElementById('tickerSpeed').value) || 10;
        const loops = parseInt(document.getElementById('tickerLoops').value) || 0;
        const interval = parseFloat(document.getElementById('tickerInterval').value) || 0;

        console.log("[Ticker] Sending start-ticker");
        socket.emit('start-ticker', { message, speed, loops, interval });
    });

    stopBtn?.addEventListener('click', () => {
        socket.emit('stop-ticker');
        console.log("[Ticker] Sending stop-ticker");
    });
}
