export function generateVideoThumbnail(videoUrl, imgElement) {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    video.addEventListener('loadeddata', () => {
        video.currentTime = Math.min(1, video.duration / 2);
    });

    video.addEventListener('seeked', () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 80;
            canvas.height = 60;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            imgElement.src = canvas.toDataURL('image/jpeg');
        } catch (e) {
            imgElement.src = 'https://via.placeholder.com/40x40?text=VID';
        }
    });

    video.addEventListener('error', () => {
        imgElement.src = 'https://via.placeholder.com/40x40?text=VID';
    });
}