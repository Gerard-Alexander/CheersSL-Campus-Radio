import { generateUUID } from '../utils/gen-ID.js';

/**
 * Core playlist data and operations.
 */
export class PlaylistCore {
  constructor() {
    this.items = [];
    this.currentIndex = -1;
    this.currentPlaylistName = null;
  }

  /**
   * Add a media item to the playlist.
   * @param {string} name - The file name.
   * @param {string} url - The file URL.
   * @returns {object} The added item.
   */
  addItem(name, url) {
    const item = {
      id: generateUUID(),
      name,
      url,
      duration: 0 // to be set by duration logic
    };
    this.items.push(item);
    return item;
  }

  /**
   * Remove an item by index.
   * @param {number} index
   */
  removeItemByIndex(index) {
    if (index >= 0 && index < this.items.length) {
      this.items.splice(index, 1);
      if (this.currentIndex >= this.items.length) {
        this.currentIndex = this.items.length - 1;
      }
    }
  }

  /**
   * Remove all items with a matching URL.
   * @param {string} url
   */
  removeItemsByUrl(url) {
    this.items = this.items.filter(item => item.url !== url);
    if (this.currentIndex >= this.items.length) {
      this.currentIndex = this.items.length - 1;
    }
  }

  /**
   * Clear the playlist.
   */
  clear() {
    this.items = [];
    this.currentIndex = -1;
    this.currentPlaylistName = null;
  }

  /**
   * Move an item from oldIndex to newIndex.
   * @param {number} oldIndex
   * @param {number} newIndex
   */
  moveItem(oldIndex, newIndex) {
    if (
      oldIndex < 0 || oldIndex >= this.items.length ||
      newIndex < 0 || newIndex >= this.items.length
    ) return;
    const [moved] = this.items.splice(oldIndex, 1);
    this.items.splice(newIndex, 0, moved);
    if (this.currentIndex === oldIndex) {
      this.currentIndex = newIndex;
    }
  }

  /**
   * Set the current index (e.g., when selecting an item to play).
   * @param {number} index
   */
  setCurrentIndex(index) {
    if (index >= 0 && index < this.items.length) {
      this.currentIndex = index;
    }
  }

  /**
   * Get the current item.
   * @returns {object|null}
   */
  getCurrentItem() {
    if (this.currentIndex >= 0 && this.currentIndex < this.items.length) {
      return this.items[this.currentIndex];
    }
    return null;
  }

  /**
   * Load a playlist (array of items).
   * @param {Array} items
   * @param {string} [name]
   */
  load(items, name = null) {
    this.items = items.map(item => ({
      ...item,
      id: item.id || generateUUID(),
      duration: item.duration || 0
    }));
    this.currentIndex = -1;
    this.currentPlaylistName = name;
  }
}

// Export a singleton instance for convenience
export const playlistCore = new PlaylistCore();