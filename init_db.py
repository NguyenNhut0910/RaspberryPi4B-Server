#!/usr/bin/env python3
"""
Database initialization script for user authentication.
Run this script to create the users table and default admin user.
"""

import sys
import os
from dotenv import load_dotenv

from app.services.db import PostgresDB
from app.services.auth_service import AuthService

# Load environment variables
load_dotenv()

def init_database():
    """Initialize the database with user authentication schema."""

    # Database connection
    db = PostgresDB(
        host=os.getenv('DB_HOST'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        port=int(os.getenv('DB_PORT'))
    )

    try:
        db.connect()
        print("Connected to database successfully.")

        # Create users table if not exists
        create_users_table_query = """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(100),
            role VARCHAR(20) NOT NULL DEFAULT 'user',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            last_login TIMESTAMP WITH TIME ZONE
        );
        """
        db.execute_non_query(create_users_table_query)
        print("Users table ensured in database.")

        # create default admin user if credentials provided
        admin_username = os.getenv('DEFAULT_ADMIN_USERNAME')
        admin_email = os.getenv('DEFAULT_ADMIN_EMAIL')
        admin_password = os.getenv('DEFAULT_ADMIN_PASSWORD')

        if admin_username and admin_password:
            auth_service = AuthService()
            success, message = auth_service.register_user(
                username=admin_username,
                email=admin_email,
                password=admin_password,
                role='admin'
            )
            if success:
                print("Default admin user created successfully.")
            else:
                print(f"Admin user creation skipped: {message}")
        else:
            print("No default admin credentials provided. Skipping default admin creation.")

        print("Database initialization completed!")

    except Exception as e:
        print(f"Database initialization failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_database()