from flask import Blueprint, request, jsonify, current_app, url_for, send_file, abort, g
from werkzeug.utils import secure_filename
import json
from pathlib import Path
from datetime import datetime
import mimetypes
from functools import wraps


from app.services.pi_status import PiStatusService
from app.services.auth_service import AuthService
from app.services.supervisor_service import SupervisorService


# Create API blueprint
api = Blueprint('api', __name__, url_prefix='/api')

auth_service = AuthService()
supervisor_service = SupervisorService()

def require_auth(f):
    """Decorator to require authentication for API routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not auth_service.is_authenticated():
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401
        return f(*args, **kwargs)
    return decorated_function

def require_admin(f):
    """Decorator to require admin role for API routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not auth_service.is_admin():
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        return f(*args, **kwargs)
    return decorated_function

# Error handlers
@api.errorhandler(404)
def api_not_found(error):
    return jsonify({
        'success': False,
        'message': 'API endpoint not found',
        'error_code': 'NOT_FOUND'
    }), 404


@api.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        'success': False,
        'message': 'Method not allowed',
        'error_code': 'METHOD_NOT_ALLOWED'
    }), 405


@api.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({
        'success': False,
        'message': 'File too large',
        'error_code': 'FILE_TOO_LARGE'
    }), 413



@api.route('/status', methods=['GET'])
def get_status():
    """Get Raspberry Pi system status information."""
    # Get basic system info (always available)
    status = PiStatusService.get_system_info()
    # docker_info = PiStatusService.get_docker_containers()
    # status['docker_containers'] = docker_info

    # Check authentication
    user = auth_service.get_current_user()

    if user:
        # Authenticated user - include socker and supervisor info
        supervisor_info = supervisor_service.get_supervisor_info()
        docker_info = PiStatusService.get_docker_containers()
        status['docker_containers'] = docker_info
        status['supervisor'] = supervisor_info
        status['authenticated'] = True
        status['user'] = user
    else:
        # Unauthenticated user - limited data
        status['authenticated'] = False
        status['docker'] = {"error": "Authentication required for docker data"}
        status['supervisor'] = {"error": "Authentication required for supervisor data"}

    return jsonify({
        'success': True,
        'data': status
    }), 200


@api.route('/supervisor/process/<process_name>/logs/stdout', methods=['GET'])
@require_auth
def get_supervisor_process_stdout_logs(process_name):
    """Get stdout logs for a supervisor process."""
    offset = request.args.get('offset', 0, type=int)
    length = request.args.get('length', 1024, type=int)
    logs = supervisor_service.get_process_stdout_log(process_name, offset, length)
    return jsonify({
        'success': True,
        'data': logs
    }), 200


@api.route('/supervisor/process/<process_name>/logs/stderr', methods=['GET'])
@require_auth
def get_supervisor_process_stderr_logs(process_name):
    """Get stderr logs for a supervisor process."""
    offset = request.args.get('offset', 0, type=int)
    length = request.args.get('length', 1024, type=int)
    logs = supervisor_service.get_process_stderr_log(process_name, offset, length)
    return jsonify({
        'success': True,
        'data': logs
    }), 200


@api.route('/auth/login', methods=['POST'])
def login():
    """User login endpoint."""
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({
            'success': False,
            'message': 'Username and password required'
        }), 400
    success, result = auth_service.login_user(data['username'], data['password'])

    if success:
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': result
        }), 200
    else:
        return jsonify({
            'success': False,
            'message': result
        }), 401


@api.route('/auth/logout', methods=['POST'])
def logout():
    """User logout endpoint."""
    auth_service.logout_user()
    return jsonify({
        'success': True,
        'message': 'Logout successful'
    }), 200


@api.route('/auth/status', methods=['GET'])
def auth_status():
    """Get current authentication status."""
    user = auth_service.get_current_user()

    if user:
        return jsonify({
            'success': True,
            'authenticated': True,
            'user': user
        }), 200
    else:
        return jsonify({
            'success': True,
            'authenticated': False
        }), 200


@api.route('/auth/register', methods=['POST'])
@require_auth
@require_admin
def register():
    """User registration endpoint (admin only)."""
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({
            'success': False,
            'message': 'Username and password required'
        }), 400
    success, message = auth_service.register_user(
        username=data['username'],
        email=data.get('email'),
        password=data['password'],
        full_name=data.get('full_name'),
        role=data.get('role', 'user')
    )

    if success:
        return jsonify({
            'success': True,
            'message': message
        }), 201
    else:
        return jsonify({
            'success': False,
            'message': message
        }), 400