import React from 'react';
import { ShieldCheck, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 animate-fade-in text-[#E2E8F0]">
      <Link 
        to="/" 
        className="inline-flex items-center space-x-2 text-xs font-semibold text-[#14B8A6] hover:text-[#22D3EE] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </Link>

      <div className="space-y-2 border-b border-[#1E293B] pb-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#14B8A6]/10 text-[#22D3EE] text-xs font-semibold border border-[#14B8A6]/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Platform Terms & Guidelines</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Terms & Conditions of Service
        </h1>
        <p className="text-sm text-[#94A3B8]">
          Last Updated: Academic Release 2026–2027 • ASL Bridge AI Educational Platform
        </p>
      </div>

      <div className="space-y-6 text-sm text-[#94A3B8] leading-relaxed">
        <section className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#14B8A6]"></span>
            1. Purpose and Permitted Use
          </h2>
          <p>
            ASL Bridge AI is an educational, research-oriented communication platform designed to assist in English-to-American Sign Language translation through natural language processing, retrieval-augmented generation, and verified sign media playback.
          </p>
          <p>
            The software is provided for academic, personal, and accessibility communication purposes. It is not intended to replace certified human American Sign Language (ASL) interpreters in high-stakes situations such as legal depositions, medical consultations, or emergency medical procedures.
          </p>
        </section>

        <section className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#14B8A6]"></span>
            2. Privacy and Data Handling
          </h2>
          <p>
            Speech recordings and image inputs provided to the platform are processed transiently in memory for translation and feature extraction. We do not sell or monetize personal user communication data. User accounts, translation history, and saved phrases are stored securely in MongoDB Atlas and may be cleared by users at any time from their settings.
          </p>
        </section>

        <section className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#14B8A6]"></span>
            3. Linguistic Accuracy and Disclaimer
          </h2>
          <p>
            While ASL Bridge AI implements rule-based NLP restructuring and contextual vector retrieval to generate grammatically appropriate Topic-Comment glosses, ASL is an autonomous natural language possessing rich spatial and non-manual grammatical rules. Automated outputs represent communicative approximations and should be evaluated in context.
          </p>
        </section>

        <section className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#14B8A6]"></span>
            4. User Commitments
          </h2>
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#14B8A6] mt-0.5 shrink-0" />
              <span>You agree not to use the service for unauthorized automated scraping or denial-of-service activities.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#14B8A6] mt-0.5 shrink-0" />
              <span>You acknowledge that sign media files are cataloged for accessibility research and educational visualization.</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};
export default TermsPage;
