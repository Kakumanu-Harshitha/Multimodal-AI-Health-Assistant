import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ownerService } from '../services/api';

const OwnerDashboard = () => {
  const [activeTab, setActiveTab] = useState('health');
  const [healthData, setHealthData] = useState(null);
  const [satisfactionData, setSatisfactionData] = useState(null);
  const [modelData, setModelData] = useState(null);
  const [securityData, setSecurityData] = useState(null);
  const [hitlData, setHitlData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [toggles, setToggles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logFilters, setLogFilters] = useState({ action: '', status: '' });
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in as owner
    const role = localStorage.getItem('role');
    if (role !== 'OWNER') {
      navigate('/owner/login');
      return;
    }
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [health, satisfaction, models, security, hitl, logs, featureToggles] = await Promise.all([
        ownerService.getHealthMetrics(),
        ownerService.getSatisfactionMetrics(),
        ownerService.getModelMetrics(),
        ownerService.getSecurityMetrics(),
        ownerService.getHitlMetrics(),
        ownerService.getAuditLogs(logFilters),
        ownerService.getToggles()
      ]);
      setHealthData(health);
      setSatisfactionData(satisfaction);
      setModelData(models);
      setSecurityData(security);
      setHitlData(hitl);
      setAuditLogs(logs.logs);
      setToggles(featureToggles);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      if (error.response?.status === 403) {
        navigate('/owner/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setLogFilters(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      const timer = setTimeout(() => {
        ownerService.getAuditLogs(logFilters).then(data => setAuditLogs(data.logs));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [logFilters]);

  const handleToggle = async (key, currentValue) => {
    const newValue = currentValue === 'ON' ? 'OFF' : 'ON';
    try {
      await ownerService.updateToggle(key, newValue);
      setToggles(prev => prev.map(t => t.key === key ? { ...t, value: newValue } : t));
    } catch (error) {
      alert("Failed to update feature toggle");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/owner/login');
  };

  if (loading && !healthData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-blue-400">Owner Dashboard</h2>
          <p className="text-xs text-gray-400 mt-1">System Control & Observability</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'health', label: 'System Health', icon: '📊' },
            { id: 'satisfaction', label: 'User Satisfaction', icon: '⭐' },
            { id: 'models', label: 'Model Usage', icon: '🤖' },
            { id: 'hitl', label: 'HITL Monitoring', icon: '🚨' },
            { id: 'security', label: 'Security Metrics', icon: '🔐' },
            { id: 'logs', label: 'Audit Logs', icon: '🧾' },
            { id: 'toggles', label: 'Feature Toggles', icon: '⚙️' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-8 shrink-0">
          <h1 className="text-lg font-semibold">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ')}
          </h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchDashboardData}
              className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
            >
              <span>🔄</span> Refresh
            </button>
            <span className="text-gray-500 text-sm">Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-gray-900">
          {activeTab === 'health' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard title="Total Users" value={healthData?.total_users} icon="👥" />
              <MetricCard title="Active Today" value={healthData?.active_today} icon="🔥" />
              <MetricCard title="Active (7d)" value={healthData?.active_week} icon="📈" />
              <MetricCard title="Total AI Queries" value={healthData?.total_queries} icon="💬" />
              <MetricCard 
                title="Error Rate" 
                value={`${healthData?.error_rate}%`} 
                icon="⚠️" 
                color={healthData?.error_rate > 5 ? 'text-red-400' : 'text-green-400'}
              />
              <MetricCard title="HITL Escalations" value={healthData?.hitl_escalations} icon="🚨" />
            </div>
          )}

          {activeTab === 'satisfaction' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetricCard 
                  title="Helpfulness Rate" 
                  value={`${satisfactionData?.helpfulness_rate}%`} 
                  icon="⭐" 
                  color="text-yellow-400"
                />
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                  <h3 className="text-gray-400 text-sm mb-4">Avg Confidence Score</h3>
                  <div className="flex justify-between items-end gap-4">
                    <div className="flex-1">
                      <div className="text-xs text-green-400 mb-1">Helpful</div>
                      <div className="text-2xl font-bold">{(satisfactionData?.avg_confidence.helpful * 100).toFixed(1)}%</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-red-400 mb-1">Not Helpful</div>
                      <div className="text-2xl font-bold">{(satisfactionData?.avg_confidence.not_helpful * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-gray-400 text-sm mb-4">Negative Feedback Reasons</h3>
                <div className="space-y-4">
                  {Object.entries(satisfactionData?.reasons_breakdown || {}).map(([reason, count]) => (
                    <div key={reason} className="flex items-center gap-4">
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{ width: `${(count / satisfactionData.total_feedback * 100) || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm min-w-[140px]">{reason}</span>
                      <span className="text-sm font-bold text-gray-400">{count}</span>
                    </div>
                  ))}
                  {Object.keys(satisfactionData?.reasons_breakdown || {}).length === 0 && (
                    <p className="text-gray-500 text-center py-4 italic">No negative feedback recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetricCard 
                  title="Fallback Rate (HITL)" 
                  value={`${modelData?.fallback_rate}%`} 
                  icon="🚨" 
                />
                <MetricCard 
                  title="Total Modality Detections" 
                  value={modelData?.total_detections} 
                  icon="🔍" 
                />
              </div>

              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-gray-400 text-sm mb-4">Model Usage Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {Object.entries(modelData?.model_counts || {}).map(([model, count]) => (
                    <div key={model} className="text-center p-4 bg-gray-900/50 rounded-lg">
                      <div className="text-2xl font-bold mb-1">{count}</div>
                      <div className="text-xs text-gray-500 truncate">{model}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'hitl' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard title="Total Detections" value={hitlData?.total_detections} icon="🔍" />
                <MetricCard title="Total Escalations" value={hitlData?.total_escalations} icon="🚨" />
                <MetricCard 
                  title="Escalation Rate" 
                  value={`${hitlData?.escalation_rate}%`} 
                  icon="📈" 
                  color={hitlData?.escalation_rate > 20 ? 'text-red-400' : 'text-green-400'}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                  <h3 className="text-gray-400 text-sm mb-4">Escalation Reasons</h3>
                  <div className="space-y-4">
                    {Object.entries(hitlData?.reasons_breakdown || {}).map(([reason, count]) => (
                      <div key={reason} className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">{reason}</span>
                        <span className="text-sm font-bold text-blue-400">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                  <h3 className="text-gray-400 text-sm mb-4">Recent Escalations</h3>
                  <div className="space-y-3">
                    {hitlData?.recent_escalations?.map(log => (
                      <div key={log.id} className="text-xs p-3 bg-gray-900/50 rounded border border-gray-700">
                        <div className="flex justify-between mb-1">
                          <span className="text-blue-300 font-semibold">{log.reason || 'Unknown'}</span>
                          <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-gray-400 truncate">User ID: {log.user_id}</div>
                      </div>
                    ))}
                    {(!hitlData?.recent_escalations || hitlData?.recent_escalations.length === 0) && (
                      <p className="text-gray-500 text-center py-4 italic">No recent escalations.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MetricCard title="Password Resets" value={securityData?.password_resets} icon="🔑" />
              <MetricCard title="Failed Login Attempts" value={securityData?.failed_logins} icon="❌" />
              <MetricCard title="OTP Verification Failures" value={securityData?.otp_failures} icon="📱" />
              <div className={`bg-gray-800 p-6 rounded-xl border ${securityData?.suspicious_activity ? 'border-red-500' : 'border-gray-700'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🚨</span>
                  <h3 className="text-gray-400 text-sm">Recent Login Failures (1h)</h3>
                </div>
                <div className={`text-3xl font-bold ${securityData?.suspicious_activity ? 'text-red-400' : 'text-white'}`}>
                  {securityData?.recent_failed_logins_1h}
                </div>
                {securityData?.suspicious_activity && (
                  <p className="text-xs text-red-500 mt-2 font-semibold">⚠️ HIGH ACTIVITY DETECTED</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex gap-4 mb-4">
                <select 
                  name="action"
                  value={logFilters.action}
                  onChange={handleFilterChange}
                  className="bg-gray-800 border border-gray-700 text-sm rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Actions</option>
                  <option value="USER_LOGIN">User Login</option>
                  <option value="USER_SIGNUP">User Signup</option>
                  <option value="MULTIMODAL_QUERY">AI Query</option>
                  <option value="IMAGE_MODALITY_DETECTION">Image Detection</option>
                  <option value="PASSWORD_RESET_INIT">Password Reset Init</option>
                  <option value="TOTP_VERIFICATION">OTP Verification</option>
                </select>
                <select 
                  name="status"
                  value={logFilters.status}
                  onChange={handleFilterChange}
                  className="bg-gray-800 border border-gray-700 text-sm rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILURE">Failure</option>
                </select>
              </div>

              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs">
                      <tr>
                        <th className="px-6 py-4">Timestamp</th>
                        <th className="px-6 py-4">Action</th>
                        <th className="px-6 py-4">User ID</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Metadata</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-700/50">
                          <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 font-medium text-blue-300">
                            {log.action}
                          </td>
                          <td className="px-6 py-4 text-gray-400">
                            {log.user_id || 'Guest'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                              log.status === 'SUCCESS' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                            {JSON.stringify(log.metadata_json)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {auditLogs.length === 0 && (
                  <div className="p-8 text-center text-gray-500">No logs found.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'toggles' && (
            <div className="space-y-6">
              <p className="text-gray-400 text-sm mb-6">
                Enable or disable system features in real-time. Changes take effect immediately.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {toggles.map(toggle => (
                  <div key={toggle.id} className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{toggle.key.replace('feature_', '').replace(/_/g, ' ').toUpperCase()}</h3>
                      <p className="text-xs text-gray-500 mt-1">{toggle.description}</p>
                    </div>
                    <button
                      onClick={() => handleToggle(toggle.key, toggle.value)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        toggle.value === 'ON' ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          toggle.value === 'ON' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon, color = 'text-white' }) => (
  <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-colors shadow-lg">
    <div className="flex items-center gap-3 mb-2">
      <span className="text-2xl">{icon}</span>
      <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
    </div>
    <div className={`text-3xl font-bold ${color}`}>{value}</div>
  </div>
);

export default OwnerDashboard;
