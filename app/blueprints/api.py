from flask import Blueprint, jsonify

api_bp = Blueprint("api", __name__, url_prefix="/api")

@api_bp.route("/status")
def status():
    return jsonify({"live": True, "message": "Campus Radio Flask server running."})