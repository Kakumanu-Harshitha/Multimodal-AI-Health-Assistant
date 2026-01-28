import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { Shield, Clock, Smartphone, Activity, ArrowRight, Mic, Camera, FileText } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, desc }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
    <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center mb-4 text-primary">
      <Icon className="h-5 w-5" />
    </div>
    <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
  </div>
);

const Home = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main>
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-slate-900 text-white">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm font-medium mb-6">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                24/7 AI Health Companion
              </div>
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 leading-tight">
                Your Health, <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Understood.</span>
              </h1>
              <p className="text-lg text-gray-300 mb-8 max-w-2xl leading-relaxed">
                Get preliminary health guidance using advanced AI. Describe symptoms via text, voice, or images for personalized insights in seconds.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link 
                  to="/assessment" 
                  className="bg-white text-slate-900 px-8 py-3.5 rounded-full font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                  Start Health Check
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link 
                  to="/profile" 
                  className="px-8 py-3.5 rounded-full font-semibold border border-white/20 hover:bg-white/10 transition-colors"
                >
                  Update Profile
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Multiple Input Methods</h2>
              <p className="text-gray-500">Share your symptoms your way. Our AI adapts to how you communicate best.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={FileText}
                title="Text Description"
                desc="Describe your symptoms in your own words. Our AI understands natural language."
              />
              <FeatureCard 
                icon={Mic}
                title="Voice Input"
                desc="Prefer speaking? Just tap and talk. We'll transcribe and analyze your concerns."
              />
              <FeatureCard 
                icon={Camera}
                title="Image Analysis"
                desc="Upload photos of visible symptoms for AI-powered visual assessment."
              />
            </div>
          </div>
        </div>

        {/* Trust Section */}
        <div className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Smart Health Insights</h2>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Activity className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Instant Analysis</h3>
                      <p className="text-gray-500 text-sm mt-1">Understand symptom severity and get clear recommendations instantly.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                      <Shield className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Privacy First</h3>
                      <p className="text-gray-500 text-sm mt-1">Your health data is encrypted and secure. We prioritize your privacy.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                      <Clock className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Always Available</h3>
                      <p className="text-gray-500 text-sm mt-1">Access your health history and get guidance 24/7, anywhere.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-3xl transform rotate-3"></div>
                <div className="relative bg-white border border-gray-100 rounded-3xl shadow-xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Sample Report</div>
                      <div className="font-bold text-gray-900 text-lg">Symptom Analysis</div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">Low Severity</span>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600 leading-relaxed">
                      Symptoms suggest a minor viral infection. Rest and hydration are recommended.
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-2">Recommended Actions</div>
                      <ul className="space-y-2 text-sm text-gray-500">
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          Drink plenty of fluids
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          Monitor temperature
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-50 border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 max-w-2xl mx-auto leading-relaxed">
            <span className="font-semibold block mb-2 text-gray-900">Important Medical Notice</span>
            This AI health companion provides preliminary guidance only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
