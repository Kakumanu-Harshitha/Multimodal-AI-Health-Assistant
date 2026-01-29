import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, Activity, Menu, X, FileText, MessageSquare, Home, AlertCircle } from 'lucide-react';
import { authService, profileService } from '../services/api';
import clsx from 'clsx';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileWarning, setProfileWarning] = useState(false);
  const email = localStorage.getItem('email');
  const isLoggedIn = !!email;

  useEffect(() => {
    if (isLoggedIn) {
      profileService.getProfile()
        .then(data => {
          if (!data.age || !data.height_cm || !data.weight_kg) {
            setProfileWarning(true);
          } else {
            setProfileWarning(false);
          }
        })
        .catch(err => console.error("Profile check failed", err));
    }
  }, [isLoggedIn, location.pathname]); // Re-check on route change (e.g. after updating profile)

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
    setIsMenuOpen(false);
  };

  const navItems = [
    { name: 'Assessment', path: '/assessment', icon: MessageSquare },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Profile', path: '/profile', icon: User, warning: profileWarning },
  ];

  return (
    <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
          <div className="bg-primary/5 p-2 rounded-lg">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <span className="font-bold text-xl text-primary tracking-tight">HealthGuide AI</span>
        </Link>

        {/* Desktop Navigation */}
        {isLoggedIn && (
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => clsx(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 relative",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
                {item.warning && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
                )}
              </NavLink>
            ))}
          </nav>
        )}

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-4">
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 hidden lg:block">Hello, {email.split('@')[0]}</span>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
                Log in
              </Link>
              <Link 
                to="/login" 
                className="bg-primary text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm hover:shadow-md"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 absolute w-full left-0 top-16 shadow-lg py-4 px-4 flex flex-col gap-2 animate-in slide-in-from-top-2">
          {isLoggedIn ? (
            <>
              <div className="px-4 py-2 text-sm text-gray-500 font-medium border-b border-gray-50 mb-2">
                Signed in as {username}
              </div>
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) => clsx(
                    "px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center gap-3 relative",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                  {item.warning && (
                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </NavLink>
              ))}
              <div className="h-px bg-gray-100 my-2" />
              <button 
                onClick={handleLogout}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3 text-left"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-3 p-2">
              <Link 
                to="/login" 
                onClick={() => setIsMenuOpen(false)}
                className="w-full py-3 text-center rounded-xl font-medium text-gray-600 hover:bg-gray-50"
              >
                Log in
              </Link>
              <Link 
                to="/login" 
                onClick={() => setIsMenuOpen(false)}
                className="w-full py-3 text-center rounded-xl font-medium bg-primary text-white shadow-sm"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
