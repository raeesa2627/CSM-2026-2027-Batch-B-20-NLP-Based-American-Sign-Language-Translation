import React from 'react';
import { 
  BookOpen, 
  Layers, 
  ShieldCheck, 
  Award, 
  Cpu, 
  GitBranch, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10 text-[#E2E8F0]">
      {/* Platform & Methodology Header */}
      <div className="p-8 rounded-3xl bg-[#0F172A] border border-[#1E293B] shadow-xl space-y-4">
        <div className="text-center space-y-2 border-b pb-6 border-[#1E293B]">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#14B8A6]/15 text-[#22D3EE] text-xs font-semibold border border-[#14B8A6]/30">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Linguistic Methodology & Engineering Documentation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white pt-2 tracking-tight">
            An NLP-Based American Sign Language Translation System
          </h1>
          <p className="text-xs sm:text-sm text-[#14B8A6] font-semibold max-w-2xl mx-auto">
            Context-Aware Multimodal Communication Platform Using NLP, Deep Learning, and Retrieval-Augmented Generation
          </p>
        </div>

        {/* Abstract Box */}
        <div className="space-y-2 pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#22D3EE] flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-[#14B8A6]" />
            System Abstract
          </h2>
          <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed text-justify">
            American Sign Language (ASL) is a primary means of communication for the Deaf and hard-of-hearing community, yet communication between ASL users and non-signing individuals remains challenging due to the limited availability of accessible translation systems. This project proposes an <strong>NLP-Based American Sign Language Translation System</strong> that integrates Natural Language Processing (NLP) techniques to provide three modes of communication: <strong>Text-to-Sign, Speech-to-Sign, and Image-to-Sign</strong>. In the Text-to-Sign module, user-provided English text is processed using NLP techniques such as tokenization, normalization, sentence analysis, and keyword extraction to generate an appropriate ASL sign sequence, which is represented through sign images, GIFs, or verified educational sign videos. The Speech-to-Sign module first converts spoken input into text using speech recognition and then applies the Text-to-Sign pipeline, forming a Speech-to-Text-to-Sign system. The Image-to-Sign module extracts textual information from images using Optical Character Recognition (OCR), followed by NLP-based text processing and conversion into ASL signs, forming an Image-to-Text-to-Sign pipeline. The proposed system focuses on using NLP to understand and restructure natural-language input before mapping it to meaningful ASL representations.
          </p>
        </div>
      </div>

      {/* 3 Application Layers Architecture */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#14B8A6]" />
          Three-Tier System Architecture
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-2 shadow-lg">
            <span className="text-[10px] font-bold text-[#22D3EE] uppercase bg-[#14B8A6]/15 border border-[#14B8A6]/30 px-2 py-0.5 rounded">Layer A</span>
            <h3 className="text-sm font-bold text-white">React 18 Frontend</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Vite, TypeScript, Tailwind CSS, TanStack Query, and Lucide React. Delivers the accessible SignSequenceViewer, live microphone stream, drag-and-drop OCR, and dual-party conversation dialogue.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-2 shadow-lg">
            <span className="text-[10px] font-bold text-[#14B8A6] uppercase bg-[#14B8A6]/15 border border-[#14B8A6]/30 px-2 py-0.5 rounded">Layer B</span>
            <h3 className="text-sm font-bold text-white">Express Backend Gateway</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Node.js, TypeScript, Mongoose/MongoDB Atlas, JWT auth, bcrypt, rate limiting, and multer. Manages persistent authentication, saved phrases, translation history logging, and administrative review workflows.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-2 shadow-lg">
            <span className="text-[10px] font-bold text-emerald-400 uppercase bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">Layer C</span>
            <h3 className="text-sm font-bold text-white">FastAPI AI Microservice</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Python 3, Pydantic v2, scikit-learn, and NLTK. Powers ASL syntactic transformation (Topic-Comment, WH-movement, copula deletion), vector RAG grounding, OCR processing, and automated BLEU/chrF evaluation.
            </p>
          </div>
        </div>
      </div>

      {/* ASL Linguistic Rules Matrix */}
      <div className="p-6 bg-[#0F172A] rounded-3xl border border-[#1E293B] space-y-4 shadow-xl">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#22D3EE]">
          Implemented ASL Linguistic Transformations
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#0A0F1C] border border-[#1E293B] space-y-1">
            <strong className="text-white block font-semibold">1. Topic-Comment (T-C) Ordering</strong>
            <p className="text-[#94A3B8]">
              Objects and focal topics are fronted before the subject or predicate for visual clarity.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0A0F1C] border border-[#1E293B] space-y-1">
            <strong className="text-white block font-semibold">2. Time-Topic-Comment (TIME Fronting)</strong>
            <p className="text-[#94A3B8]">
              Temporal adverbs (YESTERDAY, TOMORROW, NOW) establish the temporal frame at the very beginning of the sentence.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0A0F1C] border border-[#1E293B] space-y-1">
            <strong className="text-white block font-semibold">3. WH-Question Movement with {'{q}'}</strong>
            <p className="text-[#94A3B8]">
              Interrogatives (WHERE, WHAT, WHO) move to terminal position accompanied by furrowed brow non-manual markers.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0A0F1C] border border-[#1E293B] space-y-1">
            <strong className="text-white block font-semibold">4. Copula & Article Deletion</strong>
            <p className="text-[#94A3B8]">
              State-of-being verbs (is, am, are, was, were) and English articles (a, an, the) are grammatically eliminated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
