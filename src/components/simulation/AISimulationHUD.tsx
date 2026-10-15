import React from 'react';
import { useGameStore } from '../../state/useGameStore';
import {
  Bot,
  Play,
  Pause,
  SkipForward,
  Square,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';

export const AISimulationHUD: React.FC = () => {
  const {
    isSimulating,
    isSimulationPaused,
    aiCurrentThought,
    aiCurrentTactic,
    aiStats,
    selectedPlayer,
    ballHolder,
    pauseSimulation,
    resumeSimulation,
    runNextAIPossession,
    stopSimulation,

    // Defense Simulation State
    isDefenseSimulating,
    isDefenseSimulationPaused,
    defenseCurrentThought,
    defenseCurrentTactic,
    defenseStats,
    defensiveSystem,
    pauseDefenseSimulation,
    resumeDefenseSimulation,
    runNextDefensePossession,
    stopDefenseSimulation,
  } = useGameStore();

  if (!isSimulating && !isDefenseSimulating) return null;

  const isDefMode = isDefenseSimulating;

  const winRate =
    aiStats.possessionsCount > 0
      ? Math.round((aiStats.winsCount / aiStats.possessionsCount) * 100)
      : 0;

  const stopRate =
    defenseStats.possessionsDefended > 0
      ? Math.round((defenseStats.stopsCount / defenseStats.possessionsDefended) * 100)
      : 0;

  return (
    <div className="absolute top-2 left-2 right-2 z-30 flex flex-col gap-1.5 pointer-events-none">
      {/* Top Main Status Bar */}
      <div
        className={`pointer-events-auto bg-slate-900/95 backdrop-blur-md shadow-2xl rounded-xl p-2.5 text-white flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300 border ${
          isDefMode ? 'border-red-500/60 shadow-red-500/10' : 'border-sky-500/50 shadow-sky-500/10'
        }`}
      >
        {/* Row 1: AI Branding, Status Badges & Controls */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: AI Avatar & Badges */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative shrink-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-lg ${
                  isDefMode
                    ? 'bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 shadow-red-500/30'
                    : 'bg-gradient-to-tr from-sky-600 via-indigo-600 to-emerald-500 shadow-sky-500/30'
                }`}
              >
                {isDefMode ? <Shield className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span
                className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 ${
                  isDefMode ? 'text-red-400' : 'text-sky-400'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                {isDefMode ? 'AI Phòng Thủ Tự Học' : 'AI Giả Lập Tấn Công'}
              </span>

              {isDefMode ? (
                <>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-700/60 truncate max-w-[180px]">
                    {defenseCurrentTactic || defensiveSystem}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                    Hệ thống: {defensiveSystem}
                  </span>
                </>
              ) : (
                <>
                  {aiCurrentTactic && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-700/60 truncate max-w-[140px]">
                      {aiCurrentTactic}
                    </span>
                  )}
                  {selectedPlayer && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 shrink-0">
                      {selectedPlayer} {selectedPlayer === ballHolder ? '(Bóng)' : ''}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {isDefMode ? (
              // Defense Controls
              <>
                {isDefenseSimulationPaused ? (
                  <button
                    onClick={resumeDefenseSimulation}
                    className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition active:scale-95"
                    title="Tiếp tục mô phỏng"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span className="text-[11px]">Tiếp tục</span>
                  </button>
                ) : (
                  <button
                    onClick={pauseDefenseSimulation}
                    className="flex items-center gap-1 px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow transition active:scale-95"
                    title="Tạm dừng mô phỏng"
                  >
                    <Pause className="w-3 h-3" />
                    <span className="text-[11px]">Tạm dừng</span>
                  </button>
                )}

                <button
                  onClick={() => runNextDefensePossession()}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-medium transition active:scale-95"
                  title="Đổi bài / Chạy đợt mới"
                >
                  <SkipForward className="w-3 h-3" />
                  <span>Lượt mới</span>
                </button>

                <button
                  onClick={stopDefenseSimulation}
                  className="flex items-center gap-1 px-2 py-1 bg-rose-600/90 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold shadow transition active:scale-95"
                  title="Thoát chế độ mô phỏng phòng thủ"
                >
                  <Square className="w-2.5 h-2.5 fill-current" />
                  <span>Dừng</span>
                </button>
              </>
            ) : (
              // Offense Controls
              <>
                {isSimulationPaused ? (
                  <button
                    onClick={resumeSimulation}
                    className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition active:scale-95"
                    title="Tiếp tục mô phỏng"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span className="text-[11px]">Tiếp tục</span>
                  </button>
                ) : (
                  <button
                    onClick={pauseSimulation}
                    className="flex items-center gap-1 px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow transition active:scale-95"
                    title="Tạm dừng mô phỏng"
                  >
                    <Pause className="w-3 h-3" />
                    <span className="text-[11px]">Tạm dừng</span>
                  </button>
                )}

                <button
                  onClick={() => runNextAIPossession()}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-medium transition active:scale-95"
                  title="Đổi bài / Chạy đợt mới"
                >
                  <SkipForward className="w-3 h-3" />
                  <span>Lượt mới</span>
                </button>

                <button
                  onClick={stopSimulation}
                  className="flex items-center gap-1 px-2 py-1 bg-rose-600/90 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold shadow transition active:scale-95"
                  title="Thoát chế độ mô phỏng AI"
                >
                  <Square className="w-2.5 h-2.5 fill-current" />
                  <span>Dừng</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Row 2: Live AI Thought & Live Scoreboard */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
          {/* Live Thought */}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-200 font-medium truncate" title={isDefMode ? defenseCurrentThought : aiCurrentThought}>
              {isDefMode
                ? (defenseCurrentThought || '🛡️ AI phòng thủ đang quan sát cự ly, phân tích và bắt bài đối phương...')
                : `💭 ${aiCurrentThought || 'AI đang quan sát và tìm điểm hở trong cự ly đội hình đối phương...'}`}
            </p>
          </div>

          {/* Scoreboard Chips */}
          {isDefMode ? (
            <div className="flex items-center gap-2 px-2 py-1 bg-slate-950/80 rounded-lg border border-slate-800 shrink-0 text-[11px]">
              <span className="text-slate-400">
                Đợt: <strong className="text-white font-mono">{defenseStats.possessionsDefended}</strong>
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-slate-400">
                Chặn (Stops): <strong className="text-emerald-400 font-mono">{defenseStats.stopsCount}</strong> ({stopRate}%)
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-amber-400">
                Steals: <strong className="font-mono text-amber-300">{defenseStats.stealsCount}</strong>
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-rose-400">
                Điểm thua: <strong className="font-mono text-rose-300">{defenseStats.pointsConceded}đ</strong>
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-emerald-400 font-bold font-mono">
                +{defenseStats.totalDefenseReward} pts
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2 py-1 bg-slate-950/80 rounded-lg border border-slate-800 shrink-0 text-[11px]">
              <span className="text-slate-400">
                Đợt: <strong className="text-white font-mono">{aiStats.possessionsCount}</strong>
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-slate-400">
                Thắng: <strong className="text-emerald-400 font-mono">{aiStats.winsCount}</strong> ({winRate}%)
              </span>
              {aiStats.turnoversCount !== undefined && aiStats.turnoversCount > 0 && (
                <>
                  <span className="text-slate-700">|</span>
                  <span className="text-rose-400">
                    Mất bóng: <strong className="font-mono text-rose-300">{aiStats.turnoversCount}</strong>
                  </span>
                </>
              )}
              <span className="text-slate-700">|</span>
              <span className="text-amber-400 font-bold font-mono">
                +{aiStats.totalReward} pts
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

