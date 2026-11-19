import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Sparkles, 
  Mic, 
  Image, 
  MessageSquare, 
  Bookmark, 
  BarChart2, 
  Shield, 
  User, 
  LogOut, 
  Eye, 
  Type, 
  Menu, 
  X,
  FileText,
  Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { motion, AnimatePresence } from 'framer-motion';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, isResearcher, logout } = useAuth();
  const { highContrast, largeText, toggleHighContrast, toggleLargeText } = useAccessibility();
  const { isInstallable, promptInstall } = usePwaInstall();

  const navLinks = [
    { name: 'Text-to-Sign', path: '/text-to-sign', icon: Sparkles },
    { name: 'Speech-to-Sign', path: '/speech-to-sign', icon: Mic },
    { name: 'Image-to-Sign', path: '/image-to-sign', icon: Image },
    { name: 'Conversation', path: '/conversation', icon: MessageSquare },
    { name: 'Quick Phrases', path: '/phrases', icon: Bookmark },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-[#080C16]/90 backdrop-blur-md border-b border-[#1E293B] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Project Title */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#14B8A6] to-[#22D3EE] flex items-center justify-center text-[#0A0F1C] font-bold shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-[#0A0F1C]" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                ASL Bridge <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#14B8A6]/15 text-[#22D3EE] font-bold border border-[#14B8A6]/30">AI</span>
              </span>
              <span className="text-[10px] text-[#94A3B8] block -mt-1 font-medium">Multimodal Sign Platform</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive(link.path)
                      ? 'bg-[#14B8A6]/15 text-[#22D3EE] border border-[#14B8A6]/30 shadow-xs'
                      : 'text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#0F172A] border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-[#14B8A6]" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Accessibility Controls & Auth */}
          <div className="hidden md:flex items-center space-x-2">
            {/* High Contrast Toggle */}
            <button
              onClick={toggleHighContrast}
              title="Toggle High Contrast Mode"
              aria-label="Toggle High Contrast"
              className={`p-2 rounded-lg text-xs border transition-colors ${
                highContrast
                  ? 'bg-[#14B8A6] text-[#0A0F1C] border-[#14B8A6] font-bold'
                  : 'text-[#94A3B8] border-[#1E293B] hover:text-[#E2E8F0] hover:bg-[#0F172A]'
              }`}
            >
              <Eye className="w-4 h-4" />
            </button>

            {/* Large Text Toggle */}
            <button
              onClick={toggleLargeText}
              title="Toggle Larger Text"
              aria-label="Toggle Large Text"
              className={`p-2 rounded-lg text-xs border transition-colors ${
                largeText
                  ? 'bg-[#14B8A6] text-[#0A0F1C] border-[#14B8A6] font-bold'
                  : 'text-[#94A3B8] border-[#1E293B] hover:text-[#E2E8F0] hover:bg-[#0F172A]'
              }`}
            >
              <Type className="w-4 h-4" />
            </button>

            {/* Admin Link if authorized */}
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Vocab</span>
              </Link>
            )}

            {/* Researcher Lab if authorized */}
            {isResearcher && (
              <Link
                to="/research"
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-500/10 text-[#22D3EE] border border-teal-500/30 hover:bg-teal-500/20"
              >
                <BarChart2 className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>Research Lab</span>
              </Link>
            )}

            {/* Install PWA Button (Native prompt) */}
            {isInstallable && (
              <button
                onClick={promptInstall}
                title="Install ASL Bridge AI App"
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-500/15 to-cyan-500/15 text-[#22D3EE] border border-teal-500/30 hover:border-teal-500/60 hover:bg-teal-500/20 transition-all shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>Install App</span>
              </button>
            )}

            {/* User Profile or Login */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-[#1E293B]">
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-1.5 text-xs font-medium text-[#E2E8F0] bg-[#0F172A] border border-[#1E293B] px-3 py-1.5 rounded-lg hover:border-[#14B8A6]/40 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-[#14B8A6]" />
                  <span>{user?.name.split(' ')[0]}</span>
                </Link>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-1.5 text-[#94A3B8] hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="ml-2 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-[#22D3EE] hover:to-[#14B8A6] shadow-md shadow-teal-500/20 transition-all hover:scale-[1.02]"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex items-center space-x-2 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#0F172A] border border-[#1E293B]"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="lg:hidden border-b border-[#1E293B] bg-[#080C16] px-4 pt-2 pb-4 space-y-1 overflow-hidden"
          >
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-[#94A3B8] hover:text-white hover:bg-[#0F172A] transition-colors"
              >
                <link.icon className="w-4 h-4 text-[#14B8A6]" />
                <span>{link.name}</span>
              </Link>
            ))}
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-[#94A3B8] hover:text-white hover:bg-[#0F172A] transition-colors"
            >
              <FileText className="w-4 h-4 text-[#14B8A6]" />
              <span>About & Methodology</span>
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Admin Vocabulary</span>
              </Link>
            )}
            {isResearcher && (
              <Link
                to="/research"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-[#22D3EE] hover:bg-teal-500/10 transition-colors"
              >
                <BarChart2 className="w-4 h-4 text-[#22D3EE]" />
                <span>Research Lab</span>
              </Link>
            )}
            {isInstallable && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  promptInstall();
                }}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-bold text-[#0A0F1C] bg-gradient-to-r from-[#14B8A6] to-[#22D3EE] shadow-md shadow-teal-500/20 transition-all hover:scale-[1.01]"
              >
                <Download className="w-4 h-4 text-[#0A0F1C]" />
                <span>Install ASL Bridge App</span>
              </button>
            )}
            <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleHighContrast}
                  className="px-3 py-1.5 text-xs font-medium border border-[#1E293B] rounded-lg text-[#94A3B8] hover:text-white bg-[#0F172A]"
                >
                  Contrast: {highContrast ? 'High' : 'Normal'}
                </button>
                <button
                  onClick={toggleLargeText}
                  className="px-3 py-1.5 text-xs font-medium border border-[#1E293B] rounded-lg text-[#94A3B8] hover:text-white bg-[#0F172A]"
                >
                  Text: {largeText ? 'Large' : 'Normal'}
                </button>
              </div>
              {isAuthenticated ? (
                <button onClick={logout} className="text-xs text-red-400 font-medium">Sign out</button>
              ) : (
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-xs text-[#22D3EE] font-semibold">Sign in</Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
