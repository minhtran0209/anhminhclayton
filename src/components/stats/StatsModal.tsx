import React, { useState } from 'react';
import { useGameStore } from '../../state/useGameStore';
import { OFFENSIVE_PLAYBOOK } from '../../tactics/offense/playbook';
import {
  Trophy,
  Shield,
  Zap,
  BarChart3,
  Target,
  Flame,
  RotateCcw,
  CheckCircle2,
  XCircle,
  X,
  TrendingUp,
  BookOpen,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Play,
} from 'lucide-react';

export const StatsModal: React.FC = () => {
  const {
    isStatsModalOpen,
    closeStatsModal,
    resetStats,
    aiStats,
    defenseStats,
    defensiveSystem,
    currentFormation,
    setSelectedPlayId,
    startSimulation,
    isSimulating,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'playbook' | 'history'>('overview');
  const [selectedPlayPreview, setSelectedPlayPreview] = useState<string | null>(null);

  if (!isStatsModalOpen) return null;

  // Offense calculations
  const offPossessions = aiStats.possessionsCount || 0;
  const offWins = aiStats.winsCount || 0;
  const offWinRate = offPossessions > 0 ? Math.round((offWins / offPossessions) * 100) : 0;
  const offPoints = aiStats.pointsScored || 0;
  const threeAtt = aiStats.threePointersAttempted || 0;
  const threeMade = aiStats.threePointersMade || 0;
  const threePct = threeAtt > 0 ? Math.round((threeMade / threeAtt) * 100) : 0;
  const twoAtt = aiStats.twoPointersAttempted || 0;
  const twoMade = aiStats.twoPointersMade || 0;
  const twoPct = twoAtt > 0 ? Math.round((twoMade / twoAtt) * 100) : 0;
  const totalFGA = threeAtt + twoAtt;
  const totalFGM = threeMade + twoMade;
  const fgPct = totalFGA > 0 ? Math.round((totalFGM / totalFGA) * 100) : 0;
  const turnovers = aiStats.turnoversCount || 0;

  // Defense calculations
  const defPossessions = defenseStats.possessionsDefended || 0;
  const defStops = defenseStats.stopsCount || 0;
  const defStopRate = defPossessions > 0 ? Math.round((defStops / defPossessions) * 100) : 0;
  const defSteals = defenseStats.stealsCount || 0;
  const defPointsConceded = defenseStats.pointsConceded || 0;
  const ppp = defPossessions > 0 ? (defPointsConceded / defPossessions).toFixed(2) : '0.00';

  const selectedPlay = OFFENSIVE_PLAYBOOK.find((p) => p.id === (selectedPlayPreview || aiStats.selectedPlayId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-wide text-white flex items-center gap-2">
                <span>BẢNG THỐNG KÊ CHIẾN THUẬT & ĐIỂM SỐ</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 font-mono border border-indigo-700/50">
                  REAL-TIME STATS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Hiệu suất AI Tấn Công ({currentFormation}) vs AI Phòng Thủ ({defensiveSystem})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (window.confirm('Bạn có chắc muốn đặt lại tất cả chỉ số thống kê về 0?')) {
                  resetStats();
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition active:scale-95"
              title="Đặt lại tất cả chỉ số"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đặt lại</span>
            </button>
            <button
              onClick={closeStatsModal}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition"
              title="Đóng bảng thống kê"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 py-2 border-b border-slate-800/80 bg-slate-950/40 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Đối Đầu Tổng Quan</span>
          </button>

          <button
            onClick={() => setActiveTab('playbook')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'playbook'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Playbook (10 Bài Đánh Đỉnh Cao)</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Nhật Ký Các Đợt Bóng ({aiStats.historyLog.length})</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'overview' && (
            <>
              {/* Head-to-Head Scoreboard */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Offense Card */}
                <div className="p-4 rounded-xl border border-sky-500/40 bg-gradient-to-br from-sky-950/40 to-slate-900 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                    <Zap className="w-24 h-24 text-sky-400" />
                  </div>
                  <div className="flex items-center justify-between border-b border-sky-800/50 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-sky-500 shadow-sm shadow-sky-500/50"></div>
                      <span className="font-extrabold text-sm text-sky-300 uppercase tracking-wide">
                        BÊN TẤN CÔNG (OFFENSE AI)
                      </span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-sky-900/60 text-sky-200 font-mono border border-sky-700/60">
                      +{aiStats.totalReward} Pts
                    </span>
                  </div>

                  {/* Primary Score */}
                  <div className="flex items-baseline justify-between mb-4">
                    <div>
                      <div className="text-3xl font-black text-white font-mono">{offPoints}</div>
                      <div className="text-[11px] text-slate-400">Tổng điểm ghi được</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-sky-400 font-mono">
                        {offWins} / {offPossessions}
                      </div>
                      <div className="text-[11px] text-slate-400">Số đợt thắng ({offWinRate}%)</div>
                    </div>
                  </div>

                  {/* Shooting Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-sky-900/40 text-center">
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">Hiệu suất FG%</div>
                      <div className="text-sm font-bold text-white font-mono">{fgPct}%</div>
                      <div className="text-[10px] text-slate-400">
                        {totalFGM}/{totalFGA}
                      </div>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">Ném 3P%</div>
                      <div className="text-sm font-bold text-emerald-400 font-mono">{threePct}%</div>
                      <div className="text-[10px] text-slate-400">
                        {threeMade}/{threeAtt}
                      </div>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">Cận thành 2P%</div>
                      <div className="text-sm font-bold text-amber-300 font-mono">{twoPct}%</div>
                      <div className="text-[10px] text-slate-400">
                        {twoMade}/{twoAtt}
                      </div>
                    </div>
                  </div>

                  {/* Playbook setting info */}
                  <div className="mt-3 text-xs bg-sky-950/30 p-2 rounded-lg border border-sky-900/50 flex items-center justify-between">
                    <span className="text-slate-300">Bài đánh đang chọn:</span>
                    <span className="font-semibold text-sky-300">
                      {aiStats.selectedPlayId === 'auto' || !aiStats.selectedPlayId
                        ? '🤖 AI Tự Động (Auto-Adapt)'
                        : OFFENSIVE_PLAYBOOK.find((p) => p.id === aiStats.selectedPlayId)?.vietnameseName ||
                          aiStats.selectedPlayId}
                    </span>
                  </div>
                </div>

                {/* Defense Card */}
                <div className="p-4 rounded-xl border border-rose-500/40 bg-gradient-to-br from-rose-950/40 to-slate-900 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                    <Shield className="w-24 h-24 text-rose-400" />
                  </div>
                  <div className="flex items-center justify-between border-b border-rose-800/50 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></div>
                      <span className="font-extrabold text-sm text-rose-300 uppercase tracking-wide">
                        BÊN PHÒNG THỦ (DEFENSE AI)
                      </span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-rose-900/60 text-rose-200 font-mono border border-rose-700/60">
                      +{defenseStats.totalDefenseReward} Pts
                    </span>
                  </div>

                  {/* Primary Score */}
                  <div className="flex items-baseline justify-between mb-4">
                    <div>
                      <div className="text-3xl font-black text-rose-400 font-mono">{defStops}</div>
                      <div className="text-[11px] text-slate-400">
                        Số lần chặn thành công ({defStopRate}%)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-white font-mono">
                        {defPossessions}
                      </div>
                      <div className="text-[11px] text-slate-400">Số đợt phòng thủ</div>
                    </div>
                  </div>

                  {/* Defense Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-rose-900/40 text-center">
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">Cướp bóng (Steals)</div>
                      <div className="text-sm font-bold text-amber-400 font-mono">{defSteals}</div>
                      <div className="text-[10px] text-slate-400">
                        {defPossessions > 0 ? Math.round((defSteals / defPossessions) * 100) : 0}% tỉ lệ
                      </div>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">Điểm thủng rổ</div>
                      <div className="text-sm font-bold text-rose-300 font-mono">{defPointsConceded}</div>
                      <div className="text-[10px] text-slate-400">Conceded</div>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">Điểm/Đợt (PPP)</div>
                      <div className="text-sm font-bold text-cyan-300 font-mono">{ppp}</div>
                      <div className="text-[10px] text-slate-400">Pts/Possession</div>
                    </div>
                  </div>

                  {/* Defense System Info */}
                  <div className="mt-3 text-xs bg-rose-950/30 p-2 rounded-lg border border-rose-900/50 flex items-center justify-between">
                    <span className="text-slate-300">Hệ thống phòng thủ:</span>
                    <span className="font-semibold text-rose-300">{defensiveSystem}</span>
                  </div>
                </div>
              </div>

              {/* Tactical Balance Analysis Bar */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="text-sky-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    Tỉ Lệ Thắng Tấn Công: {offWinRate}%
                  </span>
                  <span className="text-rose-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Tỉ Lệ Chặn Phòng Thủ: {defStopRate}%
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${Math.max(offWinRate, 5)}%` }}
                  ></div>
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-500"
                    style={{ width: `${Math.max(defStopRate, 5)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
                  <span>Tổng điểm TC: +{offPoints}đ ({offPossessions} đợt)</span>
                  <span>Mất bóng: {turnovers} lần | Cướp bóng: {defSteals} lần</span>
                </div>
              </div>
            </>
          )}

          {activeTab === 'playbook' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <span>AI PLAYBOOK: 10 BÀI ĐÁNH ĐỈNH CAO (HIGH-EFFICIENCY SETS)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Các bài chạy chuẩn NBA/EuroLeague với micro-triggers (DHO, Flare, Elevator, Spain PnR)
                  </p>
                </div>
                <div className="text-xs">
                  <span className="text-slate-400">Đang chọn: </span>
                  <span className="font-bold text-indigo-300">
                    {aiStats.selectedPlayId === 'auto' || !aiStats.selectedPlayId
                      ? '🤖 AI Tự Chọn (Auto-Adapt)'
                      : OFFENSIVE_PLAYBOOK.find((p) => p.id === aiStats.selectedPlayId)?.vietnameseName}
                  </span>
                </div>
              </div>

              {/* 10 Plays List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Auto Option */}
                <div
                  onClick={() => setSelectedPlayId('auto')}
                  className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    aiStats.selectedPlayId === 'auto' || !aiStats.selectedPlayId
                      ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-md'
                      : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-xs">AI Tự Chọn Khắc Chế (Auto-Adapt)</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-200 font-mono">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    AI tự động đọc sơ đồ phòng thủ của đối phương ({defensiveSystem}) để tự chọn bài đánh có tỉ lệ khắc chế cao nhất.
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400 font-semibold">Tự thích ứng 100%</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlayId('auto');
                      }}
                      className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold"
                    >
                      KÍCH HOẠT
                    </button>
                  </div>
                </div>

                {/* 10 Tactical Plays */}
                {OFFENSIVE_PLAYBOOK.map((play, idx) => {
                  const isSelected = aiStats.selectedPlayId === play.id;
                  return (
                    <div
                      key={play.id}
                      onClick={() => setSelectedPlayPreview(play.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                        isSelected
                          ? 'border-sky-500 bg-sky-950/40 text-white shadow-md ring-1 ring-sky-500/50'
                          : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/40 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-bold font-mono text-[10px] flex items-center justify-center border border-slate-700">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-xs text-white">{play.vietnameseName}</span>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                            ~{play.expectedWinRate}% Win
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                          {play.description}
                        </div>

                        <div className="text-[10px] text-amber-300/90 font-medium">
                          🎯 Khắc chế: {play.bestAgainst}
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                        <span className="text-[10px] text-slate-400 font-mono">Đội hình: {play.formation}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlayId(play.id);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition active:scale-95 ${
                            isSelected
                              ? 'bg-sky-500 text-white shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          {isSelected ? '✓ ĐANG CHỌN' : 'CHỌN BÀI'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Play Details Modal Drawer */}
              {selectedPlay && (
                <div className="p-4 rounded-xl border border-indigo-500/50 bg-indigo-950/30 mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-400" />
                      <span>Chi Tiết Micro-Triggers: {selectedPlay.vietnameseName}</span>
                    </h4>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Tỉ lệ thắng kỳ vọng: ~{selectedPlay.expectedWinRate}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">{selectedPlay.description}</p>

                  <div className="space-y-1.5 pt-2">
                    <div className="text-xs font-bold text-amber-300">5 Nhịp Chuỗi Hành Động (Triggers):</div>
                    {selectedPlay.steps.map((st) => (
                      <div
                        key={st.step}
                        className="flex items-start gap-2 text-xs bg-slate-900/80 p-2 rounded border border-slate-800"
                      >
                        <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {st.step}
                        </span>
                        <div className="flex-1">
                          <span className="font-semibold text-white mr-1.5">
                            [{st.player} - {st.action.toUpperCase()}]:
                          </span>
                          <span className="text-slate-300">{st.triggerDescription}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlayId(selectedPlay.id);
                        closeStatsModal();
                        if (!isSimulating) {
                          startSimulation();
                        }
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Kích Hoạt & Chạy Giả Lập Ngay</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>LỊCH SỬ CÁC ĐỢT TẤN CÔNG GẦN ĐÂY</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {aiStats.historyLog.length} đợt bóng đã ghi nhận
                </span>
              </div>

              {aiStats.historyLog.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800 text-xs">
                  Chưa có đợt tấn công nào được giả lập. Hãy nhấn nút "Giả Lập Tấn Công" hoặc "Giả Lập Phòng Thủ" trên thanh Header để bắt đầu!
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
                  {aiStats.historyLog.map((log, idx) => (
                    <div
                      key={log.id || idx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                        log.isWin
                          ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-100'
                          : log.isSteal
                          ? 'border-amber-500/40 bg-amber-950/20 text-amber-100'
                          : 'border-rose-500/40 bg-rose-950/20 text-rose-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {log.isWin ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : log.isSteal ? (
                          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <div className="font-bold flex items-center gap-1.5">
                            <span>{log.isWin ? '🎯 TẤN CÔNG THẮNG' : log.isSteal ? '⚡ BỊ CƯỚP BÓNG' : '❌ HÀNG THỦ CHẶN'}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-normal">#{aiStats.historyLog.length - idx}</span>
                          </div>
                          <div className="text-[11px] text-slate-300 truncate">{log.summary}</div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono font-bold text-xs">
                        <span className={log.reward > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {log.reward > 0 ? `+${log.reward}` : log.reward} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Basketball Tactical Lab AI Engine</span>
            <span>•</span>
            <span className="text-indigo-400 font-medium">10 High-Efficiency Playbook Active</span>
          </div>
          <button
            onClick={closeStatsModal}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
