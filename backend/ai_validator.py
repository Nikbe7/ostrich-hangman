import os
import asyncio
from google import genai

# Load Gemini client
api_key = os.environ.get("GEMINI_API_KEY")
client = None

if api_key:
    client = genai.Client(api_key=api_key)
else:
    print("WARNING: GEMINI_API_KEY not found in environment. AI Word Validation will be disabled.")

async def validate_word_with_ai(word: str) -> bool:
    """
    Checks if a given word is a valid Swedish word according to Gemini.
    Returns True if valid, False otherwise.
    """
    if not client:
        return False
        
    prompt = (
        f"Du är en expert på det svenska språket och Svenska Akademiens ordlista (SAOL). "
        f"Är '{word.upper()}' ett riktigt, giltigt svenskt ord (grundform eller vanlig böjning) "
        f"som går att hitta i en svensk ordbok, eller är det slang/påhittat?\n\n"
        f"Svara ENBART med ordet 'JA' eller 'NEJ'. Svara inte med något annat."
    )
    
    try:
        # We use asyncio.to_thread because the genai client's generate_content is synchronous
        response = await asyncio.to_thread(
            client.models.generate_content,
            model='gemini-2.5-flash',
            contents=prompt,
        )
        
        answer = response.text.strip().upper()
        # Clean out any punctuation
        answer = "".join(c for c in answer if c.isalpha())
        
        if answer == "JA":
            return True
        elif answer == "NEJ":
            return False
        else:
            print(f"AI Validator returned unexpected response: '{response.text}' for word '{word}'")
            return False
            
    except Exception as e:
        print(f"AI Validator error: {e}")
        return False
