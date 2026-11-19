import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  RefreshCw, 
  CheckCircle2, 
  Layers, 
  Cpu, 
  Clock, 
  ShieldCheck, 
  Award,
  ChevronRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import { EvaluationReport, EvaluationStrategyResult } from '../types';
import { useAuth } from '../context/AuthContext';

export const ResearchPage: React.FC = () => {
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { isAuthenticated, isResearcher } = useAuth();

  useEffect(() => {
    if (isAuthenticated && isResearcher) {
      fetchEvaluationData();
    }
  }, [isAuthenticated, isResearcher]);

  const fetchEvaluationData = async (forceFresh: boolean = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getResearchEvaluation(forceFresh);
      setReport(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch evaluation metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStrategyBadge = (strat: string) => {
    if (strat === 'rag_grounded') {
      return {
        label: 'System C: NLP + RAG Grounding (Proposed)',
        color: 'bg-[#14B8A6]/20 text-[#22D3EE] border-[#14B8A6]/40 font-bold'
      };
    }
    if (strat === 'rule_nlp') {
      return {
        label: 'Baseline B: Context-Aware Rule NLP',
        color: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      };
    }
    return {
      label: 'Baseline A: Lexical Dictionary Lookup',
      color: 'bg-[#0A0F1C] text-[#94A3B8] border-[#1E293B]'
    };
  };

  if (!isAuthenticated || !isResearcher) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 text-center bg-[#0F172A] rounded-3xl border border-[#1E293B] space-y-4 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-[#22D3EE] mx-auto flex items-center justify-center">
          <BarChart2 className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-[#E2E8F0]">Researcher Authorization Required</h2>
        <p className="text-xs text-[#94A3B8] leading-relaxed">
          The Comparative Benchmark Dashboard and empirical evaluation metrics are restricted to academic researchers and administrators.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/login"
            className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-[#0A0F1C] rounded-xl text-xs font-bold shadow-lg shadow-teal-500/20 hover:from-teal-400 hover:to-cyan-400 transition-all text-center"
          >
            Sign In with Researcher Account
          </Link>
          <Link
            to="/"
            className="px-5 py-2.5 bg-[#1E293B] text-slate-300 hover:text-white rounded-xl text-xs font-semibold hover:bg-[#334155] transition-all text-center"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 text-[#E2E8F0]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#14B8A6] font-semibold text-xs tracking-wider uppercase">
            <BarChart2 className="w-4 h-4 text-[#22D3EE]" />
            <span>Research & Scientific Evaluation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Comparative Benchmark Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8]">
            Empirical evaluation of English-to-ASL intermediate representations on the verified core_asl_bench_v1 corpus.
          </p>
        </div>

        <button
          onClick={() => fetchEvaluationData(true)}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl bg-[#0F172A] border border-[#1E293B] text-[#CBD5E1] hover:text-white hover:border-[#14B8A6]/60 text-xs font-semibold flex items-center space-x-2 shadow-lg transition-all hover:scale-[1.02]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#14B8A6]' : ''}`} />
          <span>{isLoading ? 'Running Benchmark...' : 'Re-Run Evaluation Benchmark'}</span>
        </button>
      </div>

      {/* Primary Research Hypothesis */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#131D31] to-[#0A0F1C] border border-[#1E293B] text-white shadow-xl space-y-3">
        <div className="flex items-center space-x-2 text-[#22D3EE] text-xs font-bold uppercase tracking-wider">
          <Award className="w-4 h-4 text-[#14B8A6]" />
          <span>Core Research Hypothesis Under Evaluation</span>
        </div>
        <p className="text-sm sm:text-base font-medium leading-relaxed max-w-4xl text-[#E2E8F0]">
          &quot;Retrieval-grounded, context-aware processing improves the quality, grammatical fidelity, and reliability of English-to-ASL intermediate representations compared with a simple dictionary-based word-to-sign baseline.&quot;
        </p>
        <div className="text-[11px] text-[#94A3B8] pt-1 border-t border-[#1E293B]">
          Benchmark Dataset: <strong className="text-white">core_asl_bench_v1</strong> • Metric suite: Standard SacreBLEU Corpus BLEU (1, 2, 4), chrF++ (word-order 2), Empirical Vocabulary Coverage Rate, and Unsupported Token Frequency.
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 text-red-300 text-xs border border-red-800">
          {error}
        </div>
      )}

      {report && (
        <div className="space-y-8 animate-fade-in">
          {/* Comparative Metrics Table */}
          <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] overflow-hidden shadow-xl">
            <div className="p-4 bg-[#080C16] border-b border-[#1E293B] flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#22D3EE]">
                Empirical Performance Comparison Table
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#94A3B8]">
                  Evaluated at: {new Date(report.createdAt).toLocaleString()}
                </span>
                {report.metricEngine ? (
                  <span className="px-2.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono font-medium">
                    {report.metricEngine}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                    Legacy Approx
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0A0F1C] text-[#94A3B8] uppercase tracking-wider text-[10px] border-b border-[#1E293B]">
                  <tr>
                    <th className="py-3 px-4">Architecture Strategy</th>
                    <th className="py-3 px-4">Corpus BLEU-1</th>
                    <th className="py-3 px-4">Corpus BLEU-4 (SacreBLEU)</th>
                    <th className="py-3 px-4">Corpus chrF++ (SacreBLEU)</th>
                    <th className="py-3 px-4">Vocab Coverage</th>
                    <th className="py-3 px-4">Unsupported Rate</th>
                    <th className="py-3 px-4">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {report.results.map((r) => {
                    const badge = getStrategyBadge(r.strategy);
                    const isProposed = r.strategy === 'rag_grounded';
                    return (
                      <tr
                        key={r.strategy}
                        className={`transition-colors ${
                          isProposed ? 'bg-[#14B8A6]/10 font-semibold' : 'hover:bg-[#1E293B]/40'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-medium text-white">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#CBD5E1]">
                          {r.bleu_1.toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4 text-[#CBD5E1]">
                          <span className={isProposed ? 'text-[#22D3EE] font-bold' : ''}>
                            {r.bleu_4.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#CBD5E1]">
                          <span className={isProposed ? 'text-[#22D3EE] font-bold' : ''}>
                            {r.chrf_score.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#CBD5E1]">
                          {Math.round(r.vocabulary_coverage_rate * 100)}%
                        </td>
                        <td className="py-3.5 px-4 text-[#CBD5E1]">
                          {Math.round(r.unsupported_output_rate * 100)}%
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#94A3B8]">
                          {r.avg_latency_ms.toFixed(1)}ms
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-[#080C16] border-t border-[#1E293B] text-[11px] text-[#94A3B8]">
              <span className="font-semibold text-white">Methodology Notice: </span>
              Metrics are calculated using official <strong>SacreBLEU</strong> (Post, 2018; Popović, 2017 with word-order 2) micro-averaged across the 15-sentence benchmark corpus. Standard corpus-level BLEU-4 and chrF++ values reflect formal MT evaluation standards and are not directly interchangeable with earlier legacy v1 heuristic approximations.
            </div>
          </div>

          {/* Qualitative Analysis Snapshot */}
          <div className="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-2 shadow-lg">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#22D3EE] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#14B8A6]" />
              Automated Statistical Analysis
            </h4>
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              {report.summaryAnalysis}
            </p>
          </div>

          {/* Qualitative Sample Predictions Breakdown */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#14B8A6]" />
              Qualitative Sample Predictions on Gold-Standard Test Prompts
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.results
                .find(r => r.strategy === 'rag_grounded')
                ?.sample_outputs.map((sample) => (
                  <div
                    key={sample.id}
                    className="p-4 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-2.5 text-xs shadow-lg"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                      <span className="font-mono font-bold text-[#14B8A6]">{sample.id}</span>
                      <span>Sentence BLEU-1: {sample.bleu_1.toFixed(1)}% • chrF++: {sample.chrf.toFixed(1)}</span>
                    </div>

                    <div>
                      <span className="text-[#94A3B8] block font-medium">Input English:</span>
                      <span className="font-semibold text-white">&quot;{sample.english}&quot;</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#0A0F1C] border border-[#1E293B] space-y-1">
                      <div>
                        <span className="text-[#94A3B8] text-[10px] uppercase font-bold block">Gold ASL Reference:</span>
                        <span className="font-mono text-emerald-400 font-bold">{sample.reference}</span>
                      </div>
                      <div>
                        <span className="text-[#94A3B8] text-[10px] uppercase font-bold block">System C Output:</span>
                        <span className="font-mono text-[#22D3EE] font-bold">{sample.generated}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
