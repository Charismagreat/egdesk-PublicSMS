# -*- coding: utf-8 -*-
import sqlite3
import json

# 이전 대화의 궤적 SQLite DB 경로
db_path = r"C:\Users\CHARISMA\.gemini\antigravity\conversations\65db2edf-45de-41ef-ad4b-55c28a7d7105.db"

def search_steps():
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # steps 테이블 구조 조회
        cursor.execute("PRAGMA table_info(steps)")
        cols = [r[1] for r in cursor.fetchall()]
        print(f"steps 테이블 컬럼: {cols}")
        
        # 'tracked_items'나 'RAW-'를 포함하는 step 쿼리
        cursor.execute("""
            SELECT step_index, type, content, tool_calls 
            FROM steps 
            WHERE content LIKE '%tracked_items%' 
               OR tool_calls LIKE '%tracked_items%'
               OR content LIKE '%RAW-%'
               OR tool_calls LIKE '%RAW-%'
        """)
        rows = cursor.fetchall()
        print(f"검색된 스텝 수: {len(rows)}개")
        
        for r in rows:
            step_index, step_type, content, tool_calls = r
            
            # tool_calls 내부에 insertRows가 쓰인 기록이 있는지 정밀 스캔
            if tool_calls and "insertRows" in tool_calls and "tracked_items" in tool_calls:
                print(f"\n================ [발견] Step Index: {step_index} ================")
                print(f"타입: {step_type}")
                print(f"도구 호출 기록: {tool_calls}")
                
            # content에 seed 데이터 목록이나 품목 명세가 씌어있는지 스캔
            if content and ("RAW-" in content) and ("tracked_items" in content or "LME" in content or "구리" in content):
                # 구리 외의 다른 품목 코드(예: RAW-나 COMPETITOR-)가 있는지 스캔
                for word in ["RAW-ALUMINUM", "RAW-STEEL", "RAW-NICKEL", "RAW-GOLD", "RAW-LEAD", "RAW-ZINC"]:
                    if word in content:
                        print(f"\n================ [품목명 발견] Step Index: {step_index} ================")
                        print(f"타입: {step_type}")
                        # 주변부 500자 출력
                        idx = content.find(word)
                        print(content[max(0, idx-200):idx+500])
                        break
        
        conn.close()
    except Exception as e:
        print(f"에러 발생: {e}")

if __name__ == "__main__":
    search_steps()
