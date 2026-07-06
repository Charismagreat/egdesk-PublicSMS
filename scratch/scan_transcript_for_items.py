# -*- coding: utf-8 -*-
import json

# 이전 대화의 transcript.jsonl 파일 경로
log_path = r"C:\Users\CHARISMA\.gemini\antigravity\brain\65db2edf-45de-41ef-ad4b-55c28a7d7105\.system_generated\logs\transcript.jsonl"

def scan_log():
    print("=== transcript.jsonl 정밀 포렌식 스캔 시작 ===")
    found_count = 0
    with open(log_path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            # 'tracked_items' 테이블에 삽입을 시도하거나 품목 코드가 나오는 라인 집중 분석
            if "tracked_items" in line or "RAW-" in line or "COMPETITOR-" in line or "insertRows" in line:
                try:
                    obj = json.loads(line)
                    content = obj.get("content", "")
                    tool_calls = obj.get("tool_calls", [])
                    
                    # 1. tool_calls 내부에 insertRows('tracked_items', ...) 가 있는지 검사
                    tool_calls_str = json.dumps(tool_calls, ensure_ascii=False)
                    if "insertRows" in tool_calls_str and ("tracked_items" in tool_calls_str or "target_urls" in tool_calls_str or "alert_rules" in tool_calls_str):
                        print(f"\n[라인 {line_num}] Tool Call 에서 데이터 삽입 발견!")
                        # JSON 형태의 tool call을 깔끔하게 출력
                        print(json.dumps(tool_calls, ensure_ascii=False, indent=2))
                        found_count += 1
                        
                    # 2. 본문 내용(content)에서 품목 명세가 정의된 코드 블럭 찾기
                    if content and ("RAW-" in content or "COMPETITOR-" in content):
                        # 구리 품목 1개만 나오는 장문의 코드는 스킵하고, 복합 시드나 다른 품목 명세가 씌어있는 짧은 문맥 위주로 포커스
                        if "item_name" in content or "site_name" in content:
                            print(f"\n[라인 {line_num}] Content 에서 품목/URL 정보 정의부 발견!")
                            # 품목 코드 주변 1000자 발췌 출력
                            for code_prefix in ["RAW-", "COMPETITOR-"]:
                                idx = content.find(code_prefix)
                                if idx != -1:
                                    print(f"--- 코드 '{code_prefix}' 주변부 텍스트 ---")
                                    print(content[max(0, idx-150):idx+650])
                                    break
                            found_count += 1
                except Exception as e:
                    # JSON 형식이 아닌 경우 단순 텍스트 패턴 매칭
                    if "insertRows" in line and "tracked_items" in line:
                        print(f"\n[라인 {line_num} - 단순 텍스트] insertRows('tracked_items') 매칭")
                        print(line[:1000])
                        found_count += 1
                        
    print(f"\n=== 정밀 스캔 완료 (총 {found_count}개 일치 항목 발견) ===")

if __name__ == "__main__":
    scan_log()
