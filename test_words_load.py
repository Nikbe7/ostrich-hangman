import os
import sys

# Add backend to path
sys.path.append(os.getcwd())

from backend.services.game_service import _valid_words_list, _valid_words_set

print(f"Words loaded: {len(_valid_words_list)}")
print(f"Is 'HEJ' in list? {'HEJ' in _valid_words_set}")
print(f"Is 'STRUTS' in list? {'STRUTS' in _valid_words_set}")
print(f"First 5 words: {_valid_words_list[:5]}")
