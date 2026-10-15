import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../state/useGameStore';
import {
  Trophy,
  Award,
  ShieldAlert,
  Zap,
  CheckCircle2,
  X,
  Play,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  Eye,
  Minimize2,
  Maximize2,
} from 'lucide-react';

export const AIWinAnalysisModal: React.FC = () => {
  const {
    aiStats,
    dismissWinAnalysis,
    pauseSimulation,
    isSimulating,
  } = useGameStore();

  const analysis = aiStats.latestWinAnalysis;
  const [timeLeft, setTimeLeft] = useState(6);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  // Auto advance timer
  useEffect(() => {
    if (!analysis || !autoAdvanceEnabled || !isSimulating) return;

    setTimeLeft(6);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          dismissWinAnalysis();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [analysis, autoAdvanceEnabled, isSimulating, dismissWinAnalysis]);

  if (!analysis) return null;

  // Minimized floating banner in corner
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/95 border-2 border-amber-500 shadow-2xl backdrop-blur-md text-white text-xs">
          <Trophy className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-[11px] text-amber-300 truncate max-w-[220px]">
              AI Thắng: {analysis.title}
            </span>
            <span className="text-[10px] text-slate-300">
              +{analysis.reward} pts | +{analysis.pointsEarned}đ
              {autoAdvanceEnabled && ` (Lượt mới sau ${timeLeft}s)`}
            </span>
          </div>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 hover:bg-slate-800 text-sky-400 hover:text-sky-300 rounded transition ml-1"
            title="Mở rộng bảng phân tích"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={dismissWinAnalysis}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
            title="Đóng thông báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col my-auto border-t-amber-400">
        {/* Header with celebration banner */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-700 p-4 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <Trophy className="w-6 h-6 text-yellow-300 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-200 flex items-center gap-1">
                  <BrainCircuit className="w-3.5 h-3.5" /> AI CHIẾN THẮNG & PHÁ VỠ HÀNG THỦ
                </span>
                <h3 className="font-extrabold text-lg text-white leading-tight">
                  {analysis.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
                title="Thu nhỏ thông báo"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={dismissWinAnalysis}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
                title="Đóng bảng phân tích"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Reward Badges Bar */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-md">
              <Award className="w-4 h-4 fill-current text-slate-950" />
              <span>+{analysis.reward} PTS THƯỞNG CHO AI</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>+{analysis.pointsEarned} ĐIỂM (Cú ném thành công)</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 text-sky-200 border border-sky-500/40 text-xs font-semibold">
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              <span>Cự ly kèm: {analysis.contestDistance}m (Thoáng)</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs text-slate-200 overflow-y-auto max-h-[65vh]">
          {/* Executive Summary */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Tóm tắt tình huống
            </h4>
            <p className="text-slate-200 leading-relaxed font-medium">
              {analysis.summary}
            </p>
          </div>

          {/* Deep Tactical Cause Breakdown */}
          <div className="bg-slate-800/50 border border-sky-900/50 rounded-xl p-3.5 space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Nguyên nhân dẫn đến chiến thắng của AI
            </h4>
            <p className="text-slate-300 leading-relaxed">
              {analysis.explanation}
            </p>
          </div>

          {/* Defensive System Vulnerability */}
          <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-3.5 space-y-1.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> Điểm yếu hàng thủ ({analysis.defensiveSystem}) bị khai thác
            </h4>
            <p className="text-slate-300 leading-relaxed">
              {analysis.defensiveBreakdown}
            </p>
          </div>

          {/* Key Tactical Badges */}
          {analysis.keyTactics.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Các mảng miếng chiến thuật then chốt:
              </span>
              <div className="flex flex-wrap gap-2">
                {analysis.keyTactics.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md bg-indigo-950/90 text-indigo-300 border border-indigo-700/60 font-semibold text-[11px] shadow-sm flex items-center gap-1"
                  >
                    <span>✓</span> {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Auto Advance Toggle & Countdown */}
          <div className="flex items-center gap-2 text-xs text-slate-400 w-full sm:w-auto justify-between sm:justify-start">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoAdvanceEnabled}
                onChange={(e) => setAutoAdvanceEnabled(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
              />
              <span className="text-[11px]">Tự động tiếp tục</span>
            </label>
            {autoAdvanceEnabled && (
              <span className="text-[11px] font-mono text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/60">
                Lượt mới sau {timeLeft}s
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                pauseSimulation();
                dismissWinAnalysis();
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
            >
              Tạm dừng xem lại
            </button>

            <button
              onClick={dismissWinAnalysis}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/30 transition active:scale-95"
            >
              <span>Lượt tiếp theo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
