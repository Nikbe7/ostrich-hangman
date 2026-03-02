import os
import sys
from typing import List, Dict, Any

# Ensure backend directory is in the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.supabase import supabase

def get_all_users() -> List[Dict[str, Any]]:
    """Fetch all users from the database."""
    try:
        response = supabase.table("app_users").select("id, username, created_at, games").execute()
        return response.data
    except Exception as e:
        print(f"Error fetching users: {e}")
        return []

def delete_user(username: str) -> bool:
    """Delete a specific user by username."""
    try:
        # Get the user id first
        response = supabase.table("app_users").select("id").eq("username", username).execute()
        if not response.data:
            print(f"User '{username}' not found.")
            return False
            
        user_id = response.data[0]["id"]
        
        # Sessions are deleted automatically due to ON DELETE CASCADE
        delete_response = supabase.table("app_users").delete().eq("id", user_id).execute()
        if delete_response.data:
            print(f"Successfully deleted user '{username}'.")
            return True
        return False
    except Exception as e:
        print(f"Error deleting user: {e}")
        return False

def clear_user_games(username: str) -> bool:
    """Clear the games history for a specific user."""
    try:
        response = supabase.table("app_users").select("id").eq("username", username).execute()
        if not response.data:
            print(f"User '{username}' not found.")
            return False
            
        user_id = response.data[0]["id"]
        
        update_response = supabase.table("app_users").update({"games": []}).eq("id", user_id).execute()
        if update_response.data:
            print(f"Successfully cleared games for user '{username}'.")
            return True
        return False
    except Exception as e:
        print(f"Error clearing user games: {e}")
        return False

def reset_all_data() -> bool:
    """Delete ALL users and sessions from the database. DANGEROUS."""
    try:
        users = get_all_users()
        if not users:
            print("Database is already empty.")
            return True
            
        for user in users:
            # Cascading delete handles sessions
            supabase.table("app_users").delete().eq("id", user["id"]).execute()
            
        print(f"Successfully deleted all data ({len(users)} users).")
        return True
    except Exception as e:
        print(f"Error resetting database: {e}")
        return False

def print_menu():
    print("\n--- Ostrich Hangman DB Manager ---")
    print("1. List all users")
    print("2. Delete a user")
    print("3. Reset a user's games")
    print("4. Reset ALL database data")
    print("5. Exit")
    print("----------------------------------\n")

def main():
    while True:
        print_menu()
        choice = input("Select an option (1-5): ").strip()
        
        if choice == '1':
            users = get_all_users()
            if not users:
                print("No users found.")
            else:
                print(f"Found {len(users)} users:")
                for u in users:
                    games_count = len(u.get('games', []))
                    print(f" - {u['username']} (ID: {u['id']}, Games: {games_count})")
                    
        elif choice == '2':
            username = input("Enter username to delete: ").strip()
            confirm = input(f"Are you sure you want to delete '{username}'? (y/n): ").strip().lower()
            if confirm == 'y':
                delete_user(username)
            else:
                print("Operation cancelled.")
                
        elif choice == '3':
            username = input("Enter username to reset games for: ").strip()
            confirm = input(f"Are you sure you want to clear games for '{username}'? (y/n): ").strip().lower()
            if confirm == 'y':
                clear_user_games(username)
            else:
                print("Operation cancelled.")
                
        elif choice == '4':
            print("WARNING: This will delete ALL users and sessions!")
            confirm = input("Type 'DELETE ALL' to confirm: ").strip()
            if confirm == 'DELETE ALL':
                reset_all_data()
            else:
                print("Operation cancelled or confirmation failed.")
                
        elif choice == '5':
            print("Exiting...")
            break
            
        else:
            print("Invalid option. Please choose 1-5.")

if __name__ == "__main__":
    main()
