# -*- coding: utf-8 -*-
import os

# task-1361.log 파일 경로
log_path = r"C:\Users\CHARISMA\.gemini\antigravity\brain\a3dfb182-00c5-4393-aa02-27655ca2b291\.system_generated\tasks\task-1361.log"

def extract_seeding_data():
    if not os.path.exists(log_path):
        print(f"로그 파일이 존재하지 않습니다: {log_path}")
        return
        
    with open(log_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # 'RAW-ALUM-02' 가 포함된 시딩 데이터를 정밀 발췌
    idx = content.find("RAW-ALUM-02")
    if idx != -1:
        print("=== [발견] RAW-ALUM-02 키워드 주변의 원본 시딩 소스 코드 ===")
        # 앞쪽으로 200자, 뒤쪽으로 3500자까지 발췌하여 4대 품목의 정확한 데이터 스펙(URL, CSS Selector, 기준가 등)을 모두 도출합니다.
        print(content[max(0, idx-300):idx+3500])
    else:
        print("RAW-ALUM-02 키워드를 로그 파일에서 찾지 못했습니다.")

if __name__ == "__main__":
    extract_seeding_data()
