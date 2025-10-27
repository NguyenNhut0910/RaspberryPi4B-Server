import psycopg2
from psycopg2 import sql
from psycopg2.extras import RealDictCursor

import dotenv
import os
dotenv.load_dotenv()

class PostgresDB:
    def __init__(self, host="", database="", user="", password="", port=5432):
        if not host and not database and not user and not password:
            host = os.getenv('DB_HOST')
            database = os.getenv('DB_NAME')
            user = os.getenv('DB_USER')
            password = os.getenv('DB_PASSWORD')
            port = int(os.getenv('DB_PORT', 5432))
        self.host = host
        self.database = database
        self.user = user
        self.password = password
        self.port = port
        self.connection = None
        self.cursor = None

    def connect(self):
        """Establish connection to the PostgreSQL database."""
        try:
            self.connection = psycopg2.connect(
                host=self.host,
                database=self.database,
                user=self.user,
                password=self.password,
                port=self.port
            )
            self.cursor = self.connection.cursor(cursor_factory=RealDictCursor)
            print("Connected to PostgreSQL database successfully.")
        except Exception as e:
            print(f"Error connecting to database: {e}")
            raise

    def execute_query(self, query, params=None):
        """Execute a SELECT query and return results."""
        if not self.connection:
            raise Exception("Not connected to database. Call connect() first.")
        try:
            self.cursor.execute(query, params)
            results = self.cursor.fetchall()
            return results
        except Exception as e:
            print(f"Error executing query: {e}")
            raise

    def execute_non_query(self, query, params=None):
        """Execute INSERT, UPDATE, DELETE queries."""
        if not self.connection:
            raise Exception("Not connected to database. Call connect() first.")
        try:
            self.cursor.execute(query, params)
            self.connection.commit()
            print("Query executed successfully.")
        except Exception as e:
            self.connection.rollback()
            print(f"Error executing query: {e}")
            raise

    def close(self):
        """Close the database connection."""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
            print("Database connection closed.")

if __name__ == "__main__":
    db = PostgresDB(host='', database='', user='', password='')
    db.connect()
    try:
        results = db.execute_query("SELECT * FROM raw_log")
        for row in results:
            print(row)
    finally:
        db.close()
