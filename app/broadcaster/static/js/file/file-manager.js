import { setupUploadManager } from './upload-manager.js';
import { displayInCard } from './file-display.js';
import { deleteUploadedFile } from './delete-file.js';
import { generateVideoThumbnail } from './video-thumbnail.js';
import { playlistManager } from '../playlist/playlist-manager.js';

class FileManager {
    setup() {
        setupUploadManager();
    }

    showFileInCard(container, name, url, uploadedBy = null) {
        displayInCard(container, name, url, uploadedBy);
    }

    async removeUploadedFile(ext, filename, blockElement) {
        await deleteUploadedFile(ext, filename, blockElement);
    }

    createVideoThumbnail(videoUrl, imgElement) {
        generateVideoThumbnail(videoUrl, imgElement);
    }

    addToPlaylist(name, url) {
        playlistManager.addItem(name, url);
    }

    removeFromPlaylist(url) {
        playlistManager.removeItemsByUrl(url);
    }
}

// Export a singleton instance
export const fileManager = new FileManager();