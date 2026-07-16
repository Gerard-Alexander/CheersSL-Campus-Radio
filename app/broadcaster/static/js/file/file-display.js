import { generateVideoThumbnail } from './video-thumbnail.js';
import { playlistManager } from '../playlist/playlist-manager.js';
import { deleteUploadedFile } from './delete-file.js';

export function displayInCard(container, name, url, uploadedBy = null) {
    const fileContainer = container.querySelector('.file-container');
    const exists = Array.from(fileContainer.children).some(child =>
        child.dataset.url === url || child.dataset.name === name
    );
    if (exists) return;

    const ext = name.split('.').pop().toLowerCase();
    const isVideo = /(mp4|webm|avi|mov)/.test(ext);
    const isAudio = /(mp3|wav|ogg)/.test(ext);
    const isImage = /(png|jpg|jpeg|gif|bmp|webp)/.test(ext);

    const media = document.createElement('div');
    media.classList.add('uploaded-media');
    media.dataset.url = url;
    media.dataset.name = name;

    const preview = document.createElement('img');
    preview.width = 40;
    preview.height = 40;

    if (isVideo) {
        generateVideoThumbnail(url, preview);
    } else if (isAudio) {
        preview.src = 'https://dummyimage.com/40x40/000/fff&text=MP3';
    } else if (isImage) {
        preview.src = url;
    } else {
        preview.src = 'https://dummyimage.com/40x40/000/fff&text=?';
    }

    const label = document.createElement('div');
    label.textContent = name.length > 20 ? name.slice(0, 17) + '...' : name;
    label.classList.add('uploaded-label');

    const uploader = document.createElement('div');
    uploader.classList.add('uploader-label');
    uploader.textContent = uploadedBy ? `Uploaded by: ${uploadedBy}` : '';
    uploader.style.fontSize = '0.75em';
    uploader.style.color = '#888';
    uploader.style.marginTop = '2px';

    media.appendChild(preview);
    media.appendChild(label);
    media.appendChild(uploader);

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.innerHTML = `<img src="${window.STATIC_ICON_PATH}close.png" alt="Delete" style="width:10px;height:10px;vertical-align:middle;">`;
    delBtn.onclick = (e) => {
        e.stopPropagation();
        deleteUploadedFile(ext, name, media);
    };
    media.appendChild(delBtn);

    media.addEventListener('click', () => {
        console.log("[displayInCard] item.url =", url, "item.name =", name);
        playlistManager.addItem(name, url); // Add to playlist
    });

    fileContainer.appendChild(media);
}