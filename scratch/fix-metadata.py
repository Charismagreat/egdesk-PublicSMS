import sqlite3
import json

def fix_metadata():
    conn = sqlite3.connect('crm_data.db')
    cursor = conn.cursor()
    
    schema_json = json.dumps([
        { "name": "id", "type": "TEXT", "notNull": True },
        { "name": "name", "type": "TEXT", "notNull": True },
        { "name": "price", "type": "TEXT" },
        { "name": "url", "type": "TEXT" },
        { "name": "description", "type": "TEXT" },
        { "name": "main_image_url", "type": "TEXT" },
        { "name": "detail_image_url", "type": "TEXT" },
        { "name": "available_methods", "type": "TEXT" },
        { "name": "category", "type": "TEXT" }
    ])
    
    cursor.execute("UPDATE user_tables SET schema_json = ?, column_count = 9 WHERE table_name = 'products'", (schema_json,))
    conn.commit()
    conn.close()
    
    print("Fixed user_tables metadata for products!")

if __name__ == '__main__':
    fix_metadata()
