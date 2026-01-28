import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { profileService } from '../services/api';
import { Save, User, Ruler, Weight, Activity, AlertCircle } from 'lucide-react';

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

  useEffect(() => {
    loadProfile();
  }, []);

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

            <div className="pt-4 border-t border-gray-100 flex justify-end">
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
    </div>
  );
};

export default Profile;
