# backend/llm_service.py
import os
import json
from groq import AsyncGroq
from dotenv import load_dotenv
from typing import Dict, List, Any
from .schemas import RiskAssessment, Explanation, Recommendations, HealthReport
from . import mongo_memory
from .rag_service import rag_service
from .structured_memory import structured_memory
from .rag_router import rag_router, QueryIntent

load_dotenv()

# --- Configuration ---
LLM_MODEL = "llama-3.3-70b-versatile"
client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY")) if os.getenv("GROQ_API_KEY") else None

if client:
    print("✅ Async Groq client for LLM initialized.")
else:
    print("⚠️ WARNING: GROQ_API_KEY not found! LLM service disabled.")

# --- Symptom Fallback Dictionary (CRITICAL SAFETY FEATURE) ---
# This ensures symptom queries NEVER fail, even if RAG is down or data is missing
SYMPTOM_FALLBACKS = {
    "nausea": "Nausea is a feeling of sickness with an urge to vomit. Common causes include food poisoning, motion sickness, pregnancy, medications, viral infections, or digestive issues. Stay hydrated with small sips of water or clear fluids. Avoid strong smells and greasy foods. Rest in a comfortable position. See a doctor if nausea persists beyond 24-48 hours, is accompanied by severe abdominal pain, or if you cannot keep fluids down.",
    
    "headache": "Headaches are pain or discomfort in the head or face area. Common types include tension headaches (from stress or muscle tension), migraines (often with sensitivity to light/sound), and cluster headaches. Causes range from dehydration, stress, lack of sleep, eye strain, to underlying conditions. Rest in a quiet, dark room, stay hydrated, and over-the-counter pain relievers may help. Seek immediate medical attention for sudden severe headaches, headaches after head injury, or headaches with fever, stiff neck, confusion, or vision changes.",
    
    "bloating": "Bloating is a feeling of fullness, tightness, or swelling in the abdomen. Common causes include overeating, eating too quickly, gas buildup, constipation, food intolerances (like lactose or gluten), or swallowing air. Eating slowly, chewing thoroughly, avoiding carbonated drinks, regular exercise, and staying hydrated may help. Consult a doctor if bloating is persistent, severe, accompanied by weight loss, or if you notice changes in bowel habits.",
    
    "stomach pain": "Stomach pain (abdominal pain) can range from mild discomfort to severe cramping. Common causes include indigestion, gas, constipation, food poisoning, stomach flu, menstrual cramps, or stress. The location and type of pain can provide clues. Rest, staying hydrated, and avoiding irritating foods may help. Seek medical attention if pain is severe, persistent, accompanied by fever, vomiting blood, bloody stools, or if you're pregnant.",
    
    "dizziness": "Dizziness is a feeling of lightheadedness, unsteadiness, or a spinning sensation (vertigo). Common causes include dehydration, low blood sugar, sudden position changes (standing up quickly), inner ear problems, medications, or anxiety. Sit or lie down immediately if you feel dizzy. Stay hydrated and avoid sudden movements. See a doctor if dizziness is frequent, severe, accompanied by chest pain, difficulty breathing, fainting, or if it affects your daily activities.",
    
    "fever": "Fever is a temporary increase in body temperature, often due to an infection. Normal body temperature is around 98.6°F (37°C); fever is generally considered 100.4°F (38°C) or higher. Common causes include viral or bacterial infections, heat exhaustion, or inflammatory conditions. Rest, stay hydrated, and over-the-counter fever reducers may help. Seek medical attention for fever above 103°F (39.4°C), fever lasting more than 3 days, fever in infants under 3 months, or if accompanied by severe headache, rash, difficulty breathing, or confusion.",
    
    "fatigue": "Fatigue is persistent tiredness or exhaustion that doesn't improve with rest. Common causes include lack of sleep, stress, poor diet, dehydration, anemia, thyroid problems, depression, or chronic conditions. Ensure adequate sleep (7-9 hours), maintain a balanced diet, exercise regularly, manage stress, and stay hydrated. Consult a doctor if fatigue is severe, persistent for weeks, unexplained, or accompanied by other symptoms like weight changes, pain, or mood changes.",
    
    "cough": "A cough is a reflex that helps clear the airways of mucus, irritants, or foreign particles. Common causes include viral infections (common cold, flu), allergies, asthma, acid reflux, or environmental irritants. Dry coughs produce no mucus; wet coughs produce phlegm. Stay hydrated, use a humidifier, avoid irritants, and throat lozenges may help. See a doctor if cough persists beyond 3 weeks, produces blood, is accompanied by high fever, difficulty breathing, or chest pain.",
    
    "shortness of breath": "Shortness of breath (dyspnea) is difficulty breathing or feeling like you can't get enough air. Common causes include physical exertion, anxiety, asthma, allergies, respiratory infections, or heart conditions. Sit upright, try slow deep breathing, and stay calm. Seek immediate medical attention if shortness of breath is sudden and severe, accompanied by chest pain, bluish lips or face, or if you have a history of heart or lung disease.",
    
    "chest pain": "Chest pain can range from sharp stabbing to dull aching sensations. While many causes are not heart-related (muscle strain, acid reflux, anxiety), chest pain can also indicate serious conditions. Common non-cardiac causes include heartburn, muscle strain, costochondritis, or anxiety. SEEK IMMEDIATE EMERGENCY CARE (call 911) if chest pain is severe, crushing, accompanied by shortness of breath, sweating, nausea, pain radiating to arm/jaw, or if you have risk factors for heart disease.",
    
    "joint pain": "Joint pain (arthralgia) is discomfort, aching, or soreness in any joint. Common causes include arthritis (osteoarthritis, rheumatoid arthritis), injuries, overuse, gout, or infections. Rest the affected joint, apply ice for acute pain or heat for chronic stiffness, gentle stretching, and over-the-counter pain relievers may help. See a doctor if joint pain is severe, accompanied by swelling, redness, warmth, fever, or if it limits your daily activities.",
    
    "muscle ache": "Muscle aches (myalgia) are soreness or pain in muscles. Common causes include overexertion, tension, stress, minor injuries, viral infections (flu), or dehydration. Rest, gentle stretching, massage, warm baths, and staying hydrated may help. Over-the-counter pain relievers can provide relief. Consult a doctor if muscle pain is severe, persistent, not related to activity, accompanied by fever, rash, or if you have difficulty breathing or swallowing.",
    
    "diarrhea": "Diarrhea is loose, watery stools occurring more frequently than normal. Common causes include viral or bacterial infections, food poisoning, food intolerances, medications, or stress. Stay hydrated with water, clear broths, or oral rehydration solutions. Avoid dairy, fatty, or spicy foods temporarily. See a doctor if diarrhea persists beyond 2 days, is accompanied by high fever, severe abdominal pain, blood in stools, signs of dehydration, or if you have recently traveled.",
    
    "constipation": "Constipation is infrequent bowel movements or difficulty passing stools. Common causes include low fiber diet, inadequate water intake, lack of physical activity, medications, or ignoring the urge to go. Increase fiber intake (fruits, vegetables, whole grains), drink plenty of water, exercise regularly, and establish a regular bathroom routine. Consult a doctor if constipation is severe, persistent, accompanied by blood in stools, severe abdominal pain, or unexplained weight loss.",
    
    "insomnia": "Insomnia is difficulty falling asleep, staying asleep, or waking too early. Common causes include stress, anxiety, poor sleep habits, caffeine or alcohol, medications, or underlying health conditions. Maintain a regular sleep schedule, create a relaxing bedtime routine, avoid screens before bed, keep the bedroom dark and cool, and limit caffeine. See a doctor if insomnia persists for weeks, affects your daily functioning, or if you suspect an underlying medical condition.",
    
    "rash": "A rash is a change in skin color, texture, or appearance, often with redness, bumps, or itching. Common causes include allergic reactions, eczema, contact dermatitis, viral infections, heat rash, or insect bites. Keep the area clean and dry, avoid scratching, use gentle moisturizers, and over-the-counter anti-itch creams may help. Seek medical attention if rash is widespread, accompanied by fever, difficulty breathing, swelling of face/throat, or if it doesn't improve within a few days.",
    
    "back pain": "Back pain can affect the lower, middle, or upper back. Common causes include muscle strain, poor posture, lifting heavy objects incorrectly, herniated discs, or arthritis. Rest, gentle stretching, applying heat or ice, maintaining good posture, and over-the-counter pain relievers may help. See a doctor if pain is severe, radiates down the legs, accompanied by numbness or weakness, follows an injury, or persists beyond a few weeks.",
    
    "sore throat": "A sore throat is pain, scratchiness, or irritation of the throat. Common causes include viral infections (common cold, flu), bacterial infections (strep throat), allergies, dry air, or irritants. Gargle with warm salt water, stay hydrated, use throat lozenges, and rest your voice. See a doctor if sore throat is severe, lasts more than a week, accompanied by high fever, difficulty swallowing or breathing, or if you notice white patches in the throat.",
    
    "runny nose": "A runny nose (rhinorrhea) is excess drainage from the nasal passages. Common causes include common cold, allergies, sinus infections, cold weather, or irritants. Stay hydrated, use a humidifier, saline nasal sprays, and rest. Over-the-counter decongestants may provide relief. Consult a doctor if symptoms persist beyond 10 days, accompanied by high fever, severe headache, facial pain, or if nasal discharge is thick and colored.",
    
    "vomiting": "Vomiting is forcefully expelling stomach contents through the mouth. Common causes include viral gastroenteritis (stomach flu), food poisoning, motion sickness, pregnancy, medications, or migraines. Avoid solid foods initially, sip clear fluids slowly, rest, and gradually reintroduce bland foods. Seek medical attention if vomiting persists beyond 24 hours, you cannot keep fluids down, there's blood in vomit, severe abdominal pain, or signs of dehydration.",
    
    "sweating": "Excessive sweating (hyperhidrosis) is sweating more than necessary for temperature regulation. Common causes include physical activity, hot weather, anxiety, fever, menopause, medications, or hyperthyroidism. Stay cool, wear breathable fabrics, stay hydrated, and use antiperspirants. See a doctor if sweating is excessive, unexplained, occurs at night, accompanied by weight loss, fever, or if it interferes with daily activities.",
    
    "chills": "Chills are feeling cold with shivering, often occurring with fever. Common causes include infections (viral or bacterial), exposure to cold, low blood sugar, or hypothyroidism. Dress warmly, stay hydrated, and rest. Monitor body temperature. Seek medical attention if chills are accompanied by high fever, severe symptoms, confusion, difficulty breathing, or if you have a weakened immune system.",
    
    "swelling": "Swelling (edema) is enlargement of body parts due to fluid buildup. Common causes include injury, inflammation, prolonged sitting/standing, pregnancy, medications, or underlying conditions (heart, kidney, liver problems). Elevate the affected area, reduce salt intake, stay active, and wear compression garments if recommended. See a doctor if swelling is sudden, severe, one-sided, accompanied by pain, redness, warmth, shortness of breath, or if you have a history of heart or kidney disease.",
    
    "itching": "Itching (pruritus) is an irritating sensation that makes you want to scratch. Common causes include dry skin, allergic reactions, insect bites, eczema, psoriasis, or infections. Keep skin moisturized, avoid hot showers, use gentle soaps, wear soft fabrics, and over-the-counter anti-itch creams may help. Consult a doctor if itching is severe, widespread, persistent, accompanied by rash, fever, or if it affects your sleep.",
    
    "numbness": "Numbness is loss of sensation or tingling feeling. Common causes include pressure on nerves (sitting in one position), poor circulation, nerve damage, vitamin deficiencies, or anxiety. Change position, move around, and gentle massage may help. Seek immediate medical attention if numbness is sudden, affects one side of the body, accompanied by weakness, difficulty speaking, vision changes, or severe headache (possible stroke).",
    
    "weakness": "Weakness is lack of physical strength or energy. Common causes include fatigue, lack of sleep, dehydration, poor nutrition, anemia, infections, or chronic conditions. Ensure adequate rest, balanced diet, hydration, and regular exercise. See a doctor if weakness is sudden, severe, progressive, affects one side of the body, accompanied by other symptoms, or if it significantly impacts daily activities.",
    
    "loss of appetite": "Loss of appetite is reduced desire to eat. Common causes include stress, anxiety, depression, infections, medications, digestive issues, or chronic illnesses. Eat small frequent meals, choose nutrient-dense foods, stay hydrated, and address underlying stress. Consult a doctor if loss of appetite persists, accompanied by weight loss, nausea, abdominal pain, or if you have difficulty swallowing.",
    
    "weight loss": "Unintentional weight loss is losing weight without trying. Common causes include stress, increased physical activity, hyperthyroidism, diabetes, digestive disorders, or chronic illnesses. Track your eating and activity patterns. See a doctor if you lose more than 5% of body weight in 6-12 months without trying, especially if accompanied by fatigue, changes in appetite, or other symptoms.",
    
    "anxiety": "Anxiety is feelings of worry, nervousness, or unease. Common causes include stress, major life changes, trauma, caffeine, or underlying anxiety disorders. Practice relaxation techniques (deep breathing, meditation), regular exercise, adequate sleep, limit caffeine, and talk to someone you trust. Seek professional help if anxiety is severe, persistent, interferes with daily life, or if you experience panic attacks.",
    
    "confusion": "Confusion is difficulty thinking clearly, concentrating, or making decisions. Common causes include dehydration, low blood sugar, medications, infections, sleep deprivation, or serious conditions. Ensure hydration, check blood sugar if diabetic, and rest. SEEK IMMEDIATE MEDICAL ATTENTION if confusion is sudden, severe, accompanied by fever, headache, stiff neck, difficulty breathing, chest pain, or if the person is elderly or has chronic conditions."
}

def get_symptom_fallback(query: str) -> str:
    """
    Returns a safe, general symptom explanation if the query matches a known symptom.
    This is a CRITICAL SAFETY FEATURE to prevent "No information available" failures.
    
    Args:
        query: User's query text
        
    Returns:
        Fallback explanation if symptom detected, None otherwise
    """
    query_lower = query.lower()
    
    # Check for exact or partial matches
    for symptom, explanation in SYMPTOM_FALLBACKS.items():
        if symptom in query_lower:
            return explanation
    
    return None

# --- Helper Functions ---
def calculate_bmi(weight, height):
    if weight and height:
        try:
            bmi = weight / ((height / 100) ** 2)
            if bmi < 18.5: return f"{bmi:.1f} (Underweight)"
            if bmi < 25: return f"{bmi:.1f} (Normal)"
            if bmi < 30: return f"{bmi:.1f} (Overweight)"
            return f"{bmi:.1f} (Obese)"
        except:
            return "Unknown"
    return "Unknown"

# --- Safety Layer (Guardrails) ---
class Guardrails:
    CRITICAL_KEYWORDS = ["suicide", "kill myself", "chest pain", "heart attack", "stroke", "difficulty breathing", "unconscious"]
    
    @staticmethod
    def check_safety(text: str) -> Dict[str, Any]:
        """
        Deterministic safety check.
        Returns None if safe, or a predefined Error Response if unsafe.
        """
        text_lower = text.lower()
        
        # 1. Emergency Detection
        for keyword in Guardrails.CRITICAL_KEYWORDS:
            if keyword in text_lower:
                return {
                    "is_safe": False,
                    "response": {
                        "summary": "🚨 CRITICAL SAFETY ALERT",
                        "possible_causes": ["Potential Medical Emergency"],
                        "risk_assessment": {
                            "severity": "EMERGENCY",
                            "confidence_score": 1.0,
                            "uncertainty_reason": "Keyword detected: " + keyword
                        },
                        "explanation": {
                            "reasoning": f"You mentioned '{keyword}', which requires immediate medical attention.",
                            "history_factor": "Safety Override Triggered",
                            "profile_factor": "N/A"
                        },
                        "recommendations": {
                            "immediate_action": "CALL EMERGENCY SERVICES (911) IMMEDIATELY.",
                            "lifestyle_advice": ["Do not wait.", "Seek professional help now."],
                            "food_advice": []
                        },
                        "disclaimer": "This system cannot handle emergencies. Please contact local authorities."
                    }
                }
        return {"is_safe": True}

guardrails = Guardrails()

# --- History Layer (Analysis) ---
def analyze_history_trends(history: List[Dict], current_symptoms: str) -> str:
    """
    Analyzes past messages to detect patterns like worsening symptoms or repetition.
    """
    if not history:
        return "No previous history."
    
    recent_symptoms = [msg['content'] for msg in history if msg['role'] == 'user'][-3:]
    if not recent_symptoms:
        return "No recent user symptoms found in history."

    # Simple heuristic: Check if last 3 messages contain similar keywords to current
    current_words = set(current_symptoms.lower().split())
    repeated_count = 0
    
    for prev in recent_symptoms:
        prev_words = set(prev.lower().split())
        # Check for meaningful overlap (ignoring common stop words would be better, but this is a start)
        overlap = current_words.intersection(prev_words)
        if len(overlap) >= 2: # At least 2 matching words
            repeated_count += 1
            
    if repeated_count > 0:
        return f"⚠️ RECURRING ISSUE: User has reported similar symptoms in {repeated_count} of the last 3 interactions. Evaluate for worsening condition."
    
    return "New symptom presentation."

# --- 7-Core Assessment Pipeline Prompts ---

PROMPT_CONTROLLER = """
You are a medical assessment controller with STRICT follow-up rules.

Your task is to:
1. Determine whether the user query is informational (e.g., "What is Wilson disease?") or symptom-based (e.g., "I have a headache").
2. Decide whether clarification is TRULY NECESSARY to provide a safe assessment.

🚨 CRITICAL RULES - FOLLOW-UP QUESTIONS:

1. NEVER ask follow-up questions for:
   - COMMON SYMPTOMS: nausea, vomiting, headache, fever, cough, cold, bloating, stomach pain, abdominal pain, diarrhea, constipation, dizziness, fatigue, weakness, chest discomfort, sore throat, runny nose, shortness of breath, body pain, back pain, loss of appetite
   
   - DISEASE SYMPTOM QUERIES: Any query asking about "symptoms of [disease]" or "symptoms for [disease]" (e.g., "symptoms of cancer", "symptoms for diabetes", "what are the symptoms of heart disease")

2. For common symptoms OR disease symptom queries: Set "needs_clarification" to FALSE.

3. You may ONLY ask clarification for:
   - Vague or ambiguous personal symptoms (e.g., "I don't feel well", "something is wrong")
   - Rare or complex symptom combinations experienced by the user
   - Potential emergency situations requiring immediate context

4. If you do ask clarification:
   - Ask AT MOST 2 short yes/no questions
   - Questions must be essential for safety, not just helpful

5. Default behavior: Provide the best possible answer with available information.

OUTPUT FORMAT (JSON):
{
  "is_informational": boolean,
  "needs_clarification": boolean,
  "questions": ["Question 1", "Question 2"] (only if needs_clarification is true),
  "detected_intent": "informational" | "symptom_based"
}

REMEMBER: 
- For common symptoms: needs_clarification = FALSE
- For "symptoms of [disease]" queries: needs_clarification = FALSE
"""

PROMPT_MEMORY_SELECTOR = """
You are responsible for selecting relevant user history.
Use past user data ONLY IF:
1. The current topic matches previous topics.
2. The user explicitly confirmed relevance (User Confirmation: "yes").

If the user selected "No" or "Skip", do not include past data.

Current User Input: {user_input}
User Confirmation: {user_confirmation}
Past Data: {past_data}

Output either:
"Relevant memory included: [Summary of relevant past data]"
OR "No relevant memory used"
"""

PROMPT_MEDICAL_RAG = """
You are a Medical Information Assistant operating in a Retrieval-Augmented Generation (RAG) system. 
Your task is to generate clear, human-readable, medically safe responses using retrieved content OR fallback symptom knowledge.

🔒 CRITICAL OUTPUT RULES (MANDATORY) 
- Output ONLY clean, readable English text.
- Do NOT output: random symbols, mixed languages, encoding artifacts, LaTeX fragments, or internal tokens (vectors, IDs).
- If retrieved content is corrupted or irrelevant, use the fallback data provided.

📚 CONTEXT USAGE RULES 
- Use the provided retrieved medical documents OR fallback symptom data.
- If you see "[FALLBACK SYMPTOM DATA]" in the retrieved content, USE IT - it is trusted medical information.
- Never say "I don't have enough information" for common symptoms.
- If no reliable content is available for rare queries, say: "I don't have enough reliable information to answer this clearly." 

🧠 USER MEMORY RULES 
- Use previous user information ONLY IF confirmed as relevant (Confirmed Context provided below).
- If no confirmed context is provided, ignore all previous data.

🩺 MEDICAL SAFETY RULES 
- Do NOT diagnose or prescribe.
- Use cautious language: "may be associated with", "can vary between individuals".
- Always clarify uncertainty.

🚨 SYMPTOM RESPONSE RULES (CRITICAL)
For symptom queries, you MUST provide:
1. Clear explanation of what the symptom generally means
2. Common, non-diagnostic causes
3. General self-care or lifestyle advice
4. Warning signs when medical attention is recommended

NEVER respond with:
- "No information available"
- "No reliable data found"
- "I don't know" (for common symptoms)

🚫 LOOP PREVENTION RULES
- DO NOT ask follow-up questions in your response
- DO NOT request more information
- Provide the best possible answer with available data
- Your response must CONVERGE to an answer, not loop

🧾 RESPONSE STRUCTURE (STRICT) 
You MUST output a JSON object with this structure:
{{
  "type": "health_report",
  "health_information": "Clear explanation in simple language",
  "possible_conditions": ["High-level possibility 1", "High-level possibility 2"],
  "reasoning_brief": "Briefly explain why this information is provided",
  "recommended_next_steps": "When to seek professional help",
  "ai_confidence": "Low/Medium/High with brief reason",
  "trusted_sources": ["Source 1", "Source 2"],
  "disclaimer": "This is for informational purposes and not a diagnosis. Consult a professional."
}}

CURRENT USER QUERY:
{user_query}

CONFIRMED USER CONTEXT:
{user_context}

RETRIEVED MEDICAL KNOWLEDGE:
{rag_data}
"""

PROMPT_FEEDBACK_REFINER = """
The user has indicated whether the response was helpful. 
Feedback: {feedback_rating}
Comment: {feedback_comment}

If feedback is "negative":
1. Identify which part was unclear or insufficient based on the previous response and user comment.
2. Suggest what additional clarification or data is needed.
3. Adjust strategy for future queries.

Do not change medical facts. Improve clarity and questioning.
"""

# --- Reasoning Layer (LLM) ---
async def run_clinical_analysis(profile: Dict, history: List[Dict], inputs: Dict) -> str:
    """
    Main orchestration function for the 'Google-Level' 8-stage pipeline.
    """
    if not client:
        return json.dumps({"summary": "Service Unavailable", "disclaimer": "Check API Keys"})

    # --- STEP 1: Input Harmonization (Multimodal) ---
    user_text = inputs.get("text_query", "")
    voice_text = inputs.get("transcribed_text", "")
    image_desc = inputs.get("image_caption", "")
    report_text = inputs.get("report_text", "")
    user_confirmation = inputs.get("user_confirmation", "skip").lower() # yes, no, skip
    
    combined_input = f"{user_text} {voice_text} {image_desc} {report_text}".strip()
    if not combined_input:
        return json.dumps({"summary": "No input provided.", "disclaimer": "Please provide symptoms."})

    # --- STEP 2: Deterministic Guardrails (Safety) ---
    safety_result = guardrails.check_safety(combined_input)
    if not safety_result["is_safe"]:
        return json.dumps(safety_result["response"])

    # --- STEP 2.5: SYMPTOM SHORTCUT CHECK (OPTIMIZATION) ---
    # Check if this is a common symptom query - if yes, skip LLM intent detection and go straight to fallback
    # This improves response time and reduces API costs for common queries
    query_lower = combined_input.lower()
    
    # Check for direct symptom mentions
    symptom_shortcut = get_symptom_fallback(combined_input)
    
    # Also check for "symptoms of/for [disease]" pattern - these should NOT use shortcut
    is_disease_symptom_query = any(pattern in query_lower for pattern in [
        "symptoms of", "symptoms for", "what are the symptoms", 
        "signs of", "signs and symptoms"
    ])
    
    # CONVERSATION MEMORY: Check if we already discussed this symptom recently
    already_discussed = False
    if history and len(history) > 0 and symptom_shortcut:
        # Check last 5 interactions for the same symptom
        # MongoDB history structure: [{"role": "user", "content": "I have nausea"}, {"role": "assistant", "content": "..."}]
        for past_interaction in history[-5:]:
            # Only check user messages, not assistant responses
            if past_interaction.get("role") != "user":
                continue
                
            past_query = past_interaction.get("content", "").lower()
            
            # Check if any symptom from our fallback dict was mentioned
            for symptom_name in SYMPTOM_FALLBACKS.keys():
                if symptom_name in query_lower and symptom_name in past_query:
                    already_discussed = True
                    print(f"💬 CONVERSATION MEMORY: Already discussed '{symptom_name}' recently")
                    print(f"   Previous query: {past_query[:50]}...")
                    break
            if already_discussed:
                break
    
    # If it's a common symptom (not asking about disease symptoms) and we have fallback data, use shortcut
    if symptom_shortcut and not is_disease_symptom_query and user_confirmation != "yes":
        print(f"⚡ SYMPTOM SHORTCUT: Bypassing LLM for common symptom: {combined_input[:50]}...")
        
        # If already discussed, provide follow-up response
        if already_discussed:
            return json.dumps({
                "type": "health_report",
                "health_information": f"I see you're still experiencing this symptom. {symptom_shortcut}\n\nSince this is continuing, I recommend:\n1. Keep track of when it occurs and any triggers\n2. Note if it's getting better, worse, or staying the same\n3. Consider consulting a healthcare professional if it persists or worsens",
                "possible_conditions": ["Ongoing symptom - monitoring recommended"],
                "reasoning_brief": "Following up on previously discussed symptom with additional guidance.",
                "recommended_next_steps": "If symptoms persist or worsen, please consult a healthcare professional for personalized evaluation.",
                "ai_confidence": "High - Follow-up Guidance",
                "trusted_sources": ["Medical Knowledge Base", "MedlinePlus (NIH)"],
                "disclaimer": "This is for informational purposes and not a diagnosis. Consult a professional."
            })
        
        # First time discussing this symptom
        return json.dumps({
            "type": "health_report",
            "health_information": symptom_shortcut,
            "possible_conditions": ["Various causes possible - not a diagnosis"],
            "reasoning_brief": "Providing general information about this common symptom.",
            "recommended_next_steps": "Monitor your symptoms. Consult a healthcare professional if symptoms persist, worsen, or are accompanied by other concerning signs.",
            "ai_confidence": "High - General Symptom Information",
            "trusted_sources": ["Medical Knowledge Base", "MedlinePlus (NIH)"],
            "disclaimer": "This is for informational purposes and not a diagnosis. Consult a professional."
        })

    # --- STEP 3: Intent Detection (RAG Router) ---
    # Use RAG router for deterministic, enterprise-grade intent detection
    intent_enum = rag_router.detect_intent(combined_input, history)
    detected_intent = intent_enum.name.lower().replace('_query', '_based')  # Convert to old format for compatibility
    print(f"🎯 RAG Router detected intent: {intent_enum.name} -> {detected_intent}")
    
    # Also run LLM controller for clarification decision (but use router intent)
    controller_response = await client.chat.completions.create(
        messages=[
            {"role": "system", "content": PROMPT_CONTROLLER},
            {"role": "user", "content": f"User Input: {combined_input}"}
        ],
        model=LLM_MODEL,
        response_format={"type": "json_object"}
    )
    ctrl_content = controller_response.choices[0].message.content
    try:
        ctrl = json.loads(ctrl_content)
        # Override LLM intent with router intent (router is more reliable)
        ctrl["detected_intent"] = detected_intent
        print(f"🎯 Final intent: {detected_intent}")
        
        # --- STEP 4: Clarification Loop (Follow-up) with CONVERSATION STATE CHECK ---
        # Only ask clarification if:
        # 1. This is the FIRST interaction (user_confirmation == "skip")
        # 2. We haven't already asked clarification for this query in conversation history
        
        if user_confirmation == "skip":
            # Use RAG router's anti-loop logic for follow-up decision
            should_ask = rag_router.should_ask_follow_up(combined_input, intent_enum, history)
            
            # If router says ask AND controller agrees, then ask
            if should_ask and ctrl.get("needs_clarification") and detected_intent == "symptom_based":
                return json.dumps({
                    "type": "clarification_questions",
                    "context": "To provide a more accurate assessment, I have a few follow-up questions:",
                    "questions": ctrl.get("questions", ["Have you experienced this before?"]),
                    "requires_confirmation": True # Trigger Yes/No/Skip UI in frontend
                })
    except json.JSONDecodeError:
        print(f"⚠️ Controller JSON Error: {ctrl_content}")

    # --- STEP 5: Contextual Memory Selection (Memory Selector) ---
    user_id = str(profile.get("user_id", "unknown"))
    confirmed_context = "None (user denied prior occurrence or no confirmation provided)"
    
    if user_confirmation == "yes":
        relevant_memory_chunks = structured_memory.get_relevant_history(user_id, combined_input)
        raw_memory = structured_memory.summarize_memory(relevant_memory_chunks)
        
        if raw_memory and raw_memory != "No relevant past context found.":
            memory_selector_resp = await client.chat.completions.create(
                messages=[
                    {"role": "system", "content": PROMPT_MEMORY_SELECTOR.format(
                        user_input=combined_input,
                        user_confirmation=user_confirmation,
                        past_data=raw_memory
                    )}
                ],
                model=LLM_MODEL
            )
            confirmed_context = memory_selector_resp.choices[0].message.content

    # --- STEP 6: Evidence Retrieval (RAG Router) ---
    rag_data = "No verified medical information found for this specific query."
    if rag_service.enabled:
        # Use RAG router for query augmentation and dataset routing
        search_query = rag_router.augment_query(combined_input, intent_enum)
        print(f"🔍 Augmented query: {search_query[:100]}...")
        
        # Search using confirmed context + current input
        if "Relevant memory included" in confirmed_context:
            search_query += " " + confirmed_context
            
        # Retrieve with higher top_k, then filter by allowed datasets
        docs = rag_service.search(search_query, top_k=12)
        
        # Filter results based on intent-specific dataset routing
        allowed_datasets = rag_router.get_dataset_routing(intent_enum)
        docs = rag_router.filter_results_by_dataset(docs, allowed_datasets)
        print(f"📊 Retrieved {len(docs)} results from allowed datasets: {[d.name for d in allowed_datasets]}")
        
        # Validate retrieval quality
        is_valid, reason = rag_router.validate_retrieval_quality(docs, intent_enum)
        if not is_valid:
            print(f"⚠️ Retrieval quality check failed: {reason}")
        if docs:
            rag_data = ""
            has_symptom_data = False
            for d in docs:
                # Basic cleaning to remove potential encoding artifacts
                cleaned_text = d['text'].encode('ascii', 'ignore').decode('ascii')
                source_info = f"[{d['source']}]"
                if d.get('metadata', {}).get('category') == "Primary Symptom":
                    source_info += " (PRIMARY SYMPTOM ENTRY)"
                    has_symptom_data = True
                
                rag_data += f"- {source_info} {cleaned_text} (Title: {d['title']})\n"
            
            # ENHANCED FALLBACK: If this is a symptom query but RAG didn't return symptom data, add fallback
            if detected_intent == "symptom_based" and not has_symptom_data:
                fallback = get_symptom_fallback(combined_input)
                if fallback:
                    rag_data = f"[FALLBACK SYMPTOM DATA - Primary Source]\n{fallback}\n\n[Additional Context from Medical Database]\n{rag_data}"
                    print(f"✅ Supplementing RAG data with symptom fallback for: {combined_input[:50]}...")
        else:
            # CRITICAL FALLBACK: Check for symptom fallback before failing
            fallback = get_symptom_fallback(combined_input)
            if fallback:
                rag_data = f"[FALLBACK SYMPTOM DATA] {fallback}"
                print(f"✅ Using symptom fallback for query: {combined_input[:50]}...")

    # --- STEP 8: RETRIEVAL QUALITY CHECK ---
    # Before calling expensive LLM, check if we have sufficient context
    # If it's a symptom query and we have no data, use fallback directly
    has_sufficient_context = True
    
    if detected_intent == "symptom_based":
        # For symptom queries, we need either RAG data or fallback
        if rag_data == "No verified medical information found for this specific query.":
            # No RAG data - check if we have fallback
            fallback = get_symptom_fallback(combined_input)
            if fallback:
                # Use fallback directly without LLM call (saves API cost)
                print(f"⚡ QUALITY CHECK: Using fallback directly, skipping LLM for: {combined_input[:50]}...")
                return json.dumps({
                    "type": "health_report",
                    "health_information": fallback,
                    "possible_conditions": ["Various causes possible - not a diagnosis"],
                    "reasoning_brief": "Providing general information about this symptom based on medical knowledge.",
                    "recommended_next_steps": "Monitor your symptoms. Consult a healthcare professional if symptoms persist, worsen, or are accompanied by other concerning signs.",
                    "ai_confidence": "High - General Symptom Information",
                    "trusted_sources": ["Medical Knowledge Base", "MedlinePlus (NIH)"],
                    "disclaimer": "This is for informational purposes and not a diagnosis. Consult a professional."
                })
            else:
                has_sufficient_context = False

    # --- STEP 7: Medical Report Generation (Medical RAG) ---
    try:
        final_response = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": PROMPT_MEDICAL_RAG.format(
                    user_query=combined_input,
                    user_context=confirmed_context,
                    rag_data=rag_data
                )}
            ],
            model=LLM_MODEL,
            response_format={"type": "json_object"}
        )
        # --- STEP 8: Feedback Refinement (Handled by feedback_router.py) ---
        return final_response.choices[0].message.content
    except Exception as e:
        print(f"❌ Final RAG Error: {e}")
        print(f"❌ Error type: {type(e).__name__}")
        print(f"❌ Query was: {combined_input[:100]}")
        import traceback
        traceback.print_exc()
        
        # LAST RESORT FALLBACK: Try symptom fallback even if LLM fails
        fallback = get_symptom_fallback(combined_input)
        if fallback:
            return json.dumps({
                "type": "health_report",
                "health_information": fallback,
                "possible_conditions": ["Various causes possible"],
                "reasoning_brief": "Using general symptom information due to system limitations.",
                "recommended_next_steps": "Consult a healthcare professional for personalized advice.",
                "ai_confidence": "Medium - General Information",
                "trusted_sources": ["Medical Knowledge Base"],
                "disclaimer": "This is for informational purposes and not a diagnosis. Consult a professional."
            })
        
        return json.dumps({
            "type": "health_report",
            "health_information": "I encountered an error while processing your request. Please try again or consult a professional.",
            "ai_confidence": "Low - System Error",
            "disclaimer": "This is not a diagnosis. Consult a professional."
        })

