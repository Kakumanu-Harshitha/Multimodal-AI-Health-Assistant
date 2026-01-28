# AI Health Assistant - System Architecture

## Overview
This document outlines the architectural design of the AI Health Assistant, a "Google-Level" engineering project designed to provide preliminary health insights using multimodal inputs (text, voice, image) and Large Language Models (LLM).

**CRITICAL SAFETY NOTE:** This system is **NOT** a medical diagnosis tool. It is an intelligent health companion that provides information, lifestyle advice, and potential risk factors based on user inputs. All outputs include uncertainty modeling and explicit disclaimers.

---

## 1. System Boundaries & Layered Architecture

The system is refactored into distinct layers to ensure separation of concerns, maintainability, and safety.

### 1.1 Input Layer (Frontend + API)
- **Responsibility:** Captures user intent via Text, Voice (Web Speech API), and Image (Upload).
- **Components:**
  - React Frontend (`InputArea.jsx`, `Chat.jsx`)
  - FastAPI Endpoints (`query_service.py`)
- **Normalization:** Voice is transcribed to text; Images are captioned (using BLIP model or LLM vision) to create a unified text-based context.

### 1.2 Profile Layer
- **Responsibility:** Manages static user data (Age, BMI, Chronic Conditions).
- **Components:**
  - PostgreSQL Database (`Profile` table)
  - `profile_router.py`
- **Data Contract:** Provides `ProfileDict` to the Reasoning Layer.

### 1.3 History Layer
- **Responsibility:** Maintains conversation context and detects long-term patterns.
- **Components:**
  - MongoDB (`Health_Memory` collection)
  - `mongo_memory.py`
- **Advanced Logic:** 
  - Retrieves last N messages.
  - Future state: Summarization and vector search (RAG) for long-term recall.

### 1.4 Reasoning Layer (The Brain)
- **Responsibility:** Synthesizes inputs, profile, and history to generate insights.
- **Components:**
  - `llm_service.py` (Groq/Llama-3 integration)
- **Key Features:**
  - **Context Injection:** Merges Current Symptoms + Profile + History.
  - **Structured Output:** Enforces a strict JSON schema (see Section 2).
  - **Escalation Logic:** Checks history for worsening trends before generating advice.

### 1.5 Safety Layer (Guardrails)
- **Responsibility:** Intercepts inputs and outputs to prevent harm.
- **Components:**
  - `guardrails.py` (Mock/Rule-based)
- **Rules:**
  - Block requests for "prescriptions" or "emergency" handling.
  - Force "EMERGENCY" severity if keywords (e.g., "chest pain", "suicide") are detected.
  - Append mandatory disclaimers to all outputs.

### 1.6 Output Layer
- **Responsibility:** Presents data to the user in a human-readable and explainable format.
- **Components:**
  - React UI (`ReportCard.jsx`)
  - PDF Generator (`report_router.py`)
- **Features:**
  - Visual Severity Badges.
  - "Why this advice?" (XAI Panel).
  - Downloadable PDF reports.

### 1.7 Measurement & Evaluation Layer
- **Responsibility:** Tracks system performance and user satisfaction to enable data-driven improvements.
- **Components:**
  - `feedback_router.py` (API for user ratings)
  - `mongo_memory.py` (Logging to `Health_Feedback` and `Health_Analytics`)
- **Signals:**
  - **User Feedback:** Thumbs Up/Down on reports.
  - **Safety Triggers:** Logs frequency of critical keyword detection.
  - **Escalation Accuracy:** Logs instances where AI sets severity to "HIGH" or "EMERGENCY" for offline review.

---

## 2. AI Confidence & Uncertainty Modeling

To adhere to Responsible AI principles, every response includes metadata about the AI's certainty.

### JSON Schema
```json
{
  "summary": "Brief health summary...",
  "possible_causes": ["Cause A", "Cause B"],
  "risk_assessment": {
    "severity": "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY",
    "confidence_score": 0.0 - 1.0,
    "uncertainty_reason": "Explanation if confidence < 0.8"
  },
  "explanation": {
    "reasoning": "Why the AI concluded this...",
    "history_factor": "Did history influence this?",
    "profile_factor": "Did age/BMI influence this?"
  },
  "recommendations": {
    "immediate_action": "See a doctor...",
    "lifestyle_advice": ["Sleep more", "Drink water"],
    "food_advice": ["Eat leafy greens", "Avoid sugar"]
  },
  "disclaimer": "Standard medical disclaimer..."
}
```

### Low Confidence Handling
- If `confidence_score` < 0.5: The UI displays a warning: "The AI is uncertain. Please provide more details."
- If `severity` == "EMERGENCY": The UI blocks the chat and shows emergency contact numbers.

---

## 3. Explainable AI (XAI)
We treat the LLM as a "Glass Box" where possible. The `explanation` field in the response is exposed to the user via an "Analysis Panel" in the UI. This answers:
1. **Why this severity?** (e.g., "Symptoms have persisted for >3 days")
2. **Why this advice?** (e.g., "Based on your high BMI, we recommend...")

---

## 4. Trade-offs & Engineering Decisions

### 4.1 Why LLM-only (No RAG yet)?
- **Decision:** Use Llama-3 70B with large context window instead of a Vector DB (Pinecone).
- **Reasoning:** For a single-user session history (< 50 messages), the context window is sufficient and lower latency than RAG. RAG introduces retrieval complexity and potential for "lost in the middle" errors for recent context.

### 4.2 Why MongoDB for History?
- **Decision:** Store full conversation trees in NoSQL.
- **Reasoning:** Chat data is unstructured and polymorphic. MongoDB allows flexible schema evolution as we add new metadata (e.g., user feedback ratings) to messages without migrations.

### 4.3 Why React + FastAPI?
- **Decision:** Decoupled Frontend/Backend.
- **Reasoning:** Allows independent scaling. FastAPI provides automatic OpenAPI documentation and high-performance async handling for LLM streams. React allows for a rich, interactive "app-like" experience.

### 4.4 Why Safety Overrides AI?
- **Decision:** Hard-coded keyword detection (Rule-based) runs *before* and *after* the LLM.
- **Reasoning:** LLMs are probabilistic and can be jailbroken. Regular expressions for "suicide" or "heart attack" are deterministic and fail-safe.

---

## 5. Future Roadmap
- **Evaluation Pipeline:** Automated testing using "Golden Datasets" to measure hallucination rates.
- **RAG Integration:** Connect to a curated medical wiki for citation-backed answers.
- **Wearable Integration:** Ingest Apple Health / Google Fit data for real-time vitals.
