from flask import Blueprint, render_template, redirect, url_for, g, flash
from functools import wraps

ui_bp = Blueprint('ui', __name__)

def login_required(f):
    """Decorator to require login for routes."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not g.is_authenticated:
            flash('Please sign in', 'warning')
            return redirect(url_for('ui.login'))
        return f(*args, **kwargs)
    return wrapper

def admin_required(f):
    """Decorator to require admin role."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not g.is_admin:
            flash('You do not have permission', 'danger')
            return redirect(url_for('ui.status'))
        return f(*args, **kwargs)
    return wrapper

@ui_bp.route('/login')
def login():
    """Login page."""
    if g.is_authenticated:
        return redirect(url_for('ui.status'))
    return render_template('pages/login.html')

@ui_bp.route('/logout')
@login_required
def logout():
    """Logout and redirect to login."""
    from app.services.auth_service import AuthService
    auth_service = AuthService()
    auth_service.logout_user()
    flash('Đã đăng xuất thành công.', 'success')
    return redirect(url_for('ui.login'))

@ui_bp.route('/')
@ui_bp.route('/status')
def status():
    return render_template('pages/status.html')

@ui_bp.route('/dashboard')
@login_required
def dashboard():
    return render_template('pages/dashboard.html')

@ui_bp.route('/data')
@login_required
def data():
    return render_template('pages/data.html')

@ui_bp.route('/recipe')
@login_required
def recipe():
    return render_template('pages/recipe.html')