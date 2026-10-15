import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../state/useGameStore';
import {
  Shield,
  Award,
  Zap,
  CheckCircle2,
  X,
  Play,
  TrendingUp,
  BrainCircuit,
  Minimize2,
  Maximize2,
  Sparkles,
} from 'lucide-react';

export const DefenseStopAnalysisModal: React.FC = () => {
  const {
    defenseStats,
    dismissDefenseStopAnalysis,
    pauseSimulation,
    isDefenseSimulating,
  } = useGameStore();

  const analysis = defenseStats.latestStopAnalysis;
  const [timeLeft, setTimeLeft] = useState(6);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  // Auto advance timer
  useEffect(() => {
    if (!analysis || !autoAdvanceEnabled || !isDefenseSimulating) return;

    setTimeLeft(6);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          dismissDefenseStopAnalysis();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [analysis, autoAdvanceEnabled, isDefenseSimulating, dismissDefenseStopAnalysis]);

  if (!analysis) return null;

  // Minimized floating banner in corner
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/95 border-2 border-emerald-500 shadow-2xl backdrop-blur-md text-white text-xs">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-[11px] text-emerald-300 truncate max-w-[240px]">
              AI Phòng Thủ Thắng: {analysis.title}
            </span>
            <span className="text-[10px] text-slate-300">
              +{analysis.reward} pts | {analysis.systemUsed}
              {autoAdvanceEnabled && ` (Lượt mới sau ${timeLeft}s)`}
            </span>
          </div>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 rounded transition ml-1"
            title="Mở rộng bảng phân tích"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={dismissDefenseStopAnalysis}
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
      <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col my-auto border-t-emerald-400">
        {/* Header with defense celebration banner */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-emerald-700 p-4 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-emerald-300 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200 flex items-center gap-1">
                  <BrainCircuit className="w-3.5 h-3.5" /> PHÒNG THỦ BẮT BÀI THÀNH CÔNG
                </span>
                <h3 className="font-extrabold text-lg tracking-tight leading-snug">
                  {analysis.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-emerald-200 hover:text-white transition"
                title="Thu nhỏ modal để xem toàn bộ sân"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={dismissDefenseStopAnalysis}
                className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition"
                title="Đóng modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reward Pill Banner */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1 bg-black/40 rounded-full border border-emerald-400/40 flex items-center gap-1.5 text-xs font-bold text-emerald-300">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Thưởng Phòng Thủ: +{analysis.reward} pts</span>
            </div>
            <div className="px-2.5 py-1 bg-black/30 rounded-full border border-white/20 text-xs font-medium text-slate-200">
              Hệ thống: {analysis.systemUsed}
            </div>
            {analysis.isSteal && (
              <div className="px-2.5 py-1 bg-emerald-950/80 rounded-full border border-emerald-500 text-xs font-bold text-emerald-300 animate-pulse">
                ⚡ CƯỚP BÓNG (STEAL)
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 text-xs">
          {/* Tactical Explanation */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-1.5">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chiến Thuật Bắt Bài Đối Thủ</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-xs">
              {analysis.explanation}
            </p>
          </div>

          {/* Key Defensive Moves Breakdown */}
          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Phân Tích Các Yếu Tố Khắc Chế Cốt Lõi</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {analysis.keyDefenseMoves.map((move, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{move}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Settings Snapshot */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/70 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Tham Số Phòng Thủ AI Đã Tự Tùy Chỉnh
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                <span className="text-slate-400 block text-[9px]">Hệ thống</span>
                <span className="font-bold text-emerald-400">{analysis.systemUsed}</span>
              </div>
              <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                <span className="text-slate-400 block text-[9px]">Áp lực (Pressure)</span>
                <span className="font-bold text-amber-400">{analysis.settingsAdjusted.pressure}%</span>
              </div>
              <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                <span className="text-slate-400 block text-[9px]">Compactness</span>
                <span className="font-bold text-sky-400">{analysis.settingsAdjusted.compactness}%</span>
              </div>
              <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                <span className="text-slate-400 block text-[9px]">Screen Policy</span>
                <span className="font-bold text-purple-400">{analysis.settingsAdjusted.screenPolicy}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer with Auto-Advance Timer & Controls */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoAdvanceDefense"
              checked={autoAdvanceEnabled}
              onChange={(e) => setAutoAdvanceEnabled(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="autoAdvanceDefense" className="text-slate-400 select-none cursor-pointer">
              Tự động sang đợt mới {autoAdvanceEnabled && `(${timeLeft}s)`}
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition"
            >
              Thu nhỏ
            </button>
            <button
              onClick={dismissDefenseStopAnalysis}
              className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg transition shadow-md flex items-center gap-1.5"
            >
              <span>Đợt Tiếp Theo</span>
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
