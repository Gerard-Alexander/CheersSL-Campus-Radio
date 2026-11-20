/**
 * Playlist storage: save, load, list, and delete playlists via backend API.
 */

export async function savePlaylist(name, items) {
  try {
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) throw new Error('Playlist name is required.');

    const res = await fetch('/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmedName, items })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save playlist.');
    return { success: true, message: `Playlist "${name}" saved successfully.` };
  } catch (err) {
    return { success: false, message: err.message || 'Error saving playlist.' };
  }
}

export async function createPlaylist(name) {
  try {
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) throw new Error('Playlist name is required.');

    const res = await fetch('/playlists/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmedName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create playlist.');
    return { success: true, message: `Playlist "${trimmedName}" created successfully.` };
  } catch (err) {
    return { success: false, message: err.message || 'Error creating playlist.' };
  }
}

export async function listAllPlaylists() {
  try {
    const res = await fetch('/playlists');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load playlists.');
    return data;
  } catch (err) {
    return [];
  }
}

export async function loadPlaylist(name) {
  try {
    const res = await fetch(`/playlists/${encodeURIComponent(name)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load playlist.');
    return data.items || [];
  } catch (err) {
    return [];
  }
}

export async function deletePlaylist(name) {
  try {
    const res = await fetch(`/playlists/${encodeURIComponent(name)}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete playlist.');
    return { success: true, message: `Playlist "${name}" deleted successfully.` };
  } catch (err) {
    return { success: false, message: err.message || 'Error deleting playlist.' };
  }
}