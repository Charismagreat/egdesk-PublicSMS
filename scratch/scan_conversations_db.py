# -*- coding: utf-8 -*-
import os
import sqlite3

# conversations 디렉토리 경로
conversations_dir = r"C:\Users\CHARISMA\.gemini\antigravity\conversations"

def scan_databases():
    if not os.path.exists(conversations_dir):
        print(f"디렉토리가 존재하지 않습니다: {conversations_dir}")
        return

    print("=== conversations 폴더 내 SQLite DB 스캔 시작 ===")
    files = [f for f in os.listdir(conversations_dir) if f.endswith('.db')]
    
    for file in files:
        full_path = os.path.join(conversations_dir, file)
        size_mb = os.path.getsize(full_path) / (1024 * 1024)
        print(f"\n[파일] {file} (크기: {size_mb:.2f} MB)")
        
        try:
            conn = sqlite3.connect(full_path)
            cursor = conn.cursor()
            
            # 존재하는 테이블 목록 조회
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [r[0] for r in cursor.fetchall()]
            print(f" - 테이블 목록 ({len(tables)}개): {', '.join(tables)}")
            
            # 'tracked_items' 테이블이 존재하는지 확인
            if 'tracked_items' in tables:
                cursor.execute("SELECT COUNT(*) FROM tracked_items")
                count = cursor.fetchone()[0]
                print(f" - ★ tracked_items 데이터 건수: {count}개")
                
                # 데이터가 있다면 내용 출력
                if count > 0:
                    cursor.execute("SELECT * FROM tracked_items")
                    rows = cursor.fetchall()
                    col_names = [description[0] for description in cursor.description]
                    print(" - [데이터 샘플]")
                    for r in rows:
                        row_dict = dict(zip(col_names, r))
                        print(f"   * {row_dict}")
            else:
                print(" - tracked_items 테이블 없음")
                
            conn.close()
        except Exception as e:
            print(f" - 에러 발생: {e}")

if __name__ == "__main__":
    scan_databases()
