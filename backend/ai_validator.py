import os
import asyncio
import time
from typing import Union
from google import genai
import logging

logger = logging.getLogger("ai_validator")

# Load Gemini client
api_key = os.environ.get("GEMINI_API_KEY")
client = None

if api_key:
    client = genai.Client(api_key=api_key)
else:
    logger.warning("GEMINI_API_KEY not found in environment. AI Word Validation will be disabled.")

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
            else:
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
        logger.warning("AI Rate Limit exceeded for word '%s'", word)
        return "RATE_LIMITED"
        
    prompt = (
        f"Du är en extremt strikt domare över det svenska språket, med Svenska Akademiens ordlista (SAOL) som främsta riktmärke. "
        f"Din uppgift är att avgöra om ordet '{word.upper()}' är ett giltigt svenskt ord (grundform eller vanlig böjning). "
        f"VIKTIGT: Ordet måste tillhöra och användas i det svenska språket. "
        f"Etablerade lånord som numera anses vara svenska (t.ex. 'SKATEBOARD', 'HACKER', 'JEANS', 'WEEKEND') ÄR GILTIGA och ska godkännas. "
        f"Däremot ska rent engelska ord som INTE är etablerade i svenskan (t.ex. 'COMPUTER', 'AWESOME', 'BEAUTIFUL') avvisas och få NEJ. "
        f"Slang som bara används i trånga kretsar, påhittade ord och rena egennamn (förnamn, städer, länder) ska också avvisas. "
        f"Svara ENBART med ordet 'JA' eller 'NEJ'. Förklara ingenting, skriv inga andra tecken."
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
            logger.warning("AI Validator returned unexpected response: '%s' for word '%s'", response.text, word)
            return False
            
    except Exception as e:
        error_msg = str(e).upper()
        if "429" in error_msg or "QUOTA" in error_msg or "EXHAUSTED" in error_msg:
            logger.warning("AI Rate Limit (Gemini API 429) hit: %s", e)
            return "RATE_LIMITED"
            
        logger.error("AI Validator error: %s", e)
        return False
