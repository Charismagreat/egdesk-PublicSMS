import os

folder = 'C:/Users/CHARISMA/.gemini/antigravity/conversations/'
print("=== 디렉토리 목록 ===")
try:
    files = os.listdir(folder)
    print("Files found:", files)
except Exception as e:
    print("Error listing directory:", e)
