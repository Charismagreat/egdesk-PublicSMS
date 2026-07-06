# -*- coding: utf-8 -*-
import json

# 이전 대화의 transcript.jsonl 파일 경로
log_path = r"C:\Users\CHARISMA\.gemini\antigravity\brain\65db2edf-45de-41ef-ad4b-55c28a7d7105\.system_generated\logs\transcript.jsonl"
# 포렌식 결과를 저장할 텍스트 파일 경로
output_path = r"c:\dev\egdesk-FreeSMS\scratch\forensic_results.txt"

def scan_log():
    out_lines = []
    out_lines.append("=== transcript.jsonl 정밀 포렌식 결과 (UTF-8) ===\n")
    found_count = 0
    
    with open(log_path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            if "tracked_items" in line or "insertRows" in line:
                try:
                    obj = json.loads(line)
                    content = obj.get("content", "")
                    tool_calls = obj.get("tool_calls", [])
                    
                    tool_calls_str = json.dumps(tool_calls, ensure_ascii=False)
                    # tracked_items 에 insertRows 하는 도구 호출이 발견될 때
                    if "insertRows" in tool_calls_str and "tracked_items" in tool_calls_str:
                        out_lines.append(f"\n[라인 {line_num}] Tool Call 에서 tracked_items insert 발견!")
                        out_lines.append(json.dumps(tool_calls, ensure_ascii=False, indent=2))
                        out_lines.append("\n" + "="*50)
                        found_count += 1
                        
                    # target_urls 에 insertRows 하는 도구 호출도 함께 추적
                    if "insertRows" in tool_calls_str and "target_urls" in tool_calls_str:
                        out_lines.append(f"\n[라인 {line_num}] Tool Call 에서 target_urls insert 발견!")
                        out_lines.append(json.dumps(tool_calls, ensure_ascii=False, indent=2))
                        out_lines.append("\n" + "="*50)
                        found_count += 1
                        
                    # alert_rules 에 insertRows 하는 도구 호출도 추적
                    if "insertRows" in tool_calls_str and "alert_rules" in tool_calls_str:
                        out_lines.append(f"\n[라인 {line_num}] Tool Call 에서 alert_rules insert 발견!")
                        out_lines.append(json.dumps(tool_calls, ensure_ascii=False, indent=2))
                        out_lines.append("\n" + "="*50)
                        found_count += 1
                        
                except Exception as e:
                    # 단순 텍스트 패턴 매칭
                    if "insertRows" in line and "tracked_items" in line:
                        out_lines.append(f"\n[라인 {line_num} - 단순 텍스트 예외] insertRows('tracked_items') 매칭:")
                        out_lines.append(line[:2000])
                        out_lines.append("\n" + "="*50)
                        found_count += 1
                        
    out_lines.append(f"\n=== 정밀 스캔 완료 (총 {found_count}개 일치 항목 발견) ===")
    
    # 결과를 파일로 저장
    with open(output_path, 'w', encoding='utf-8') as out_f:
        out_f.write("\n".join(out_lines))
        
    print(f"포렌식 완료! 결과가 {output_path}에 저장되었습니다. 총 {found_count}건 발견.")

if __name__ == "__main__":
    scan_log()
