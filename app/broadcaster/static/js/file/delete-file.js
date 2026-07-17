import { playlistManager } from '../playlist/playlist-manager.js';

export async function deleteUploadedFile(ext, filename, blockElement) {
    const confirmMsg = `Are you sure you want to delete "${filename}"?\nThis will remove it from all playlists and from the database.`;
    if (!confirm(confirmMsg)) return;

    try {
        const res = await fetch(`/uploads/${ext}/${filename}`, {
            method: 'DELETE'
        });

        let data = {};
        try {
            data = await res.json();
        } catch (e) {}

        if (res.ok) {
            // Remove from UI
            blockElement.remove();

            // Remove from playlist
            const fileUrl = `/uploads/${ext}/${filename}`;
            playlistManager.removeItemsByUrl(fileUrl);

            // Optionally notify backend to remove from all playlists
            await fetch('/playlists/remove_file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: fileUrl })
            });

            // Optionally refresh playlist list in UI
            if (typeof playlistManager.listAllPlaylists === 'function') {
                await playlistManager.listAllPlaylists();
            }
        } else {
            alert(data.error || 'Delete failed.');
        }
    } catch (err) {
        alert('Network error during delete.');
    }
}