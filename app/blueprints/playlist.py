import datetime
from flask import Blueprint, request, jsonify
from db import db
from blueprints.authentication import login_required  # import it

playlist_bp = Blueprint("playlist", __name__)
@playlist_bp.route("/playlists", methods=["GET"])
@login_required
def list_playlists():
    playlists = list(db.playlists.find({}, {"_id": 0}))
    # Sort by last updated time descending
    playlists.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    return jsonify(playlists)

@playlist_bp.route("/playlists/<name>", methods=["GET"])
@login_required
def get_playlist(name):
    playlist = db.playlists.find_one({"name": name})
    if not playlist:
        return jsonify({"error": "Playlist not found"}), 404
    playlist["_id"] = str(playlist["_id"])
    return jsonify(playlist)

@playlist_bp.route("/playlists", methods=["POST"])
@login_required
def save_playlist():
    data = request.get_json()
    name = data.get("name")
    items = data.get("items")

    if not name or not isinstance(items, list):
        return jsonify({"error": "Invalid request"}), 400

    now = datetime.datetime.utcnow()

    # Upsert (insert if not exists, update if exists)
    result = db.playlists.update_one(
        {"name": name},
        {
            "$set": {
                "items": items,
                "updated_at": now
            },
            "$setOnInsert": {"created_at": now}
        },
        upsert=True
    )

    return jsonify({"message": "Playlist saved", "updated": result.modified_count > 0}), 200

@playlist_bp.route('/playlists/remove_file', methods=['POST'])
@login_required
def remove_file_from_all_playlists():
    data = request.json
    file_url = data.get('url')

    if not file_url:
        return jsonify({'error': 'Missing URL'}), 400

    result = db.playlists.update_many(
        {},
        {'$pull': {'items': {'url': file_url}}}
    )

    return jsonify({
        'message': f'Removed from {result.modified_count} playlist(s).'
    })


@playlist_bp.route("/playlists/<name>", methods=["DELETE"])
@login_required
def delete_playlist(name):
    result = db.playlists.delete_one({"name": name})
    if result.deleted_count == 0:
        return jsonify({"error": "Playlist not found"}), 404
    return jsonify({"message": f"Playlist '{name}' deleted"}), 200

@playlist_bp.route("/playlists", methods=["DELETE"])
@login_required
def delete_all_playlists():
    result = db.playlists.delete_many({})
    return jsonify({
        "message": f"Deleted {result.deleted_count} playlists.",
        "status": "ok"
    }), 200
