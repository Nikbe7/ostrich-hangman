import os
import asyncio
import time
from typing import Union
from google import genai

# Load Gemini client
api_key = os.environ.get("GEMINI_API_KEY")
client = None

if api_key:
    client = genai.Client(api_key=api_key)
else:
    print("WARNING: GEMINI_API_KEY not found in environment. AI Word Validation will be disabled.")

class AIRateLimiter:
    """
    Simple token-bucket rate limiter for AI requests.
    Default: 10 requests per minute with a burst of 5.
    """
    def __init__(self, requests_per_minute: int = 10, burst: int = 5):
        self.capacity = burst
        self.tokens = float(burst)
        self.refill_rate = requests_per_minute / 60.0  # tokens per second
        self.last_refill = time.time()
        self.lock = asyncio.Lock()

    async def consume(self) -> bool:
        async with self.lock:
            now = time.time()
            elapsed = now - self.last_refill
            self.tokens = min(float(self.capacity), float(self.tokens + elapsed * self.refill_rate))
            self.last_refill = now

            if self.tokens >= 1.0:
                self.tokens -= 1.0
                return True
            return False

# Global instance of the rate limiter
ai_limiter = AIRateLimiter()

async def validate_word_with_ai(word: str) -> Union[bool, str]:
    """
    Checks if a given word is a valid Swedish word according to Gemini.
    Returns True if valid, False if invalid, or "RATE_LIMITED" if quota exceeded.
    """
    if not client:
        return False

    # Check rate limit first
    if not await ai_limiter.consume():
        print(f"AI Rate Limit exceeded for word '{word}'")
        return "RATE_LIMITED"
        
    prompt = (
        f"Du är en expert på det svenska språket och Svenska Akademiens ordlista (SAOL). "
        f"Är '{word.upper()}' ett riktigt, giltigt svenskt ord (grundform eller vanlig böjning) "
        f"utan specialtecken som går att hitta i en svensk ordbok, eller är det slang/påhittat?\n\n"
        f"Svara ENBART med ordet 'JA' eller 'NEJ'. Svara inte med något annat."
    )
    
    try:
        # We use asyncio.to_thread because the genai client's generate_content is synchronous
        response = await asyncio.to_thread(
            client.models.generate_content,
            model='gemini-2.0-flash',
            contents=prompt,
        )
        
        if not response or not response.text:
            return False

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
