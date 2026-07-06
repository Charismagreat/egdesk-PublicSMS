# -*- coding: utf-8 -*-
import sqlite3
import json

# 이전 대화의 SQLite 데이터베이스 파일 경로
db_path = r"C:\Users\CHARISMA\.gemini\antigravity\conversations\65db2edf-45de-41ef-ad4b-55c28a7d7105.db"

def dump_table(table_name):
    try:
        # 데이터베이스 연결
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 테이블의 모든 데이터 조회
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        
        # 딕셔너리 형태로 변환
        data = [dict(row) for row in rows]
        print(f"=== {table_name} (총 {len(data)}개 행) ===")
        
        # 처음 15개 데이터를 JSON 형태로 콘솔 출력
        print(json.dumps(data[:15], ensure_ascii=False, indent=2))
        conn.close()
    except Exception as e:
        print(f"Error dumping {table_name}: {e}")

# 조회할 테이블 목록
tables = ['tracked_items', 'target_urls', 'alert_rules', 'price_histories']
for t in tables:
    dump_table(t)
