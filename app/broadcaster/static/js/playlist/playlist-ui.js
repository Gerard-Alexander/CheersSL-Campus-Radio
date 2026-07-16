import { getVideoDuration, getAudioDuration } from './playlist-duration.js';
import { generateVideoThumbnail } from '../file/video-thumbnail.js';
import { playlistManager } from './playlist-manager.js';
import { generateUUID } from '../utils/gen-ID.js';

export function setUpPlaylist() {
    const container = document.querySelector('.playlist-items');
    Sortable.create(container, {
        animation: 150,
        draggable: '.media-block',
        handle: '.media-block',
        onStart(evt) {
            console.log('[Sortable] Drag started');
            console.log('  Dragging index:', evt.oldIndex);
        },
        onEnd(evt) {
            console.log('[Sortable] Drag ended');
            console.log('  Moved from:', evt.oldIndex, 'to:', evt.newIndex);

            if (evt.oldIndex === evt.newIndex) {
                console.log('  ⚠️ No change in position');
                return;
            }

            // Get new order from DOM
            const newOrder = Array.from(container.children).map(
                el => el.dataset.fileId
            );

            playlistManager.reorderByFileIdOrder(newOrder);
        }
    });
    console.log('[Playlist] Items initialized:', container.children.length);

}
/**
 * Render all playlist items in the UI.
 * @param {Array} playlistItems
 * @param {function} onPlayItem - Called with index when an item is clicked
 * @param {function} onDeleteItem - Called with index when delete is clicked
 */

export function renderPlaylist(playlistItems, onPlayItem, onDeleteItem) {
    const container = document.querySelector('.playlist-items');
    if (!container) return;

    container.innerHTML = '';
    playlistItems.forEach((item, index) => {
        const block = createMediaBlock(item, index, onPlayItem, onDeleteItem);
        block.dataset.index = index; // ensure correct index after sort
        container.appendChild(block);
    });

}


/**
 * Create a playlist item block for the UI.
 * @param {object} item
 * @param {number} index
 * @param {function} onPlayItem
 * @param {function} onDeleteItem
 * @returns {HTMLElement}
 */
export function createMediaBlock(item, index, onPlayItem, onDeleteItem) {
    // Assign a persistent unique ID if not already present
    if (!item.fileId) {
        item.fileId = generateUUID();
    }

    const block = document.createElement('div');
    block.className = 'media-block';
    block.dataset.index = index;
    block.dataset.fileId = item.fileId;

    const mediaInfo = document.createElement('div');
    mediaInfo.className = 'media-info';
    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.textContent = '☰';
    block.prepend(dragHandle);

    const preview = document.createElement('img');
    preview.width = 40;
    preview.height = 40;

    const ext = item.name.split('.').pop().toLowerCase();
    if (/(mp4|webm|avi|mov)/.test(ext)) {
        generateVideoThumbnail(item.url, preview);
    } else if (/(mp3|wav|ogg|aac|flac|m4a)/.test(ext)) {
        preview.src = 'https://dummyimage.com/40x40/000/fff&text=MP3';
    } else {
        preview.src = 'https://dummyimage.com/40x40/000/fff&text=IMG';
    }

    const label = document.createElement('span');
    label.className = 'media-title';
    label.textContent = item.name;

    mediaInfo.append(preview, label);

    const rightSide = document.createElement('div');
    rightSide.className = 'media-right';

    const duration = document.createElement('span');
    duration.className = 'media-duration';

    // Show duration if available, otherwise fetch it
    if (item.duration && item.duration > 0) {
        const min = Math.floor(item.duration / 60);
        const sec = Math.floor(item.duration % 60);
        duration.textContent = `${min}:${String(sec).padStart(2, '0')}`;
    } else if (/(mp4|webm|avi|mov)/.test(ext)) {
        getVideoDuration(item.url, dur => duration.textContent = dur);
    } else if (/(mp3|wav|ogg|aac|flac|m4a)/.test(ext)) {
        getAudioDuration(item.url, dur => duration.textContent = dur);
    }
    rightSide.appendChild(duration);

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.innerHTML = `<img src="${window.STATIC_ICON_PATH}close.png" alt="Delete" style="width:11px;height:11px;vertical-align:middle;">`;
    delBtn.onclick = (e) => {
        e.stopPropagation();
        if (typeof onDeleteItem === 'function') onDeleteItem(index);
    };
    rightSide.appendChild(delBtn);

    block.append(mediaInfo, rightSide);
    block.onclick = () => {
        console.log("[createMediaBlock] item.url =", item.url, "item.name =", item.name);
        if (typeof onPlayItem === 'function') onPlayItem(index);
    };

    return block;
}

/**
 * Update the now-playing UI block.
 * @param {object} item
 */
export function updateNowPlaying(item) {
    const nowPlayingContent = document.querySelector('.now-playing-content');
    const nowPlayingBlock = document.querySelector('.now-playing-block');
    if (!nowPlayingContent || !nowPlayingBlock) return;
    nowPlayingContent.innerHTML = '';
    nowPlayingContent.appendChild(createMediaBlock(item, 0));
    nowPlayingBlock.classList.add('playing');
}

/**
 * Clear the playlist UI.
 */
export function clearPlaylistUI() {
    document.querySelector('.now-playing-block')?.classList.remove('playing');
    document.querySelector('.playlist-items').innerHTML = '';
    document.querySelector('.now-playing-content').innerHTML = '';
}