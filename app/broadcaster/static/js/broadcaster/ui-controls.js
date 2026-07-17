// ui-controls.js

export function setupThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    const saved = localStorage.getItem('theme');
    if (saved === 'light') document.body.classList.add('light-mode');
    toggle.textContent = saved === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode';

    toggle.onclick = () => {
        const isLight = document.body.classList.toggle('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        toggle.textContent = isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode';
    };
}


export function highlightSelectedElements() {
    document.addEventListener('click', function (e) {
        // Uploaded media
        if (e.target.closest('.uploaded-media')) {
            document.querySelectorAll('.uploaded-media.selected')
                .forEach(el => el.classList.remove('selected'));
            e.target.closest('.uploaded-media').classList.add('selected');
        }
        // Camera card
        else if (e.target.closest('.camera-card')) {
            document.querySelectorAll('.camera-card.selected')
                .forEach(el => el.classList.remove('selected'));
            e.target.closest('.camera-card').classList.add('selected');
        }
    });
}
