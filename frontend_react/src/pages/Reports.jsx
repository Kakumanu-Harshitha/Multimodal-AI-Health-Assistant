import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import ReportCard from '../components/ReportCard';
import { dashboardService } from '../services/api';
import { Loader2, FileText, Calendar, Clock } from 'lucide-react';

const Reports = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await dashboardService.getHistory();
        // Filter for assistant messages that are valid JSON reports
        const reports = data.filter(msg => msg.role === 'assistant').map(msg => {
            try {
                const parsed = JSON.parse(msg.content);
                
                // Identify report types based on schema
                const isHealthReport = parsed.type === 'health_report' || !!parsed.health_information;
                const isMedicalAnalysis = parsed.type === 'medical_report_analysis' || !!parsed.test_analysis;
                const isLegacyMedical = parsed.input_type === 'medical_report' || !!parsed.interpretation;
                const isImageAnalysis = parsed.input_type === 'medical_image' || !!parsed.observations;
                const isGeneralReport = !!parsed.summary && (!!parsed.severity || !!parsed.risk_assessment);

                if (isHealthReport || isMedicalAnalysis || isLegacyMedical || isImageAnalysis || isGeneralReport) {
                    return parsed;
                }
                return null;
            } catch (e) {
                return null;
            }
        }).filter(Boolean);
        
        // We might want to reverse to show newest first if the API doesn't
        setHistory(reports.reverse());
      } catch (error) {
        console.error("Failed to fetch reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Health Reports History
          </h1>
          <p className="text-gray-500 mt-1">
            View your past AI health assessments and recommendations.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No reports found</h3>
            <p className="text-gray-500 mt-2">Start a new assessment to generate your first health report.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
            {history.map((report, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-1 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                 {/* We can wrap ReportCard or use it directly. 
                     ReportCard expects 'data' prop. 
                     Let's add a header to each card showing "Report #X" or date if available.
                     Since we don't have date in the message content easily (unless we add it), 
                     we'll just show the card.
                 */}
                 <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                    <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                        <Clock className="h-4 w-4" />
                        <span>Past Report</span>
                    </div>
                    <span className="text-xs font-mono text-gray-400">ID: {history.length - idx}</span>
                 </div>
                 <div className="p-4">
                    <ReportCard data={report} />
                 </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Reports;