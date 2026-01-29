
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from backend.llm_service import call_llm_with_fallback, PRIMARY_MODEL, FALLBACK_MODEL
import groq

@pytest.mark.asyncio
async def test_call_llm_with_fallback_primary_success():
    """Test that call_llm_with_fallback returns primary model response on success."""
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content="Primary Success"))]
    
    with patch("backend.llm_service.client.chat.completions.create", new_callable=AsyncMock) as mock_create:
        mock_create.return_value = mock_response
        
        messages = [{"role": "user", "content": "hello"}]
        response = await call_llm_with_fallback(messages)
        
        assert response == "Primary Success"
        mock_create.assert_called_once()
        assert mock_create.call_args[1]['model'] == PRIMARY_MODEL

@pytest.mark.asyncio
async def test_call_llm_with_fallback_rate_limit_retry():
    """Test that call_llm_with_fallback retries with fallback model on RateLimitError."""
    mock_primary_error = groq.RateLimitError("Rate limit", response=MagicMock(), body={})
    mock_fallback_response = MagicMock()
    mock_fallback_response.choices = [MagicMock(message=MagicMock(content="Fallback Success"))]
    
    with patch("backend.llm_service.client.chat.completions.create", new_callable=AsyncMock) as mock_create:
        # First call fails, second succeeds
        mock_create.side_effect = [mock_primary_error, mock_fallback_response]
        
        messages = [{"role": "user", "content": "hello"}]
        response = await call_llm_with_fallback(messages)
        
        assert response == "Fallback Success"
        assert mock_create.call_count == 2
        assert mock_create.call_args_list[0][1]['model'] == PRIMARY_MODEL
        assert mock_create.call_args_list[1][1]['model'] == FALLBACK_MODEL

@pytest.mark.asyncio
async def test_call_llm_with_fallback_both_fail():
    """Test that call_llm_with_fallback raises error if both models fail."""
    mock_error = groq.RateLimitError("Rate limit", response=MagicMock(), body={})
    
    with patch("backend.llm_service.client.chat.completions.create", new_callable=AsyncMock) as mock_create:
        mock_create.side_effect = [mock_error, mock_error]
        
        messages = [{"role": "user", "content": "hello"}]
        with pytest.raises(groq.RateLimitError):
            await call_llm_with_fallback(messages)
        
        assert mock_create.call_count == 2
