
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import get_db
from backend.auth import get_current_user
from unittest.mock import MagicMock

# Mock dependencies
mock_db = MagicMock()
mock_user = MagicMock(id=1, email="test@example.com")

def override_get_db():
    yield mock_db

def override_get_current_user():
    return mock_user

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

def test_read_root():
    """Test the root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the AI Health Assistant API"}

def test_get_user_history_empty():
    """Test retrieving history when empty."""
    with MagicMock() as mock_mongo:
        with pytest.MonkeyPatch.context() as mp:
            mp.setattr("backend.mongo_memory.get_full_history_for_dashboard", lambda user_id, limit: [])
            response = client.get("/dashboard/history")
            assert response.status_code == 200
            assert response.json() == []

def test_clear_history():
    """Test clearing chat history."""
    with MagicMock() as mock_mongo:
        with pytest.MonkeyPatch.context() as mp:
            mp.setattr("backend.mongo_memory.clear_user_memory", lambda user_id: None)
            response = client.delete("/dashboard/history")
            assert response.status_code == 200
            assert response.json() == {"message": "Chat history cleared successfully"}
