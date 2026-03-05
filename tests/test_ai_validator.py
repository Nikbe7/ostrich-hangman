"""
Tests for backend/ai_validator.py
Covers: no client, rate limit exceeded, JA/NEJ/unexpected responses, exception handling.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import backend.ai_validator as ai_mod


@pytest.mark.asyncio
async def test_validate_word_no_client():
    """If no Gemini client is configured, should return False."""
    with patch.object(ai_mod, 'client', None):
        result = await ai_mod.validate_word_with_ai("HUND")
    assert result is False


@pytest.mark.asyncio
async def test_validate_word_rate_limited():
    """Should return 'RATE_LIMITED' when limiter rejects the request."""
    mock_client = MagicMock()
    mock_limiter = MagicMock()
    mock_limiter.consume = AsyncMock(return_value=False)

    with patch.object(ai_mod, 'client', mock_client), \
         patch.object(ai_mod, 'ai_limiter', mock_limiter):
        result = await ai_mod.validate_word_with_ai("HUND")

    assert result == "RATE_LIMITED"


@pytest.mark.asyncio
async def test_validate_word_returns_ja():
    """Should return True when AI responds with JA."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "JA"
    mock_client.models.generate_content = MagicMock(return_value=mock_response)

    mock_limiter = MagicMock()
    mock_limiter.consume = AsyncMock(return_value=True)

    with patch.object(ai_mod, 'client', mock_client), \
         patch.object(ai_mod, 'ai_limiter', mock_limiter), \
         patch('asyncio.to_thread', new=AsyncMock(return_value=mock_response)):
        result = await ai_mod.validate_word_with_ai("HUND")

    assert result is True


@pytest.mark.asyncio
async def test_validate_word_returns_nej():
    """Should return False when AI responds with NEJ."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "NEJ"

    mock_limiter = MagicMock()
    mock_limiter.consume = AsyncMock(return_value=True)

    with patch.object(ai_mod, 'client', mock_client), \
         patch.object(ai_mod, 'ai_limiter', mock_limiter), \
         patch('asyncio.to_thread', new=AsyncMock(return_value=mock_response)):
        result = await ai_mod.validate_word_with_ai("FLURP")

    assert result is False


@pytest.mark.asyncio
async def test_validate_word_unexpected_response():
    """Should return False when AI returns something other than JA or NEJ."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "KANSKE"

    mock_limiter = MagicMock()
    mock_limiter.consume = AsyncMock(return_value=True)

    with patch.object(ai_mod, 'client', mock_client), \
         patch.object(ai_mod, 'ai_limiter', mock_limiter), \
         patch('asyncio.to_thread', new=AsyncMock(return_value=mock_response)):
        result = await ai_mod.validate_word_with_ai("OKLART")

    assert result is False


@pytest.mark.asyncio
async def test_validate_word_empty_response():
    """Should return False when AI returns an empty response."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = None

    mock_limiter = MagicMock()
    mock_limiter.consume = AsyncMock(return_value=True)

    with patch.object(ai_mod, 'client', mock_client), \
         patch.object(ai_mod, 'ai_limiter', mock_limiter), \
         patch('asyncio.to_thread', new=AsyncMock(return_value=mock_response)):
        result = await ai_mod.validate_word_with_ai("TOM")

    assert result is False


@pytest.mark.asyncio
async def test_validate_word_api_quota_exception():
    """Should return 'RATE_LIMITED' when a 429 exception is thrown."""
    mock_client = MagicMock()
    mock_limiter = MagicMock()
    mock_limiter.consume = AsyncMock(return_value=True)

    with patch.object(ai_mod, 'client', mock_client), \
         patch.object(ai_mod, 'ai_limiter', mock_limiter), \
         patch('asyncio.to_thread', new=AsyncMock(side_effect=Exception("Error 429: QUOTA_EXHAUSTED"))):
        result = await ai_mod.validate_word_with_ai("KAT")

    assert result == "RATE_LIMITED"


@pytest.mark.asyncio
async def test_validate_word_general_exception():
    """Should return False for unexpected exceptions."""
    mock_client = MagicMock()
    mock_limiter = MagicMock()
    mock_limiter.consume = AsyncMock(return_value=True)

    with patch.object(ai_mod, 'client', mock_client), \
         patch.object(ai_mod, 'ai_limiter', mock_limiter), \
         patch('asyncio.to_thread', new=AsyncMock(side_effect=Exception("Network error"))):
        result = await ai_mod.validate_word_with_ai("NAGON")

    assert result is False
