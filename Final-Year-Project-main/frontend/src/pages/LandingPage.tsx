import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Mic, 
  Image as ImageIcon, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  Layers, 
  Type,
  Video,
  Eye,
  MessageSquare,
  Bookmark
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { VERIFIED_EXAMPLES } from '../data/verifiedPhrases';

export const LandingPage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  // Animation easing tuple
  const customEase = [0.16, 1, 0.3, 1] as const;

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 28 },
    visible: (custom: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.01 : 0.7,
        delay: shouldReduceMotion ? 0 : custom,
        ease: customEase,
      },
    }),
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.15,
        delayChildren: shouldReduceMotion ? 0 : 0.1,
      },
    },
  };

  const cardVariant = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.01 : 0.65,
        ease: customEase,
      },
    },
  };

  return (
    <div className="relative min-h-screen bg-[#0A0F1C] text-[#E2E8F0] selection:bg-[#14B8A6]/30 selection:text-white overflow-hidden">
      {/* Background Animated Ambient Lights & Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none -z-10" />

      {/* Floating Ambient Glow Orbs */}
      {!shouldReduceMotion && (
        <>
          <motion.div
            animate={{
              x: [-20, 25, -20],
              y: [-15, 20, -15],
              scale: [1, 1.12, 1],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-10 left-1/4 -translate-x-1/2 w-[500px] h-[400px] bg-gradient-to-br from-[#14B8A6]/15 to-[#0D9488]/5 rounded-full blur-[120px] pointer-events-none -z-10"
          />
          <motion.div
            animate={{
              x: [25, -25, 25],
              y: [20, -15, 20],
              scale: [1.08, 0.95, 1.08],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-36 right-1/4 translate-x-1/2 w-[550px] h-[450px] bg-gradient-to-bl from-[#22D3EE]/15 to-teal-500/5 rounded-full blur-[140px] pointer-events-none -z-10"
          />
          <motion.div
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-[650px] left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-[#14B8A6]/8 rounded-full blur-[130px] pointer-events-none -z-10"
          />
        </>
      )}

      {/* Hero Section */}
      <section className="relative pt-14 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Platform Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: shouldReduceMotion ? 0 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0F172A]/90 backdrop-blur-md border border-[#1E293B] text-teal-400 text-xs font-semibold shadow-lg shadow-black/40 hover:border-teal-500/40 transition-colors"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22D3EE] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#14B8A6]" />
            </span>
            <span>AI-Powered ASL Communication Platform</span>
          </motion.div>

          {/* Hero Heading */}
          <div className="space-y-4">
            <motion.h1
              custom={0.1}
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight"
            >
              Bridge Communication with <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14B8A6] via-[#22D3EE] to-teal-200">
                Natural Sign Language
              </span>
            </motion.h1>

            <motion.p
              custom={0.25}
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="max-w-2xl mx-auto text-base sm:text-lg text-[#94A3B8] leading-relaxed font-normal"
            >
              Translate English text, spoken voice, and image text into structured American Sign Language gloss sequences aligned with verified educational sign video demonstrations.
            </motion.p>
          </div>

          {/* Action Buttons */}
          <motion.div
            custom={0.4}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="flex flex-wrap items-center justify-center gap-3 pt-2"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/text-to-sign"
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-teal-400 hover:to-[#14B8A6] text-slate-950 font-bold text-sm shadow-xl shadow-teal-500/25 flex items-center space-x-2 transition-all"
              >
                <span>Start Translating</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/speech-to-sign"
                className="px-6 py-3.5 rounded-xl bg-[#0F172A] hover:bg-[#131D31] border border-[#1E293B] hover:border-cyan-500/50 text-[#E2E8F0] font-semibold text-sm transition-all flex items-center space-x-2 shadow-lg shadow-black/30"
              >
                <Mic className="w-4 h-4 text-[#22D3EE]" />
                <span>Voice to Sign</span>
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/image-to-sign"
                className="px-6 py-3.5 rounded-xl bg-[#0F172A] hover:bg-[#131D31] border border-[#1E293B] hover:border-teal-500/50 text-[#E2E8F0] font-semibold text-sm transition-all flex items-center space-x-2 shadow-lg shadow-black/30"
              >
                <ImageIcon className="w-4 h-4 text-[#14B8A6]" />
                <span>Image OCR</span>
              </Link>
            </motion.div>
          </motion.div>

          {/* Verified Quick-Start Phrases */}
          <motion.div
            custom={0.55}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="pt-6 max-w-3xl mx-auto"
          >
            <p className="text-xs uppercase font-semibold tracking-wider text-[#94A3B8] mb-3">
              Try a verified communication phrase:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {VERIFIED_EXAMPLES.slice(0, 4).map((ex, i) => (
                <motion.div
                  key={ex.id}
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    to={`/text-to-sign?sample=${encodeURIComponent(ex.text)}`}
                    className="px-3.5 py-1.5 rounded-lg bg-[#0F172A]/90 hover:bg-[#131D31] border border-[#1E293B] hover:border-teal-500/40 text-xs text-[#E2E8F0] hover:text-teal-300 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="text-[#94A3B8]">&quot;{ex.text}&quot;</span>
                    <ArrowRight className="w-3 h-3 text-[#14B8A6]" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3 Multimodal Input Pathways */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="text-center space-y-3 mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Three Input Modes, One Unified Pipeline
          </h2>
          <p className="text-sm text-[#94A3B8] max-w-xl mx-auto">
            Every input modality feeds into a shared linguistic engine that restructures grammar and matches validated ASL signs.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Card 1: Text-to-Sign */}
          <motion.div
            variants={cardVariant}
            whileHover={{ y: -6, transition: { duration: 0.25 } }}
            className="p-6 sm:p-8 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-[#14B8A6]/50 hover:shadow-[0_12px_30px_-10px_rgba(20,184,166,0.18)] transition-all duration-300 space-y-5 flex flex-col justify-between group shadow-xl shadow-black/20"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 text-[#14B8A6] flex items-center justify-center group-hover:scale-110 group-hover:bg-teal-500/20 transition-all duration-300">
                <Type className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-teal-300 transition-colors">
                Text-to-Sign
              </h3>
              <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                Enter arbitrary English prose or dialogue. The system applies topic-comment restructuring, fronts temporal frames, and schedules educational ASL sign video sequences.
              </p>
            </div>
            <Link
              to="/text-to-sign"
              className="inline-flex items-center text-xs font-semibold text-[#14B8A6] hover:text-teal-300 transition-colors pt-2"
            >
              Launch Text Workspace <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1.5 transition-transform duration-300" />
            </Link>
          </motion.div>

          {/* Card 2: Speech-to-Sign */}
          <motion.div
            variants={cardVariant}
            whileHover={{ y: -6, transition: { duration: 0.25 } }}
            className="p-6 sm:p-8 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-[#22D3EE]/50 hover:shadow-[0_12px_30px_-10px_rgba(34,211,238,0.18)] transition-all duration-300 space-y-5 flex flex-col justify-between group shadow-xl shadow-black/20"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[#22D3EE] flex items-center justify-center group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all duration-300">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                Speech-to-Sign
              </h3>
              <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                Capture natural voice through your microphone with live transcription and confidence diagnostics. Edit recognized speech before piping it to verified sign playback.
              </p>
            </div>
            <Link
              to="/speech-to-sign"
              className="inline-flex items-center text-xs font-semibold text-[#22D3EE] hover:text-cyan-300 transition-colors pt-2"
            >
              Launch Voice Workspace <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1.5 transition-transform duration-300" />
            </Link>
          </motion.div>

          {/* Card 3: Image-to-Sign */}
          <motion.div
            variants={cardVariant}
            whileHover={{ y: -6, transition: { duration: 0.25 } }}
            className="p-6 sm:p-8 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-[#14B8A6]/50 hover:shadow-[0_12px_30px_-10px_rgba(20,184,166,0.18)] transition-all duration-300 space-y-5 flex flex-col justify-between group shadow-xl shadow-black/20"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 text-[#14B8A6] flex items-center justify-center group-hover:scale-110 group-hover:bg-teal-500/20 transition-all duration-300">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-teal-300 transition-colors">
                Image-to-Sign (OCR)
              </h3>
              <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                Upload photos of notices, printed medical labels, or document text. The OCR engine extracts readable English, enables inline editing, and presents animated sign sequences.
              </p>
            </div>
            <Link
              to="/image-to-sign"
              className="inline-flex items-center text-xs font-semibold text-[#14B8A6] hover:text-teal-300 transition-colors pt-2"
            >
              Launch Image Workspace <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1.5 transition-transform duration-300" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#1E293B]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="text-center space-y-3 mb-12"
        >
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#0F172A] border border-[#1E293B] text-xs font-semibold text-teal-400">
            <Layers className="w-3.5 h-3.5" />
            <span>Architecture & Principles</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            How the Translation Pipeline Operates
          </h2>
          <p className="text-sm text-[#94A3B8] max-w-xl mx-auto">
            From raw English to natural American Sign Language through structured linguistic engineering.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {/* Step 1 */}
          <motion.div
            variants={cardVariant}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-teal-500/40 space-y-3 shadow-lg shadow-black/20 transition-all duration-300 relative overflow-hidden group"
          >
            <div className="text-xs font-mono font-bold text-[#14B8A6] tracking-wider">01 / MULTIMODAL CAPTURE</div>
            <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">English Input Normalization</h3>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              Accepts input through text typing, microphone streaming, or image character extraction. Normalizes contractions and cleans punctuation for linguistic analysis.
            </p>
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-teal-500/10 transition-colors" />
          </motion.div>

          {/* Step 2 */}
          <motion.div
            variants={cardVariant}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-cyan-500/40 space-y-3 shadow-lg shadow-black/20 transition-all duration-300 relative overflow-hidden group"
          >
            <div className="text-xs font-mono font-bold text-[#22D3EE] tracking-wider">02 / LINGUISTIC RESTRUCTURING</div>
            <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Topic-Comment Syntactic Engine</h3>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              Restructures English SVO syntax into authentic ASL grammar: fronting time markers, shifting interrogative WH-words, omitting copulas, and tagging non-manual facial markers.
            </p>
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />
          </motion.div>

          {/* Step 3 */}
          <motion.div
            variants={cardVariant}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-teal-500/40 space-y-3 shadow-lg shadow-black/20 transition-all duration-300 relative overflow-hidden group"
          >
            <div className="text-xs font-mono font-bold text-[#14B8A6] tracking-wider">03 / VERIFIED MEDIA RENDERING</div>
            <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">Educational Video & Honest Fallbacks</h3>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              Plays verified video demonstrations for mapped signs. When assets are unavailable, transparently renders articulatory concept cards or manual alphabet fingerspelling.
            </p>
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-teal-500/10 transition-colors" />
          </motion.div>
        </motion.div>
      </section>

      {/* Trust & Accessibility Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="p-8 sm:p-10 rounded-3xl bg-[#0F172A] border border-[#1E293B] space-y-6 shadow-2xl shadow-black/40 relative overflow-hidden"
        >
          <div className="flex items-center space-x-2 text-teal-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Honest Accessibility Commitment</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#14B8A6] shrink-0" />
                Linguistically Grounded
              </h3>
              <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                Rather than naïve word-for-word word substitution, ASL Bridge AI applies grammatical rules informed by ASL linguistic structure to deliver respectful, meaningful translations.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#22D3EE] shrink-0" />
                Transparent Verification
              </h3>
              <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                Sign media is explicitly categorized. Video playback indicates verified citation sources, while unverified terms honestly present concept cards and fingerspelling.
              </p>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        </motion.div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 text-center space-y-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#0A0F1C] border border-[#1E293B] space-y-6 shadow-2xl shadow-black/40 relative overflow-hidden"
        >
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to Begin Communicating?
          </h2>
          <p className="text-sm text-[#94A3B8] max-w-lg mx-auto leading-relaxed">
            Choose your preferred input method and explore American Sign Language translation in real time.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/text-to-sign"
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-teal-400 hover:to-[#14B8A6] text-slate-950 font-bold text-sm shadow-xl shadow-teal-500/25 flex items-center space-x-2 transition-all"
              >
                <span>Launch Translation Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/phrases"
                className="px-6 py-3.5 rounded-xl bg-[#0F172A] hover:bg-[#131D31] border border-[#1E293B] hover:border-teal-500/40 text-[#E2E8F0] font-semibold text-sm transition-all flex items-center space-x-2 shadow-lg shadow-black/30"
              >
                <Bookmark className="w-4 h-4 text-teal-400" />
                <span>Browse Quick Phrases</span>
              </Link>
            </motion.div>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        </motion.div>
      </section>
    </div>
  );
};
