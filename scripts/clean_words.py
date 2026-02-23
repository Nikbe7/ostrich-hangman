import re

output_file = "backend/data/words.txt"
with open(output_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

valid_pattern = re.compile(r'^[A-ZÅÄÖ]+$')
cleaned_lines = []

for line in lines:
    word = line.strip().upper()
    if valid_pattern.match(word) and len(word) > 1:
        cleaned_lines.append(word)

cleaned_lines = list(dict.fromkeys(cleaned_lines))

with open(output_file, 'w', encoding='utf-8') as f:
    for line in cleaned_lines:
        f.write(line + "\n")
        
print(f"Total cleaned SAOL words: {len(cleaned_lines)}")
