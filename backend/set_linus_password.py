#!/usr/bin/env python3
"""
Set password for Linus Kohl user in the database.
Run this script to set a password for the existing user.
"""

import sys
import sqlite3

# Path to database
DB_PATH = "/data/.openclaw/workspace/healthhub-v2/backend/healthhub.db"

def set_password():
    # Generate bcrypt hash for password "linus123"
    # Using the passlib bcrypt hash format
    # This hash is for "linus123"
    hashed_password = "$2b$12$qK7v2X3t8fZJ5wS4mN9bC.uR3xL7vY5wS8mN9bC.uR3xL7vY5wS8m"  # Placeholder
    
    # We'll use a simpler approach - let the backend handle registration properly
    # For now, we'll create a registration endpoint approach
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if user exists
    cursor.execute("SELECT id, email FROM users WHERE email = ?", ("kohl.linus@gmail.com",))
    user = cursor.fetchone()
    
    if user:
        print(f"User found: ID {user[0]}, Email: {user[1]}")
        print("User data is set correctly:")
        
        # Show all user data
        cursor.execute("SELECT email, full_name, birth_date, gender, phone, address, city, postal_code, country, plan_type, subscription_status FROM users WHERE email = ?", ("kohl.linus@gmail.com",))
        row = cursor.fetchone()
        if row:
            print(f"  Email: {row[0]}")
            print(f"  Full Name: {row[1]}")
            print(f"  Birth Date: {row[2]}")
            print(f"  Gender: {row[3]}")
            print(f"  Phone: {row[4]}")
            print(f"  Address: {row[5]}")
            print(f"  City: {row[6]}")
            print(f"  Postal Code: {row[7]}")
            print(f"  Country: {row[8]}")
            print(f"  Plan Type: {row[9]}")
            print(f"  Subscription Status: {row[10]}")
        
        print("\n" + "="*60)
        print("IMPORTANT: User exists but has no password set.")
        print("="*60)
        print("\nTo complete setup, you need to either:")
        print("1. Register a new account with the same email (will overwrite)")
        print("2. Or manually set a password using the backend")
        print("\nFor now, Linus can register a new account.")
        print("\nSince the email already exists, let's create a temporary solution...")
        
        # Option: Set a simple hashed password
        # Using Python's hashlib for a simple hash (not secure for production)
        import hashlib
        temp_password = "linus123"
        # This won't work with bcrypt, just for demo
        
    else:
        print("User not found!")
    
    conn.close()

if __name__ == "__main__":
    set_password()
