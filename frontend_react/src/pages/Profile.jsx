import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { profileService, securityService } from '../services/api';
import { Save, User, Ruler, Weight, Activity, AlertCircle, Lock, X, ShieldCheck, KeyRound, Eye, EyeOff } from 'lucide-react';

const Profile = () => {
  const [profile, setProfile] = useState({
    age: '',
    gender: 'Prefer not to say',
    weight_kg: '',
    height_cm: '',
    allergies: '',
    chronic_diseases: '',
    health_goals: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Password Change Flow State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwStep, setPwStep] = useState(1); // 1: QR/OTP, 2: New Password, 3: Success
  const [qrCode, setQrCode] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const handleOpenPasswordModal = async () => {
    setPwLoading(true);
    setPwError('');
    try {
      const data = await securityService.initiateChangePassword();
      setQrCode(data.qr_code);
      setPwStep(1);
      setShowPasswordModal(true);
    } catch (error) {
      console.error("Failed to init password change:", error);
      setMessage('Failed to initiate password change. Please try again.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setPwError('Please enter a 6-digit OTP');
      return;
    }
    setPwLoading(true);
    setPwError('');
    try {
      await securityService.verifyOtp(otp);
      setPwStep(2);
    } catch (error) {
      setPwError(error.response?.data?.detail || 'Invalid OTP. Please try again.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleCompletePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters');
      return;
    }
    setPwLoading(true);
    setPwError('');
    try {
      await securityService.completeChangePassword(newPassword);
      setPwStep(3);
    } catch (error) {
      setPwError(error.response?.data?.detail || 'Failed to update password.');
    } finally {
      setPwLoading(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPwStep(1);
    setQrCode('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setPwError('');
  };

  const loadProfile = async () => {
    try {
      const data = await profileService.getProfile();
      if (data) {
        setProfile(prev => ({
          ...prev,
          ...data,
          age: data.age ?? '',
          weight_kg: data.weight_kg ?? '',
          height_cm: data.height_cm ?? '',
          allergies: data.allergies ?? '',
          chronic_diseases: data.chronic_diseases ?? '',
          health_goals: data.health_goals ?? '',
          gender: data.gender || 'Prefer not to say'
        }));
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const payload = {
        ...profile,
        age: profile.age ? parseInt(profile.age) : null,
        weight_kg: profile.weight_kg ? parseFloat(profile.weight_kg) : null,
        height_cm: profile.height_cm ? parseFloat(profile.height_cm) : null,
      };

      await profileService.updateProfile(payload);
      setMessage('Profile updated successfully!');
    } catch (error) {
      console.error(error);
      setMessage('Failed to save profile. Please check your inputs.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Health Profile</h1>
              <p className="text-sm text-gray-500 mt-1">Personalize your AI health assistant</p>
            </div>
            <div className="bg-primary/10 p-2 rounded-lg">
              <User className="h-6 w-6 text-primary" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {message && (
              <div className={`p-4 rounded-lg text-sm ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Age</label>
                <div className="relative">
                  <input
                    type="number"
                    name="age"
                    value={profile.age}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="25"
                  />
                  <Activity className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <select
                  name="gender"
                  value={profile.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                >
                  <option>Prefer not to say</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
                <div className="relative">
                  <input
                    type="number"
                    name="weight_kg"
                    value={profile.weight_kg}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="70"
                  />
                  <Weight className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Height (cm)</label>
                <div className="relative">
                  <input
                    type="number"
                    name="height_cm"
                    value={profile.height_cm}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="175"
                  />
                  <Ruler className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Allergies</label>
              <div className="relative">
                <textarea
                  name="allergies"
                  value={profile.allergies}
                  onChange={handleChange}
                  rows={2}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                  placeholder="Peanuts, Penicillin..."
                />
                <AlertCircle className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Chronic Diseases</label>
              <div className="relative">
                <textarea
                  name="chronic_diseases"
                  value={profile.chronic_diseases}
                  onChange={handleChange}
                  rows={2}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                  placeholder="Diabetes, Hypertension..."
                />
                <Activity className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Health Goals</label>
              <div className="relative">
                <textarea
                  name="health_goals"
                  value={profile.health_goals}
                  onChange={handleChange}
                  rows={2}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                  placeholder="Lose weight, Improve stamina, Better sleep..."
                />
                <Activity className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
              <button
                type="button"
                onClick={handleOpenPasswordModal}
                className="text-gray-600 px-4 py-2 rounded-xl font-medium hover:bg-gray-100 transition-all flex items-center gap-2"
              >
                <Lock className="h-4 w-4" />
                Change Password
              </button>
              
              <button
                type="submit"
                disabled={saving}
                className="bg-primary text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
              >
                {saving ? 'Saving...' : 'Save Profile'}
                <Save className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Security Verification
              </h3>
              <button onClick={closePasswordModal} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-8">
              {pwStep === 1 && (
                <div className="space-y-6 text-center">
                  <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-gray-900">Step 1: Scan QR Code</h4>
                    <p className="text-sm text-gray-500">Scan this code with Microsoft Authenticator or any TOTP app.</p>
                  </div>
                  
                  <div className="bg-white p-4 inline-block rounded-2xl border border-gray-100 shadow-sm">
                    {qrCode && <img src={qrCode} alt="TOTP QR Code" className="w-48 h-48" />}
                  </div>

                  <div className="space-y-4 text-left">
                    <label className="block text-sm font-medium text-gray-700">Enter 6-digit OTP</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="000000"
                    />
                    {pwError && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {pwError}</p>}
                  </div>

                  <button
                    onClick={handleVerifyOtp}
                    disabled={pwLoading || otp.length !== 6}
                    className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {pwLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              )}

              {pwStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2 text-center">
                    <h4 className="text-lg font-semibold text-gray-900">Step 2: Set New Password</h4>
                    <p className="text-sm text-gray-500">Your identity is verified. Please enter a strong new password.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">New Password</label>
                      <div className="relative">
                        <input
                          type={showPw ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          placeholder="••••••••"
                        />
                        <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                        <button 
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-3.5"
                        >
                          {showPw ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showPw ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          placeholder="••••••••"
                        />
                        <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      </div>
                    </div>

                    {pwError && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {pwError}</p>}
                  </div>

                  <button
                    onClick={handleCompletePasswordChange}
                    disabled={pwLoading}
                    className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {pwLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              )}

              {pwStep === 3 && (
                <div className="space-y-6 text-center">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                    <ShieldCheck className="h-10 w-10 text-green-600" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-gray-900">Success!</h4>
                    <p className="text-gray-500">Your password has been updated securely. Please use your new password next time you login.</p>
                  </div>
                  <button
                    onClick={closePasswordModal}
                    className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
