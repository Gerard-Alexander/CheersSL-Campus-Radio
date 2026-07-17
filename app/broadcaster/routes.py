from flask import Blueprint, render_template
from blueprints.authentication import login_required

broadcaster_bp = Blueprint(
    'broadcaster', __name__,
    static_folder='static',
    static_url_path='/static',
    template_folder='templates'
)


@broadcaster_bp.route('/')
@login_required
def broadcaster_home():
    return render_template('broadcaster.html')