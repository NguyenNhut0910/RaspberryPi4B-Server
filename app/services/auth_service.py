import bcrypt
import jwt
import os
import sys
from datetime import datetime, timedelta
from flask import session
from .db import PostgresDB

class AuthService:
    """Service class for user authentication and authorization."""

    def __init__(self):
        # JWT secret key - must be set in environment variables for security
        self.jwt_secret = os.getenv('JWT_SECRET')
        if not self.jwt_secret:
            raise RuntimeError('JWT_SECRET environment variable is required for AuthService')
        self.jwt_algorithm = os.getenv('JWT_ALGORITHM', 'HS256')

    def hash_password(self, password):
        """Hash a password using bcrypt."""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def verify_password(self, password, hashed_password):
        """Verify a password against its hash."""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

    def generate_token(self, user_id, username, role, expires_in_hours=24):
        """Generate a JWT token for the user."""
        payload = {
            'user_id': user_id,
            'username': username,
            'role': role,
            'exp': datetime.utcnow() + timedelta(hours=expires_in_hours),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)

    def verify_token(self, token):
        """Verify and decode a JWT token."""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    def authenticate_user(self, username, password):
        """Authenticate a user with username and password."""
        db = PostgresDB()

        try:
            db.connect()
            user = db.execute_query(
                "SELECT id, username, email, password_hash, full_name, role, is_active FROM users WHERE username = %s",
                (username,)
            )

            if not user:
                return None, "User not found"

            user = user[0]

            if not user['is_active']:
                return None, "Account is disabled"

            if not self.verify_password(password, user['password_hash']):
                return None, "Invalid password"

            # Update last login
            db.execute_non_query(
                "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = %s",
                (user['id'],)
            )

            # Return user info without password hash
            user_info = {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'full_name': user['full_name'],
                'role': user['role']
            }

            return user_info, None

        except Exception as e:
            return None, f"Authentication error: {str(e)}"
        finally:
            db.close()

    def register_user(self, username, email, password, full_name=None, role='user'):
        """Register a new user."""
        db = PostgresDB(
            host=os.getenv('DB_HOST'),
            database=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            port=int(os.getenv('DB_PORT', 5432))
        )

        try:
            db.connect()

            # Check if username already exists
            existing = db.execute_query("SELECT id FROM users WHERE username = %s", (username,))
            if existing:
                return False, "Username already exists"

            # Check if email already exists
            if email:
                existing = db.execute_query("SELECT id FROM users WHERE email = %s", (email,))
                if existing:
                    return False, "Email already exists"

            # Hash password
            password_hash = self.hash_password(password)

            # Insert new user
            db.execute_non_query(
                """INSERT INTO users (username, email, password_hash, full_name, role)
                   VALUES (%s, %s, %s, %s, %s)""",
                (username, email, password_hash, full_name, role)
            )

            return True, "User registered successfully"

        except Exception as e:
            return False, f"Registration error: {str(e)}"
        finally:
            db.close()

    def get_current_user(self):
        """Get current user from session token."""
        token = session.get('auth_token')
        if not token:
            return None

        payload = self.verify_token(token)
        if not payload:
            return None

        return {
            'id': payload['user_id'],
            'username': payload['username'],
            'role': payload['role']
        }

    def require_auth(self, roles=None):
        """Decorator to require authentication for routes."""
        def decorator(f):
            def wrapper(*args, **kwargs):
                user = self.get_current_user()
                if not user:
                    return {'error': 'Authentication required'}, 401

                if roles and user['role'] not in roles:
                    return {'error': 'Insufficient permissions'}, 403

                return f(*args, **kwargs)
            return wrapper
        return decorator

    def login_user(self, username, password):
        """Login user and set session."""
        user_info, error = self.authenticate_user(username, password)
        if error:
            return False, error

        # Generate token
        token = self.generate_token(user_info['id'], user_info['username'], user_info['role'])

        # Set session
        session['auth_token'] = token
        session['user'] = user_info

        return True, user_info

    def logout_user(self):
        """Logout user by clearing session."""
        session.pop('auth_token', None)
        session.pop('user', None)
        return True

    def is_authenticated(self):
        """Check if current user is authenticated."""
        return self.get_current_user() is not None

    def is_admin(self):
        """Check if current user is admin."""
        user = self.get_current_user()
        return user and user['role'] == 'admin'