import { displayInCard } from './file-display.js';
import { playlistManager } from '../playlist/playlist-manager.js';

export function setupUploadManager() {
    setupUploadButtons();
    loadExistingUploads();
}

function setupUploadButtons() {
    const cards = document.querySelectorAll('.file-card');
    cards.forEach(card => {
        const type = card.dataset.type;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = type === 'video' ? 'video/*' :
            (type === 'audio' || type === 'sfx') ? 'audio/*' :
                type === 'image' ? 'image/*' : '*/*';
        input.style.display = 'none';
        document.body.appendChild(input);

        const section = card.closest('.section-right');
        const icon = section?.querySelector('.plus');
        if (icon && !icon.dataset.listenerAttached) {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                input.click();
            });
            icon.dataset.listenerAttached = 'true';
        }

        input.addEventListener('change', async () => {
            const file = input.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);
            // include the card type so server can mark SFX uploads
            try {
                formData.append('type', type);
            } catch (e) {
                console.warn('[UploadManager] failed to append type to formData', e);
            }

            try {
                const res = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (res.ok) {
                    // prefer server-declared type if provided (e.g., 'sfx')
                    displayInCard(card, file.name, data.url, null, data.type || type);
                } else {
                    alert(data.error || 'Upload failed.');
                }
            } catch (err) {
                alert('Network error during upload.');
            }
        });
    });
}

async function loadExistingUploads() {
    try {
        const res = await fetch('/uploads/files');
        const files = await res.json();

        files.forEach(f => {
            const ext = f.filename.split('.').pop().toLowerCase();
            // prefer server-provided type
            const serverType = f.type;
            const inferredType = ext.match(/(mp4|webm|avi|mov)/) ? 'video' :
                ext.match(/(mp3|wav|ogg|mp2|aac|flac|m4a)/) ? 'audio' :
                    ext.match(/(png|jpg|jpeg|gif|bmp|webp)/) ? 'image' : null;
            const type = serverType || inferredType;
            if (!type) return;

            const targetCard = document.querySelector(`.file-card[data-type="${type}"]`);
            if (targetCard) {
                const uploadedBy = f.uploaded_by?.name || "Unknown";
                displayInCard(targetCard, f.filename, f.path, uploadedBy, type);
            }
        });
    } catch (err) {
        console.error('Failed to load files:', err);
    }
}