import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import InputArea from '../components/InputArea';
import ReportCard from '../components/ReportCard';
import { dashboardService, queryService } from '../services/api';
import { Loader2, User, Bot, Trash2 } from 'lucide-react';

const Chat = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const scrollRef = useRef(null);

  const fetchHistory = async () => {
    try {
      const data = await dashboardService.getHistory();
      // The backend now returns messages in chronological order (Oldest -> Newest)
      // We render them exactly as received from the single source of truth.
      setHistory(data);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  const handleSend = async ({ text, audioBlob, imageFile, reportFile }) => {
    // Optimistic update
    let content = text;
    if (!content) {
      if (audioBlob) content = '🎤 Voice Message';
      else if (imageFile) content = '📷 Image Upload (Physical)';
      else if (reportFile) content = '📄 Medical Report Upload';
    }

    const userMsg = {
      role: 'user',
      content: content
    };
    setHistory(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await queryService.sendMultimodalQuery(text, audioBlob, imageFile, reportFile);
      
      const aiMsg = {
        role: 'assistant',
        content: response.text_response,
        audio_url: response.audio_url
      };
      setHistory(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Error sending query:", error);
      const errorMsg = {
        role: 'assistant',
        content: JSON.stringify({
          summary: "Error processing request.",
          severity: "UNKNOWN",
          analysis: "Something went wrong. Please try again.",
          disclaimer: "System Error"
        })
      };
      setHistory(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm("Are you sure you want to clear all chat history? This cannot be undone.")) return;
    try {
      await dashboardService.clearHistory();
      setHistory([]);
    } catch (error) {
      console.error("Failed to clear history:", error);
      alert("Failed to clear history. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col relative">
        {history.length > 0 && (
          <button 
            onClick={handleClearChat}
            className="absolute top-2 right-6 p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}

        {initialLoad ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex-1 space-y-6 mb-8">
            {history.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">How can I help you today?</h3>
                <p className="text-gray-500 mt-2">Describe your symptoms via text, voice, or upload an image.</p>
              </div>
            )}

            {history.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-primary'
                }`}>
                  {msg.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </div>
                <div className={`flex-1 ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                  {msg.role === 'user' ? (
                    <div className="bg-primary text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[80%] shadow-sm">
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="max-w-[100%]">
                      <ReportCard data={msg.content} audioUrl={msg.audio_url} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-4">
                 <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-primary shrink-0">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="bg-white rounded-2xl px-5 py-4 border border-gray-100 shadow-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-gray-500">Analyzing symptoms...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      <InputArea onSend={handleSend} isLoading={loading} />
    </div>
  );
};

export default Chat;
