import React, { useState, useRef } from 'react';
import { Send, Mic, Image as ImageIcon, X, Loader2, FileText } from 'lucide-react';
import clsx from 'clsx';

const InputArea = ({ onSend, isLoading }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [reportFile, setReportFile] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((!text.trim() && !audioBlob && !imageFile) || isLoading) return;

    onSend({ text, audioBlob, imageFile });
    
    // Reset state
    setText('');
    setAudioBlob(null);
    setImageFile(null);
  };

  return (
    <div className="bg-white border-t border-gray-100 p-4 sticky bottom-0 z-40">
      <div className="max-w-3xl mx-auto">
        {/* Preview Area */}
        {(audioBlob || imageFile) && (
          <div className="flex gap-2 mb-3 overflow-x-auto">
            {audioBlob && (
              <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full text-sm border border-purple-100">
                <Mic className="h-3 w-3" />
                <span>Voice Note Recorded</span>
                <button onClick={() => setAudioBlob(null)} className="hover:text-purple-900">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {imageFile && (
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm border border-blue-100">
                <ImageIcon className="h-3 w-3" />
                <span className="max-w-[150px] truncate">{imageFile.name}</span>
                <button onClick={() => setImageFile(null)} className="hover:text-blue-900">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-gray-50 p-2 rounded-3xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
          <label className="p-3 text-gray-400 hover:text-primary cursor-pointer transition-colors" title="Upload Image">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <ImageIcon className="h-5 w-5" />
          </label>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe your symptoms..."
            className="flex-1 bg-transparent border-0 focus:ring-0 resize-none py-3 max-h-32 min-h-[44px] text-gray-900 placeholder:text-gray-400"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={clsx(
                "p-3 rounded-full transition-all duration-200",
                isRecording 
                  ? "bg-red-50 text-red-600 animate-pulse" 
                  : "text-gray-400 hover:text-primary"
              )}
              title={isRecording ? "Stop Recording" : "Record Voice"}
            >
              <Mic className="h-5 w-5" />
            </button>

            <button
              type="submit"
              disabled={isLoading || (!text.trim() && !audioBlob && !imageFile && !reportFile)}
            className={clsx(
              "p-3 rounded-full transition-all duration-200",
              (text.trim() || audioBlob || imageFile || reportFile) && !isLoading
                ? "bg-primary text-white shadow-md hover:bg-primary/90" 
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </form>
      <div className="text-center mt-2">
         <p className="text-xs text-gray-400">
          AI can make mistakes. Please consult a doctor for serious concerns.
        </p>
        <p className="text-[10px] text-gray-300 mt-1">
          You may upload lab reports or prescriptions (PDF/Image) to help us understand your condition better.
        </p>
      </div>
    </div>
  </div>
);
};

export default InputArea;
