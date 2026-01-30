import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { Activity, ArrowRight, Loader2, Mail, CheckCircle } from 'lucide-react';

const Login = () => {
  const [view, setView] = useState('login'); // 'login', 'signup', 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      if (view === 'login') {
        const data = await authService.login(email, password);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('email', data.email);
        navigate('/chat');
      } else if (view === 'signup') {
        const data = await authService.signup(email, password);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('email', data.email);
        navigate('/chat');
      } else if (view === 'forgot') {
        await authService.forgotPassword(email);
        setSuccessMessage('If the account exists, a reset email has been sent.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Action failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (view === 'login') return 'Welcome Back';
    if (view === 'signup') return 'Create Account';
    return 'Forgot Password';
  };

  const getSubtitle = () => {
    if (view === 'login') return 'Access your personal health assistant';
    if (view === 'signup') return 'Start your journey to better health';
    return 'We will send you a link to reset your password';
  };

  const getIcon = () => {
    if (view === 'forgot') return <Mail className="h-6 w-6 text-white" />;
    return <Activity className="h-6 w-6 text-white" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-8 text-center bg-primary/5">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
            {getIcon()}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {getTitle()}
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            {getSubtitle()}
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-green-50 border border-green-100 text-green-600 text-sm rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {successMessage}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            
            {view !== 'forgot' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            {view === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setView('forgot');
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {view === 'login' ? 'Sign In' : view === 'signup' ? 'Sign Up' : 'Send Reset Link'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {view === 'forgot' ? (
              <button
                onClick={() => {
                  setView('login');
                  setError('');
                  setSuccessMessage('');
                }}
                className="text-sm text-gray-600 hover:text-primary font-medium transition-colors block w-full"
              >
                Back to Sign In
              </button>
            ) : (
              <button
                onClick={() => {
                  setView(view === 'login' ? 'signup' : 'login');
                  setError('');
                  setSuccessMessage('');
                }}
                className="text-sm text-gray-600 hover:text-primary font-medium transition-colors block w-full"
              >
                {view === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
