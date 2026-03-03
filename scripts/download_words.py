import urllib.request
import json
import re

# URL to the JSON array which preserves UTF-8 characters correctly
url = "https://raw.githubusercontent.com/nilsj2/swedish-words/master/words.json"
output_file = "backend/data/words.txt"

print(f"Downloading from {url}...")
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    response = urllib.request.urlopen(req)
    data = json.loads(response.read().decode('utf-8'))
    
    print("Successfully downloaded JSON.")
    
    valid_pattern = re.compile(r'^[A-ZÅÄÖ]+$')
    cleaned_lines = []
    
    # If the JSON is a dictionary containing a 'words' list
    word_iterable = data.get('words', []) if isinstance(data, dict) else data
    
    # Replace specific Mojibake sequences that appear in this JSON encoding bug
    for word in word_iterable:
        w = str(word).strip().upper()
        # Some words have weird prefixes, try to extract the actual word
        w = w.split(' ')[-1] if ' ' in w else w
        
        # Remove unicode replacement char interspersed
        w = w.replace('\ufffd', '')
        
        if valid_pattern.match(w) and len(w) > 1:
            cleaned_lines.append(w)
            
    # De-duplicate while preserving order
    cleaned_lines = list(dict.fromkeys(cleaned_lines))
    
    with open(output_file, 'w', encoding='utf-8') as f:
        for line in cleaned_lines:
            f.write(line + "\n")
            
    print(f"Total words: {len(cleaned_lines)}")
    print(f"First 10 words: {list(cleaned_lines[:10])}")
    
except Exception as e:
    print(f"Error downloading: {e}")
