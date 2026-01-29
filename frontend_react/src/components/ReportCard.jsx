import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, AlertOctagon, Info, Stethoscope, Utensils, Activity, Download, FileText, Brain, ShieldCheck, ThumbsUp, ThumbsDown, HelpCircle, Volume2, User as UserIcon, Image as ImageIcon } from 'lucide-react';
import clsx from 'clsx';
import { dashboardService, feedbackService } from '../services/api';

const SeverityBadge = ({ level }) => {
  const colors = {
    LOW: "bg-green-100 text-green-700 border-green-200",
    MODERATE: "bg-yellow-100 text-yellow-700 border-yellow-200",
    HIGH: "bg-orange-100 text-orange-700 border-orange-200",
    EMERGENCY: "bg-red-100 text-red-700 border-red-200",
    UNKNOWN: "bg-gray-100 text-gray-700 border-gray-200"
  };

  return (
    <span className={clsx(
      "px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider",
      colors[level] || colors.UNKNOWN
    )}>
      Severity: {level}
    </span>
  );
};

const ConfidenceBar = ({ score, reason }) => {
  // Handle both number (0-1) and string (Low/Medium/High) scores
  let percentage = 0;
  if (typeof score === 'number') {
    percentage = Math.round(score * 100);
  } else if (typeof score === 'string') {
    const s = score.toLowerCase();
    if (s.includes('high')) percentage = 90;
    else if (s.includes('medium')) percentage = 60;
    else if (s.includes('low')) percentage = 30;
  }
  
  const color = percentage > 80 ? "bg-green-500" : percentage > 50 ? "bg-yellow-500" : "bg-red-500";
  
  return (
    <div className="flex flex-col gap-1 w-full max-w-xs">
      <div className="flex justify-between text-xs text-gray-500">
        <span>AI Confidence</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percentage}%` }} />
      </div>
      {reason && <span className="text-[10px] text-gray-400 italic">{reason}</span>}
    </div>
  );
};

const ReportCard = ({ data, audioUrl }) => {
  const [downloading, setDownloading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(null);

  const handleFeedback = async (rating) => {
    if (feedbackGiven) return;
    setFeedbackGiven(rating);
    try {
        const context = typeof data === 'string' ? JSON.parse(data).summary : data.summary;
        await feedbackService.submitFeedback(rating, context);
    } catch (e) {
        console.error("Feedback error", e);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const email = localStorage.getItem('email');
      if (!email) {
        alert("Please log in to download reports.");
        return;
      }
      
      const blob = await dashboardService.getReportPdf(email);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `HealthReport_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error("Download failed", error);
      alert("Failed to download report. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // Safe Parsing
  let report = data;
  if (typeof data === 'string') {
    try {
      report = JSON.parse(data);
    } catch (e) {
      return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-700 leading-relaxed">{data}</p>
        </div>
      );
    }
  }

  // Handle General Health Report (Symptom Analysis)
  if (report?.type === 'health_report') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-3xl animate-in fade-in slide-in-from-bottom-4">
        {audioUrl && (
          <div className="px-6 pt-4">
            <div className="bg-gray-50 rounded-lg p-2 flex items-center gap-3">
                 <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <Volume2 size={16} />
                 </div>
                 <audio controls src={`http://localhost:8000${audioUrl}`} className="w-full h-8 bg-transparent" />
            </div>
          </div>
        )}
        
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-white">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg text-teal-600">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Health Information</h3>
            </div>
            <button 
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors shadow-sm"
            >
              {downloading ? <span className="w-3 h-3 border-2 border-gray-400 border-t-primary rounded-full animate-spin"></span> : <Download className="h-3.5 w-3.5" />}
              {downloading ? 'Generating...' : 'PDF'}
            </button>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed mb-4">{report.health_information || report.summary}</p>
          {report.ai_confidence && <ConfidenceBar score={report.ai_confidence} />}
        </div>

        <div className="p-6 space-y-6">
          {report.possible_conditions?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Possible Considerations
              </h4>
              <div className="flex flex-wrap gap-2">
                {report.possible_conditions.map((cond, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100">
                    {cond}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <h4 className="text-blue-900 font-semibold text-sm mb-2 flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Next Steps
              </h4>
              <p className="text-blue-800 text-xs leading-relaxed">{report.recommended_next_steps}</p>
            </div>
            
            {report.trusted_sources?.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h4 className="text-gray-900 font-semibold text-sm mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  Sources
                </h4>
                <ul className="text-gray-600 text-[10px] space-y-1 list-disc list-inside">
                  {report.trusted_sources.map((src, i) => <li key={i}>{src}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-start gap-3">
          <Info className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-500 leading-relaxed">{report.disclaimer}</p>
        </div>
      </div>
    );
  }

  // Handle Medical Report Analysis (New Strict Format)
  if (report?.type === 'medical_report_analysis') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-3xl animate-in fade-in slide-in-from-bottom-4">
        {audioUrl && (
          <div className="px-6 pt-4">
            <div className="bg-gray-50 rounded-lg p-2 flex items-center gap-3">
                 <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <Volume2 size={16} />
                 </div>
                 <audio controls src={`http://localhost:8000${audioUrl}`} className="w-full h-8 bg-transparent" />
            </div>
          </div>
        )}
        
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Medical Report Analysis</h3>
            </div>
            <button 
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors shadow-sm"
            >
              {downloading ? <span className="w-3 h-3 border-2 border-gray-400 border-t-primary rounded-full animate-spin"></span> : <Download className="h-3.5 w-3.5" />}
              {downloading ? 'Generating...' : 'PDF'}
            </button>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed mb-4">{report.summary}</p>
          
          {report.summary?.includes("seek medical attention") && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-pulse">
              <AlertOctagon className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-red-700">
                Some values are significantly outside the normal range. Please seek medical attention.
              </p>
            </div>
          )}

          {report.ai_confidence && <ConfidenceBar score={report.ai_confidence} />}
        </div>

        <div className="p-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Test Analysis
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-2 font-medium">Test Name</th>
                  <th className="px-4 py-2 font-medium">Value</th>
                  <th className="px-4 py-2 font-medium">Normal Range</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.test_analysis?.map((test, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div>{test.test_name}</div>
                      <div className="text-[10px] text-gray-400 font-normal mt-0.5">{test.explanation}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-semibold">{test.value}</td>
                    <td className="px-4 py-3 text-gray-500">{test.normal_range}</td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        test.status?.toLowerCase() === 'normal' ? "bg-green-100 text-green-700" : 
                        test.status?.toLowerCase() === 'borderline' ? "bg-yellow-100 text-yellow-700" :
                        (test.status?.toLowerCase() === 'high' || test.status?.toLowerCase() === 'low') ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      )}>
                        {test.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <h4 className="text-green-900 font-semibold text-sm mb-2 flex items-center gap-2">
                <Utensils className="h-4 w-4" />
                General Guidance
              </h4>
              <ul className="text-green-800 text-xs space-y-1 list-disc list-inside">
                {report.general_guidance?.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
              <h4 className="text-orange-900 font-semibold text-sm mb-2 flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                When to Consult a Doctor
              </h4>
              <ul className="text-orange-800 text-xs space-y-1 list-disc list-inside">
                {report.when_to_consult_doctor?.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-start gap-3">
          <Info className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-500 leading-relaxed">{report.disclaimer}</p>
        </div>
      </div>
    );
  }

  // Handle Medical Report Analysis (Legacy Format)
  if (report?.input_type === 'medical_report') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-3xl animate-in fade-in slide-in-from-bottom-4">
        {audioUrl && (
          <div className="px-6 pt-4">
            <div className="bg-gray-50 rounded-lg p-2 flex items-center gap-3">
                 <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <Volume2 size={16} />
                 </div>
                 <audio controls src={`http://localhost:8000${audioUrl}`} className="w-full h-8 bg-transparent" />
            </div>
          </div>
        )}
        
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg text-green-600">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{report.report_type || "Medical Report Analysis"}</h3>
            </div>
            <button 
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors shadow-sm"
            >
              {downloading ? <span className="w-3 h-3 border-2 border-gray-400 border-t-primary rounded-full animate-spin"></span> : <Download className="h-3.5 w-3.5" />}
              {downloading ? 'Generating...' : 'PDF'}
            </button>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">{report.interpretation}</p>
        </div>

        <div className="p-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Detected Lab Markers
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-2 font-medium">Marker</th>
                  <th className="px-4 py-2 font-medium">Value</th>
                  <th className="px-4 py-2 font-medium">Reference</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.key_values?.map((kv, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{kv.marker}</td>
                    <td className="px-4 py-3 text-gray-700">{kv.value}</td>
                    <td className="px-4 py-3 text-gray-500">{kv.range}</td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        kv.status?.toLowerCase() === 'normal' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {kv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-100">
            <h4 className="text-blue-900 font-semibold text-sm mb-1 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Recommendation
            </h4>
            <p className="text-blue-800 text-sm">{report.recommendation}</p>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-start gap-3">
          <Info className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-500 leading-relaxed">{report.disclaimer}</p>
        </div>
      </div>
    );
  }

  // Handle Clarification Questions (Triage Mode)
  if (report?.type === 'clarification_questions') {
    return (
      <div className="bg-blue-50 rounded-2xl p-6 shadow-sm border border-blue-100 animate-in fade-in slide-in-from-bottom-4">
         {audioUrl && (
            <div className="mb-4 bg-white p-2 rounded-lg flex items-center gap-2 border border-blue-100">
                <Volume2 className="text-blue-500 w-5 h-5" />
                <audio controls src={`http://localhost:8000${audioUrl}`} className="w-full h-8" />
            </div>
         )}
         <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-full">
                <HelpCircle className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-blue-900">Clarification Needed</h3>
         </div>
         <p className="text-blue-800 mb-5 leading-relaxed">{report.context}</p>
         <div className="space-y-3">
            {report.questions && report.questions.map((q, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border border-blue-100 text-blue-900 font-medium shadow-sm flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">{i + 1}</span>
                    {q}
                </div>
            ))}
         </div>
         <p className="mt-4 text-xs text-blue-600 font-medium uppercase tracking-wide">Please answer to proceed</p>
      </div>
    );
  }

  // Handle Medical Image Analysis (Strict Format)
  if (report?.input_type === 'medical_image') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-3xl animate-in fade-in slide-in-from-bottom-4">
        {audioUrl && (
          <div className="px-6 pt-4">
            <div className="bg-gray-50 rounded-lg p-2 flex items-center gap-3">
                 <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <Volume2 size={16} />
                 </div>
                 <audio controls src={`http://localhost:8000${audioUrl}`} className="w-full h-8 bg-transparent" />
            </div>
          </div>
        )}

        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <ImageIcon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Physical Image Analysis</h3>
            </div>
            <button 
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors shadow-sm"
            >
              {downloading ? <span className="w-3 h-3 border-2 border-gray-400 border-t-primary rounded-full animate-spin"></span> : <Download className="h-3.5 w-3.5" />}
              {downloading ? 'Generating...' : 'PDF'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {report.observations?.map((obs, i) => (
              <span key={i} className="px-3 py-1 bg-white border border-blue-100 text-blue-700 text-xs rounded-full font-medium shadow-sm">
                {obs}
              </span>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Possible Considerations
            </h4>
            <ul className="space-y-2">
              {report.possible_conditions?.map((cond, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  {cond}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
            <h4 className="text-orange-900 font-semibold text-sm mb-1 flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              General Care Advice
            </h4>
            <p className="text-orange-800 text-sm">{report.general_advice}</p>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-start gap-3">
          <Info className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-500 leading-relaxed">{report.disclaimer}</p>
        </div>
      </div>
    );
  }

  // Handle Legacy or Error Formats
  if (!report || !report.summary) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <p className="text-gray-700 leading-relaxed">{typeof report === 'string' ? report : JSON.stringify(report)}</p>
      </div>
    );
  }

  // Normalize Data Structure (Backwards Compatibility)
  const severity = report.risk_assessment?.severity || report.severity || "UNKNOWN";
  const confidence = report.risk_assessment?.confidence_score || 0.0;
  const uncertainty = report.risk_assessment?.uncertainty_reason;
  const explanation = report.explanation || {};
  const recommendations = report.recommendations || {};
  const food_advice = recommendations.food_advice || report.food_recommendations || [];
  const lifestyle_advice = recommendations.lifestyle_advice || report.recommended_actions || [];
  const immediate_action = recommendations.immediate_action;
  const specialist = report.recommended_specialist;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-3xl animate-in fade-in slide-in-from-bottom-4">
      {audioUrl && (
          <div className="px-6 pt-4">
            <div className="bg-gray-50 rounded-lg p-2 flex items-center gap-3">
                 <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <Volume2 size={16} />
                 </div>
                 <audio controls src={`http://localhost:8000${audioUrl}`} className="w-full h-8 bg-transparent" />
            </div>
          </div>
        )}
      
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Health Assessment</h3>
              <button 
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors shadow-sm"
              >
                {downloading ? <span className="w-3 h-3 border-2 border-gray-400 border-t-primary rounded-full animate-spin"></span> : <Download className="h-3.5 w-3.5" />}
                {downloading ? 'Generating...' : 'PDF'}
              </button>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">{report.summary}</p>
            
            {/* Confidence Bar */}
            {confidence > 0 && <ConfidenceBar score={confidence} reason={uncertainty} />}
          </div>
          
          <div className="shrink-0 flex flex-col items-end gap-2">
            <SeverityBadge level={severity} />
          </div>
        </div>
      </div>

      {/* Recommendations Grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Specialist Suggestion (New Feature) */}
        {specialist && (
            <div className="col-span-1 md:col-span-2 bg-teal-50 rounded-xl p-5 border border-teal-100">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-teal-100 rounded-full text-teal-600">
                        <UserIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-teal-900 font-semibold flex items-center gap-2">
                            Consultation Suggested: {specialist.type}
                            <span className="text-xs px-2 py-0.5 bg-white rounded-full border border-teal-200 text-teal-600 uppercase tracking-wide">
                                {specialist.urgency}
                            </span>
                        </h4>
                        <p className="text-sm text-teal-700 mt-1">{specialist.reason}</p>
                        <p className="text-[10px] text-teal-500 mt-2 uppercase tracking-wider font-medium">
                            Advisory Only • Not a Referral
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* Google-Level Explainability Panel */}
        {explanation.reasoning && (
          <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
            <button 
              onClick={() => setShowExplanation(!showExplanation)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Brain className="h-4 w-4 text-primary" />
                Why this advice? (AI Logic)
              </div>
              <span className="text-xs text-primary font-medium">{showExplanation ? "Hide" : "Show"}</span>
            </button>
            
            {showExplanation && (
              <div className="p-4 pt-0 border-t border-slate-100 bg-white">
                <div className="mt-3 space-y-3 text-sm text-slate-600">
                  <p><span className="font-medium text-slate-800">Reasoning:</span> {explanation.reasoning}</p>
                  {explanation.history_factor && (
                     <p><span className="font-medium text-slate-800">History Context:</span> {explanation.history_factor}</p>
                  )}
                  {explanation.profile_factor && (
                     <p><span className="font-medium text-slate-800">Profile Impact:</span> {explanation.profile_factor}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Immediate Action (If Critical) */}
        {immediate_action && (
          <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 flex items-start gap-3">
             <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5" />
             <div>
                <h4 className="font-medium text-blue-900 text-sm mb-1">Recommended Action</h4>
                <p className="text-blue-800 text-sm">{immediate_action}</p>
             </div>
          </div>
        )}

        {/* Possible Conditions */}
        {report.possible_causes && report.possible_causes.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
              <Stethoscope className="h-4 w-4 text-primary" />
              Possible Conditions (Not a diagnosis)
            </h4>
            <div className="flex flex-wrap gap-2">
              {report.possible_causes.map((condition, idx) => (
                <span key={idx} className="inline-flex items-center px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-sm border border-gray-200">
                  {condition}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Lifestyle Recommendations */}
        {lifestyle_advice.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Lifestyle Advice
            </h4>
            <ul className="space-y-2">
              {lifestyle_advice.map((action, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Food Recommendations */}
        {food_advice.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
              <Utensils className="h-4 w-4 text-orange-500" />
              Personalized Nutrition
            </h4>
            <ul className="space-y-2">
              {food_advice.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-300 mt-2 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Trusted Sources (RAG) */}
        {report.knowledge_sources && report.knowledge_sources.length > 0 && (
          <div className="col-span-1 md:col-span-2 mt-2 pt-4 border-t border-gray-100">
             <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-900 mb-3">
              <FileText className="h-4 w-4 text-blue-600" />
              Trusted Medical Sources
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
                {report.knowledge_sources.map((src, idx) => (
                    <div key={idx} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <p className="text-xs font-bold text-blue-800 mb-1">{src.source || "Source"}</p>
                        <p className="text-xs text-blue-600 leading-snug">{src.description}</p>
                    </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Feedback Section */}
      <div className="px-6 pb-2 flex items-center justify-end gap-2">
        <span className="text-xs text-gray-400">Was this helpful?</span>
        <button 
            onClick={() => handleFeedback('positive')}
            disabled={feedbackGiven}
            className={`p-1.5 rounded-full transition-colors ${feedbackGiven === 'positive' ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100 text-gray-400'}`}
        >
            <ThumbsUp className="h-4 w-4" />
        </button>
        <button 
            onClick={() => handleFeedback('negative')}
            disabled={feedbackGiven}
            className={`p-1.5 rounded-full transition-colors ${feedbackGiven === 'negative' ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100 text-gray-400'}`}
        >
            <ThumbsDown className="h-4 w-4" />
        </button>
      </div>

      {/* Disclaimer Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-start gap-3">
        <Info className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
        <p className="text-xs text-gray-500 leading-relaxed">
          {report.disclaimer || "This AI provides preliminary guidance only and is not a substitute for professional medical advice."}
        </p>
      </div>
    </div>
  );
};

export default ReportCard;
