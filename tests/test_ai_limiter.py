import pytest
import asyncio
import time
from backend.ai_validator import AIRateLimiter

@pytest.mark.asyncio
async def test_ai_rate_limiter_basic():
    # 60 requests per minute = 1 request per second
    limiter = AIRateLimiter(requests_per_minute=60, burst=2)
    
    # First two should succeed immediately (burst)
    assert await limiter.consume() is True
    assert await limiter.consume() is True
    
    # Third should fail immediately
    assert await limiter.consume() is False
    
    # Wait 1.1 seconds for refill
    await asyncio.sleep(1.1)
    
    # Should now have 1 token
    assert await limiter.consume() is True
    assert await limiter.consume() is False

@pytest.mark.asyncio
async def test_ai_rate_limiter_burst():
    limiter = AIRateLimiter(requests_per_minute=1, burst=5)
    
    for _ in range(5):
        assert await limiter.consume() is True
        
    assert await limiter.consume() is False

@pytest.mark.asyncio
async def test_ai_rate_limiter_refill_cap():
    limiter = AIRateLimiter(requests_per_minute=6000, burst=5)
    
    # Wait a bit
    await asyncio.sleep(0.1)
    
    # Should still only have 5 tokens (burst capacity)
    for _ in range(5):
        assert await limiter.consume() is True
        
    assert await limiter.consume() is False
