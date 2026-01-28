from fastapi import APIRouter, Depends, HTTPException, Body
from .auth import get_current_user
from .models import User
from . import mongo_memory, llm_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/feedback", tags=["Feedback"])

class FeedbackRequest(BaseModel):
    rating: str # "positive" or "negative"
    comment: Optional[str] = None
    context: Optional[str] = None # Optional context (e.g. summary of the report)

@router.post("/")
async def submit_feedback(
    feedback: FeedbackRequest,
    current_user: User = Depends(get_current_user)
):
    user_id = str(current_user.id)
    mongo_memory.log_feedback(
        user_id=user_id,
        rating=feedback.rating,
        comment=feedback.comment,
        context=feedback.context
    )
    
    # If feedback is negative, trigger the Feedback Refiner Stage
    refinement_insight = None
    if feedback.rating == "negative" and llm_service.client:
        try:
            refiner_response = await llm_service.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": llm_service.PROMPT_FEEDBACK_REFINER.format(
                        feedback_rating=feedback.rating,
                        feedback_comment=feedback.comment or "No comment provided."
                    )}
                ],
                model=llm_service.LLM_MODEL
            )
            refinement_insight = refiner_response.choices[0].message.content
            # Store refinement insight for developers/admin review
            mongo_memory.store_message(user_id, "system_refinement", refinement_insight)
        except Exception as e:
            print(f"⚠️ Feedback Refiner Error: {e}")

    return {
        "message": "Feedback received",
        "refinement_triggered": feedback.rating == "negative",
        "insight_generated": refinement_insight is not None
    }
