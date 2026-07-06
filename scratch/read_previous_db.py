import sqlite3
import json

db_path = 'C:/Users/CHARISMA/.gemini/antigravity/conversations/65db2edf-45de-41ef-ad4b-55c28a7d7105.db'

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # tracked_items 조회
    cursor.execute("SELECT * FROM tracked_items")
    columns = [col[0] for col in cursor.description]
    tracked_items = [dict(zip(columns, row)) for row in cursor.fetchall()]
    
    # target_urls 조회
    cursor.execute("SELECT * FROM target_urls")
    columns = [col[0] for col in cursor.description]
    target_urls = [dict(zip(columns, row)) for row in cursor.fetchall()]
    
    # alert_rules 조회
    cursor.execute("SELECT * FROM alert_rules")
    columns = [col[0] for col in cursor.description]
    alert_rules = [dict(zip(columns, row)) for row in cursor.fetchall()]

    print("=== TRACKED_ITEMS ===")
    print(json.dumps(tracked_items, ensure_ascii=False, indent=2))
    
    print("\n=== TARGET_URLS ===")
    print(json.dumps(target_urls, ensure_ascii=False, indent=2))
    
    print("\n=== ALERT_RULES ===")
    print(json.dumps(alert_rules, ensure_ascii=False, indent=2))
    
    conn.close()
except Exception as e:
    print("Error:", e)
