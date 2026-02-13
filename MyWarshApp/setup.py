import os
import re
import json

SOURCE_FILE = 'warsh-tajweed-full-quran.html'
DATA_DIR = 'data'

def main():
    if not os.path.exists(SOURCE_FILE):
        print(f"Error: Put {SOURCE_FILE} in this folder first.")
        return

    with open(SOURCE_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. EXTRACT DATA
    print("Extracting Quran Data...")
    # Find the JSON object starting with const WARSH_DATA = 
    # We use a simple stack-based parser to find the matching closing brace
    start_marker = "const WARSH_DATA ="
    start_idx = content.find(start_marker)
    
    if start_idx == -1:
        print("Error: Could not find WARSH_DATA")
        return

    obj_start = content.find('{', start_idx)
    
    # Parse object manually to handle JS loose syntax if needed, 
    # but let's try to extract the full block first.
    brace_count = 0
    obj_end = -1
    
    for i in range(obj_start, len(content)):
        char = content[i]
        if char == '{': brace_count += 1
        elif char == '}': brace_count -= 1
        
        if brace_count == 0:
            obj_end = i + 1
            break
            
    if obj_end == -1:
        print("Error: Could not parse WARSH_DATA object")
        return

    json_str = content[obj_start:obj_end]
    
    # Fix JS keys to be valid JSON (quote them) if they aren't
    # This is a basic regex fix, might need adjustment
    # But usually these files have quoted keys.
    try:
        data = json.loads(json_str)
    except:
        print("Warning: Direct JSON parse failed. Trying to fix keys...")
        # Add quotes to keys
        json_str = re.sub(r'(\w+):', r'"\1":', json_str)
        try:
            data = json.loads(json_str)
        except Exception as e:
            print(f"Error: Failed to convert data to JSON: {e}")
            return

    # 2. SAVE SPLIT SURAHS
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

    meta = data.get('meta', {})
    text = data.get('text', {})

    print(f"Found {len(text)} Surahs. Splitting...")

    for surah_id, verses in text.items():
        surah_meta = meta.get(surah_id, {})
        
        # Structure for the individual file
        surah_data = {
            "id": int(surah_id),
            "name_ar": surah_meta.get('name_ar', ''),
            "name_en": surah_meta.get('name_en', ''),
            "verses": verses
        }
        
        with open(f"{DATA_DIR}/{surah_id}.json", 'w', encoding='utf-8') as out:
            json.dump(surah_data, out, ensure_ascii=False, indent=2)

    print("Data split complete.")

    # 3. EXTRACT LOGIC (Tajweed Engine)
    print("Extracting Tajweed Engine...")
    
    # Find the script block containing 'function detect'
    script_pattern = r'<script[^>]*>(.*?function detect.*?)</script>'
    match = re.search(script_pattern, content, re.DOTALL)
    
    if match:
        logic_code = match.group(1)
        # We need to remove the WARSH_DATA part if it was in the same block (unlikely but possible)
        # But usually we just want the helper functions.
        
        with open("engine.js", "w", encoding="utf-8") as out:
            out.write("// Extracted Tajweed Logic\n")
            out.write(logic_code)
        print("Saved engine.js")
    else:
        print("Warning: Could not auto-extract logic. You might need to copy the functions manually.")

if __name__ == "__main__":
    main()

