import { videoPreview } from './broadcaster.js';
import { updateModeButtons, loadPlayList } from './playlist-manager.js';
import { playCurrent } from './playlist-manager.js'; // Ensure it's exported
import { switchToStream, startSessionTimer } from './broadcaster.js';

let currentPlaylistName = null;
let isStreaming = false;
const socket = window.socket || io(); // use global socket if available

document.addEventListener("DOMContentLoaded", function () {
    function createDropdown(button) {
        const dropdown = document.createElement("select");
        dropdown.className = "dropdown-menu";
        dropdown.style.display = "none";
        button.parentNode.insertBefore(dropdown, button.nextSibling);
        return dropdown;
    }

    function attachPlaylistLogic(button) {
        let dropdown = button.nextElementSibling;
        if (!dropdown || !dropdown.classList.contains("dropdown-menu")) {
            dropdown = createDropdown(button);
        }

        // Populate once
        if (dropdown.childElementCount === 0) {
            const now = new Date();
            const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60;

            for (let h = 0; h < 24; h++) {
                for (let m = 0; m < 60; m += 10) {
                    const timeInSeconds = h * 3600 + m * 60;
                    if (timeInSeconds <= currentSeconds) continue;

                    const option = document.createElement("option");
                    const timeLabel = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                    option.value = timeInSeconds;
                    option.textContent = timeLabel;
                    dropdown.appendChild(option);
                }
            }

            if (dropdown.childElementCount === 0) {
                const opt = document.createElement("option");
                opt.disabled = true;
                opt.textContent = "No future time slots available";
                dropdown.appendChild(opt);
            }
        }

        // Toggle dropdown on button click
        button.addEventListener("click", function () {
            dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
        });

        // One-time dropdown change logic
        dropdown.addEventListener("change", async function () {
            console.log("Dropdown changed to: " + dropdown.value);
            const selectedTime = parseInt(dropdown.value, 10);
            console.log("Scheduled time at " + selectedTime + " seconds");

            const statusElement = document.getElementsByClassName("broadcast-status")[0];
            if (statusElement) {
                statusElement.textContent = "Ready to stream at " + selectedTime + " seconds.";
            }

            const now = new Date();
            const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            const delay = (selectedTime - currentSeconds) * 1000;

            if (delay <= 0) {
                console.log("Selected time is in the past or now. Timer not started.");
                return;
            }

            // Load playlist and set the first item as preview
            const playlist = await loadPlayList();
            if (!playlist || playlist.length === 0) {
                console.warn("Playlist is empty or failed to load.");
                return;
            }

            const firstItem = playlist[0];
            console.log('⏯️ First item loaded for preview:', firstItem.name);
            videoPreview.src = firstItem.url;
            videoPreview.load();

            // Show video preview immediately
            const videoDiv = document.getElementById('video-preview-container');
            const cameraDiv = document.getElementById('camera-preview-container');
            if (videoDiv && cameraDiv) {
                cameraDiv.style.display = 'none';
                videoDiv.style.display = 'block';
            }

            console.log(`⏳ Timer started. Will trigger in ${delay / 1000} seconds.`);

            setTimeout(async () => {
                console.log("🎯 Timer is over! Scheduled time reached.");
                try {
                    await videoPreview.play();
                    console.log("📽️ Video playback started.");
                } catch (e) {
                    console.error("Failed to play video:", e);
                }

                const stream = videoPreview.captureStream?.();
                if (stream) {
                    await switchToStream(stream);
                }

                socket.emit('broadcaster');
                if (statusElement) statusElement.textContent = "Broadcasting...";
                startSessionTimer();
                isStreaming = true;
            }, delay);
        });
    }

    Array.from(document.getElementsByClassName("playlist-btn")).forEach((button) => {
        if (!button.dataset.initialized) {
            button.dataset.initialized = true;
            attachPlaylistLogic(button);
        }
    });

    const observer = new MutationObserver(function (mutationsList) {
        mutationsList.forEach((mutation) => {
            if (mutation.type === "childList") {
                mutation.addedNodes.forEach((node) => {
                    if (node.classList && node.classList.contains("playlist-btn")) {
                        if (!node.dataset.initialized) {
                            node.dataset.initialized = true;
                            attachPlaylistLogic(node);
                        }
                    }
                });
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
});
