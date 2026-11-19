import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, AlertCircle, BookOpen, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#070A13] border-t border-[#1E293B] transition-colors mt-auto text-[#94A3B8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Identity & Academic Overview */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#14B8A6] to-[#22D3EE] flex items-center justify-center text-[#0A0F1C] font-bold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#0A0F1C]" />
              </div>
              <span className="font-bold text-white text-base tracking-tight">
                ASL Bridge AI
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              An NLP-based multimodal American Sign Language translation system developing syntactic Topic-Comment restructuring and verified sign media alignments for accessible communication.
            </p>
            <div className="text-[11px] text-[#64748B]">
              Final-Year Academic Engineering Project
            </div>
          </div>

          {/* Col 2: Core Features */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]"></span>
              Translation Workspaces
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/text-to-sign" className="text-[#94A3B8] hover:text-[#22D3EE] transition-colors">
                  Text-to-Sign AI
                </Link>
              </li>
              <li>
                <Link to="/speech-to-sign" className="text-[#94A3B8] hover:text-[#22D3EE] transition-colors">
                  Speech-to-Sign AI
                </Link>
              </li>
              <li>
                <Link to="/image-to-sign" className="text-[#94A3B8] hover:text-[#22D3EE] transition-colors">
                  Image-to-Sign (OCR)
                </Link>
              </li>
              <li>
                <Link to="/conversation" className="text-[#94A3B8] hover:text-[#22D3EE] transition-colors">
                  Two-Way Conversation
                </Link>
              </li>
              <li>
                <Link to="/phrases" className="text-[#94A3B8] hover:text-[#22D3EE] transition-colors">
                  Emergency Quick-Phrases
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Documentation & Project */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]"></span>
              About the Project
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/about" className="text-[#94A3B8] hover:text-[#22D3EE] transition-colors">
                  System Architecture & Methodology
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-[#94A3B8] hover:text-[#22D3EE] transition-colors">
                  User Workspace Dashboard
                </Link>
              </li>
              <li>
                <Link to="/history" className="text-[#94A3B8] hover:text-[#22D3EE] transition-colors">
                  Translation History & Logs
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Ethics & Governance */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]"></span>
              Ethics & Governance
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/privacy" className="text-[#94A3B8] hover:text-[#22D3EE] transition-colors">
                  Privacy Policy & Data Sovereignty
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-[#94A3B8] hover:text-[#22D3EE] transition-colors">
                  Terms of Use & Guidelines
                </Link>
              </li>
              <li>
                <Link to="/settings" className="text-[#94A3B8] hover:text-[#22D3EE] transition-colors">
                  Accessibility & Display Preferences
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Ethical Linguistic Assistance Notice & Copyright */}
        <div className="mt-8 pt-6 border-t border-[#1E293B] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#64748B] gap-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="max-w-3xl leading-relaxed">
              <strong className="font-semibold text-[#94A3B8]">Linguistic Assistance Notice:</strong> American Sign Language is an autonomous natural language with distinct grammatical conventions. Automated sign sequences are communicative approximations. This system does not replace certified human ASL interpreters in critical medical, legal, or emergency environments.
            </p>
          </div>
          <div className="whitespace-nowrap font-medium text-[#94A3B8] text-right">
            © {currentYear} ASL Bridge AI. Academic Project.
          </div>
        </div>
      </div>
    </footer>
  );
};
