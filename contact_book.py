import mysql.connector
import time
import re

# Connect to MySQL (adjust host, user, password, and database name)
conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="1234",
)

cursor = conn.cursor()
cursor.execute("CREATE DATABASE IF NOT EXISTS contact")
conn.commit()

# Now connect to the newly created or existing 'contact' database
conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="1234",
    database="contact",
    charset="utf8"
)
cursor = conn.cursor()

# Create tables only if they don't exist
def create_tables(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS book (
            contact_id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(30) NOT NULL,
            address VARCHAR(100),
            mobile VARCHAR(15),
            email VARCHAR(50) NULL,
            UNIQUE (name, mobile)  -- Allows multiple contacts with the same name but different mobile numbers
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            category_id INT AUTO_INCREMENT PRIMARY KEY,
            category_name VARCHAR(50) UNIQUE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contact_categories (
            contact_id INT,
            category_id INT,
            PRIMARY KEY (contact_id, category_id),
            FOREIGN KEY (contact_id) REFERENCES book(contact_id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE ON UPDATE CASCADE
        )
    """)

# Introduction function
def intro():
    print("*" * 80)
    print("{:^80s}".format("CONTACT BOOK PROJECT"))
    print("{:^80s}".format("MADE BY: Niyati Singhal & Priyansh Tyagi"))
    print("*" * 80)
    print()
    time.sleep(0)

# Email validation
def is_valid_email(email):
    if email == "":
        return True
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w{2,}$'
    return re.match(pattern, email)

# Get the next available contact ID, including reused deleted IDs
def get_next_contact_id(cursor):
    cursor.execute("SELECT contact_id FROM book ORDER BY contact_id")
    used_ids = set(row[0] for row in cursor.fetchall())

    next_id = 1
    while next_id in used_ids:
        next_id += 1

    return next_id

# Create a new contact
def create_record(cursor, conn):
    name = input("Enter name: ")
    address = input("Enter address: ")
    
    while True:
        mobile = input("Enter mobile (10 digits): ")
        if len(mobile) == 10 and mobile.isdigit():
            break
        else:
            print("Invalid mobile number. Please enter a 10-digit number.")
    
    while True:
        email = input("Enter email (optional): ")
        if is_valid_email(email):
            email = email if email else None
            break
        else:
            print("Invalid email address. Please enter a valid email.")
    
    # Get the next available contact_id
    contact_id = get_next_contact_id(cursor)
    
    sql = "INSERT INTO book (contact_id, name, address, mobile, email) VALUES (%s, %s, %s, %s, %s)"
    record = (contact_id, name, address, mobile, email)
    cursor.execute(sql, record)
    conn.commit()
    print(f"Record Entered Successfully with contact ID {contact_id}\n")

# Update a contact
def update_record(cursor, conn, contact_id):
    # Check if any contacts exist
    cursor.execute("SELECT COUNT(*) FROM book")
    count = cursor.fetchone()[0]
    if count == 0:
        print("No contacts in your contact list.")
        return  # Exit if no contacts are available

    # Check if the specific contact ID exists
    cursor.execute("SELECT * FROM book WHERE contact_id = %s", (contact_id,))
    contact = cursor.fetchone()
    if not contact:
        print(f"No contact found with ID {contact_id}.")
        return

    print(f"Updating contact ID: {contact_id}")
    while True:
        print("\nWhich field would you like to update?")
        print("1. Name")
        print("2. Address")
        print("3. Mobile")
        print("4. Email")
        print("5. Done")
        choice = input("Select an option (1-5): ")

        if choice == "1":
            name = input("Enter new name: ")
            cursor.execute("UPDATE book SET name = %s WHERE contact_id = %s", (name, contact_id))
            conn.commit()
            print("Name updated successfully.")
        elif choice == "2":
            address = input("Enter new address: ")
            cursor.execute("UPDATE book SET address = %s WHERE contact_id = %s", (address, contact_id))
            conn.commit()
            print("Address updated successfully.")
        elif choice == "3":
            while True:
                mobile = input("Enter new mobile (10 digits): ")
                if len(mobile) == 10 and mobile.isdigit():
                    cursor.execute("UPDATE book SET mobile = %s WHERE contact_id = %s", (mobile, contact_id))
                    conn.commit()
                    print("Mobile updated successfully.")
                    break
                else:
                    print("Invalid mobile number. Please enter a 10-digit number.")
        elif choice == "4":
            while True:
                email = input("Enter new email (leave blank to clear email): ")
                if is_valid_email(email):
                    email = email if email else None
                    cursor.execute("UPDATE book SET email = %s WHERE contact_id = %s", (email, contact_id))
                    conn.commit()
                    print("Email updated successfully.")
                    break
                else:
                    print("Invalid email address. Please enter a valid email.")
        elif choice == "5":
            print("Done updating contact.")
            break
        else:
            print("Invalid choice. Please select a valid option.")
            
# Search for a contact by name or ID
def search(cursor):
    search_term = input("Enter name or contact ID to search: ")
    sql = "SELECT * FROM book WHERE name = %s OR contact_id = %s"
    cursor.execute(sql, (search_term, search_term))
    record = cursor.fetchone()
    if record:
        print('Contact ID:', record[0])
        print('Name:', record[1])
        print('Address:', record[2])
        print('Mobile:', record[3])
        print('Email:', record[4])
    else:
        print("No such record exists")

# Display all contacts
def display_all(cursor):
    cursor.execute("SELECT * FROM book")
    print('{:<15}{:<20}{:<30}{:<15}{:<30}'.format('CONTACT ID', 'NAME', 'ADDRESS', 'MOBILE NO', 'EMAIL'))
    for record in cursor:
        formatted_record = tuple("" if field is None else field for field in record)
        
        if len(formatted_record) == 5:
            print('{:<15}{:<20}{:<30}{:<15}{:<30}'.format(*formatted_record))
        else:
            print("Unexpected record format:", formatted_record)

# Delete a contact
def delete_record(cursor, conn):
    contact_id = input("Enter contact ID to delete: ")
    cursor.execute("DELETE FROM book WHERE contact_id = %s", (contact_id,))
    conn.commit()
    if cursor.rowcount == 0:
        print("Record not found")
    else:
        print("Record deleted successfully")

# Create a new category
def create_category(cursor, conn):
    category_name = input("Enter category name: ")
    cursor.execute("INSERT INTO categories (category_name) VALUES (%s)", (category_name,))
    conn.commit()
    print(f"Category '{category_name}' added successfully!")

# Associate contact with a category
def associate_contact_with_category(cursor, conn):
    contact_id = input("Enter contact ID: ")
    cursor.execute("SELECT contact_id FROM book WHERE contact_id = %s", (contact_id,))
    contact = cursor.fetchone()
    if not contact:
        print(f"Contact ID '{contact_id}' does not exist.")
        return

    category_name = input("Enter category name: ")
    cursor.execute("SELECT category_id FROM categories WHERE category_name = %s", (category_name,))
    category = cursor.fetchone()
    if not category:
        print(f"Category '{category_name}' does not exist.")
        return

    try:
        cursor.execute("""
            INSERT INTO contact_categories (contact_id, category_id)
            VALUES (%s, %s)
        """, (contact_id, category[0]))
        conn.commit()
        print(f"Contact ID '{contact_id}' associated with category '{category_name}'.")
    except mysql.connector.errors.IntegrityError as e:
        print(f"Error associating contact with category: {e}")

# Display contacts by category
def display_contacts_by_category(cursor):
    category_name = input("Enter category name: ")
    cursor.execute("""
        SELECT b.contact_id, b.name, b.address, b.mobile, b.email
        FROM book b
        JOIN contact_categories cc ON b.contact_id = cc.contact_id
        JOIN categories c ON cc.category_id = c.category_id
        WHERE c.category_name = %s
    """, (category_name,))
    contacts = cursor.fetchall()
    if contacts:
        print(f"Contacts in category '{category_name}':")
        for contact in contacts:
            print(contact)
    else:
        print(f"No contacts found in category '{category_name}'.")

# Manage categories
def manage_categories(cursor, conn):
    while True:
        print("\nManage Categories Options:")
        print("1. Create a new category")
        print("2. Associate a contact with a category")
        print("3. Display contacts by category")
        print("4. Exit to main menu")
        choice = input("Select an option (1-4): ")

        if choice == "1":
            create_category(cursor, conn)
        elif choice == "2":
            associate_contact_with_category(cursor, conn)
        elif choice == "3":
            display_contacts_by_category(cursor)
        elif choice == "4":
            break
        else:
            print("Invalid choice. Please select a valid option.")

# Define the connect_to_db function
def connect_to_db():
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="1234",
            database="contact"
        )
        return conn
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return None


# Main function to run the contact book application
def main():
    conn = connect_to_db()
    cursor = conn.cursor()
    
    create_tables(cursor)
    intro()

    while True:
        print("\nOptions:")
        print("1. Add a new contact")
        print("2. Update a contact")
        print("3. Search for a contact")
        print("4. Display all contacts")
        print("5. Delete a contact")
        print("6. Manage categories")
        print("7. Exit")

        choice = input("Select an option (1-7): ")

        if choice == "1":
            create_record(cursor, conn)
        elif choice == "2":
            contact_id = input("Enter contact ID to update: ")
            update_record(cursor, conn, contact_id)
        elif choice == "3":
            search(cursor)
        elif choice == "4":
            display_all(cursor)
        elif choice == "5":
            delete_record(cursor, conn)
        elif choice == "6":
            manage_categories(cursor, conn)
        elif choice == "7":
            print("Exiting The Contact Book. GOODBYE...")
            break
        else:
            print("Invalid choice. Please select a valid option.")

    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()
