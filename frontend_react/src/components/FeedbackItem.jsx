import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check, AlertCircle } from 'lucide-react';
import { feedbackService } from '../services/api';

const FeedbackItem = ({ queryId }) => {
  const [submitted, setSubmitted] = useState(false);
  const [helpful, setHelpful] = useState(null); // true, false, or null
  const [reason, setReason] = useState('');
  const [otherText, setOtherText] = useState('');
  const [loading, setLoading] = useState(false);

  const reasons = [
    "Not accurate",
    "Not relevant",
    "Too complex",
    "Didn't answer my question",
    "Other"
  ];

  const handleFeedback = async () => {
    if (!helpful && !reason) return;
    
    setLoading(true);
    try {
      await feedbackService.submitFeedback(helpful, {
        query_id: queryId,
        reason: reason,
        comment: reason === "Other" ? otherText : null
      });
      setSubmitted(true);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-600 mt-2 px-1 animate-in fade-in slide-in-from-bottom-1 font-medium">
        <Check className="h-3 w-3" />
        <span>Thank you for your valuable feedback.</span>
      </div>
    );
  }

  return (
    <div className="mt-3 px-1">
      {helpful === null ? (
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">Was this helpful?</span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setHelpful(true);
                // For "Helpful", we can either auto-submit or follow the same manual pattern.
                // The prompt focuses on the "What went wrong?" flow, but "Manual Submit" is the principle.
                // Let's make "Helpful" also require a click on a Submit button for consistency if needed, 
                // but usually, a thumbs up is a direct action. 
                // However, the prompt says "Feedback is submitted only after clicking an explicit 'Submit' button."
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                helpful === true ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
              }`}
              title="Helpful"
            >
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button
              onClick={() => setHelpful(false)}
              className={`p-1.5 rounded-lg transition-colors ${
                helpful === false ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:bg-red-50 hover:text-red-600'
              }`}
              title="Not helpful"
            >
              <ThumbsDown className="h-4 w-4" />
            </button>
          </div>
          {helpful === true && (
            <button
              onClick={handleFeedback}
              disabled={loading}
              className="text-xs bg-primary text-white px-3 py-1 rounded-md hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      ) : !helpful && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm animate-in zoom-in-95 max-w-sm">
          <p className="text-xs font-semibold text-gray-800 mb-3">What went wrong?</p>
          <div className="space-y-2">
            {reasons.map((r) => (
              <label
                key={r}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <div className="relative flex items-center justify-center">
                  <input
                    type="radio"
                    name={`reason-${queryId}`}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="sr-only"
                  />
                  <div className={`h-4 w-4 rounded-full border-2 transition-all ${
                    reason === r ? 'border-primary' : 'border-gray-300 group-hover:border-gray-400'
                  }`}>
                    {reason === r && (
                      <div className="absolute inset-1 bg-primary rounded-full" />
                    )}
                  </div>
                </div>
                <span className={`text-xs transition-colors ${
                  reason === r ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-800'
                }`}>
                  {r}
                </span>
              </label>
            ))}
          </div>

          {reason === "Other" && (
            <div className="mt-3 animate-in fade-in slide-in-from-top-1">
              <textarea
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Optional: Tell us more..."
                className="w-full text-xs p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px] resize-none transition-all"
              />
            </div>
          )}
          
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleFeedback}
              disabled={loading || !reason}
              className="flex-1 bg-primary text-white py-2 rounded-lg text-xs font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
            <button 
              onClick={() => {
                setHelpful(null);
                setReason('');
                setOtherText('');
              }}
              className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackItem;
