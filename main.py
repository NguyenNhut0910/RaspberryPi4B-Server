from flask import Flask, session, g
import dotenv
import os
dotenv.load_dotenv()

from app.routes.ui import ui_bp
from app.routes.api import api
from app.services.auth_service import AuthService

app = Flask(__name__)

# Session configuration
app.secret_key = os.getenv('FLASK_SECRET_KEY')
app.config['SESSION_TYPE'] = os.getenv('SESSION_TYPE', 'filesystem')
app.config['SESSION_PERMANENT'] = bool(os.getenv('SESSION_PERMANENT', 'True').lower() in ['true', '1', 't'])
app.config['PERMANENT_SESSION_LIFETIME'] = int(os.getenv('PERMANENT_SESSION_LIFETIME', 86400))  # Default to 24 hours

# Register blueprints
app.register_blueprint(ui_bp)
app.register_blueprint(api)

# Authentication middleware
@app.before_request
def load_current_user():
    """Load current user before each request."""
    auth_service = AuthService()
    g.user = auth_service.get_current_user()
    g.is_authenticated = auth_service.is_authenticated()
    g.is_admin = auth_service.is_admin()

@app.context_processor
def inject_user():
    """Make user info available in all templates."""
    return {
        'current_user': g.user,
        'is_authenticated': g.is_authenticated,
        'is_admin': g.is_admin
    }

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=80)