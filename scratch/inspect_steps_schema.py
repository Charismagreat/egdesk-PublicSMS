# -*- coding: utf-8 -*-
import sqlite3

# 이전 대화의 궤적 SQLite DB 경로
db_path = r"C:\Users\CHARISMA\.gemini\antigravity\conversations\65db2edf-45de-41ef-ad4b-55c28a7d7105.db"

def inspect_schema():
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 첫 번째 스텝 데이터 1건 조회
        cursor.execute("SELECT * FROM steps LIMIT 1")
        row = cursor.fetchone()
        
        if row:
            row_dict = dict(row)
            print("=== steps 테이블 행 키 목록 ===")
            print(list(row_dict.keys()))
            
            # step_payload의 타입 및 크기, 내용 미리보기 출력
            payload = row_dict.get('step_payload')
            if payload:
                print(f"\nstep_payload 타입: {type(payload)}")
                # 만약 bytes/blob 형태라면 문자열로 디코딩 시도
                if isinstance(payload, bytes):
                    try:
                        decoded = payload.decode('utf-8')
                        print(f"디코딩된 크기: {len(decoded)}자")
                        print("=== step_payload 미리보기 (첫 1000자) ===")
                        print(decoded[:1000])
                    except Exception as decode_err:
                        print(f"디코딩 실패: {decode_err}")
                        print(f"바이트 데이터 미리보기: {payload[:500]}")
                else:
                    print(f"크기: {len(payload)}자")
                    print("=== step_payload 미리보기 (첫 1000자) ===")
                    print(payload[:1000])
        conn.close()
    except Exception as e:
        print(f"에러 발생: {e}")

if __name__ == "__main__":
    inspect_schema()
