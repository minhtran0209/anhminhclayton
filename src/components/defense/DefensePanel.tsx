import React from 'react';
import { useGameStore } from '../../state/useGameStore';
import {
  DefensiveSystem,
  ScreenPolicy,
} from '../../types/basketball';
import { DEFENSIVE_SYSTEMS, DEFENSE_DESCRIPTIONS } from '../../tactics/defense/defaults';
import { SLIDER_TOOLTIPS, POSITIONS } from '../../config/constants';
import { Shield, Info, HelpCircle, Network, Bot, Sparkles, BrainCircuit } from 'lucide-react';

export const DefensePanel: React.FC = () => {
  const {
    defense,
    defensiveSystem,
    defensiveSettings,
    uiPreferences,
    isDefenseSimulating,
    defenseCurrentThought,
    defenseCurrentTactic,
    defenseStats,
    startDefenseSimulation,
    stopDefenseSimulation,
    setDefensiveSystem,
    updateDefensiveSettings,
    updateUIPreferences,
  } = useGameStore();

  const isManToMan = defensiveSystem === 'Man-to-Man';

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 shadow-lg h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-red-500/20 text-red-400 rounded-md">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-red-400 uppercase">
              PHÒNG THỦ (DEFENSE)
            </h2>
            <p className="text-xs text-slate-400">Hệ thống & tham số vị trí</p>
          </div>
        </div>

        {/* Quick Toggle Defensive Shell */}
        <button
          onClick={() =>
            updateUIPreferences({ showDefensiveShell: !uiPreferences.showDefensiveShell })
          }
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
            uiPreferences.showDefensiveShell
              ? 'bg-red-600/30 border-red-500 text-red-200 shadow-sm'
              : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="Bật / Tắt vẽ đường nối khối đội hình phòng thủ (Defensive Shell)"
        >
          <Network className="w-3.5 h-3.5" />
          <span>Khối Shell: {uiPreferences.showDefensiveShell ? 'BẬT' : 'TẮT'}</span>
        </button>
      </div>

      {/* AI Autonomous Defense Simulation Card (User Request) */}
      <div
        className={`p-2.5 rounded-xl border transition shadow-sm ${
          isDefenseSimulating
            ? 'border-red-500/60 bg-red-950/40 text-white shadow-red-500/10'
            : 'border-slate-800 bg-slate-950/60 text-slate-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                isDefenseSimulating ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Bot className={`w-4 h-4 ${isDefenseSimulating ? 'animate-bounce text-red-400' : ''}`} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs flex items-center gap-1.5">
                <span>Giả Lập Phòng Thủ AI</span>
                {isDefenseSimulating && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-900 text-red-300 font-mono animate-pulse">
                    LIVE
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {isDefenseSimulating
                  ? `Chặn ${defenseStats.stopsCount}/${defenseStats.possessionsDefended} (Steals: ${defenseStats.stealsCount}, +${defenseStats.totalDefenseReward} pts)`
                  : 'AI tự học hỏi, bắt bài & tùy chỉnh đội hình'}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              if (isDefenseSimulating) {
                stopDefenseSimulation();
              } else {
                startDefenseSimulation();
              }
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition shrink-0 shadow-md flex items-center gap-1 active:scale-95 ${
              isDefenseSimulating
                ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                : 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white'
            }`}
            title="Kích hoạt AI tự động học hỏi, bắt bài và tùy chỉnh đội hình phòng thủ theo thời gian thực"
          >
            <span>{isDefenseSimulating ? 'DỪNG' : 'BẬT GIẢ LẬP'}</span>
          </button>
        </div>

        {/* Live Adaptation Status if Defense Simulating */}
        {isDefenseSimulating && (
          <div className="mt-2 pt-2 border-t border-red-900/40 flex flex-col gap-1 text-[11px]">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Tỉ lệ chặn (Stop rate):</span>
              <span className="font-bold text-emerald-400 font-mono">
                {defenseStats.possessionsDefended > 0
                  ? `${Math.round((defenseStats.stopsCount / defenseStats.possessionsDefended) * 100)}%`
                  : '0%'}
              </span>
            </div>
            {defenseCurrentTactic && (
              <div className="bg-red-950/80 px-2 py-1 rounded text-red-300 font-medium text-[10px] border border-red-800/60 truncate flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">{defenseCurrentTactic}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 1. Defensive System Selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span>Hệ thống phòng thủ</span>
          <span className="text-[11px] font-normal text-red-400">{defensiveSystem}</span>
        </label>

        <div className="grid grid-cols-2 gap-1.5">
          {DEFENSIVE_SYSTEMS.map((sys) => (
            <button
              key={sys}
              onClick={() => setDefensiveSystem(sys)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition border text-left ${
                defensiveSystem === sys
                  ? 'bg-red-600/30 border-red-500 text-red-200 shadow-sm'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300'
              }`}
            >
              {sys}
            </button>
          ))}
        </div>

        {/* System Description */}
        <p className="text-[11px] text-slate-400 italic bg-slate-950/50 p-2 rounded border border-slate-800/80">
          {DEFENSE_DESCRIPTIONS[defensiveSystem]}
        </p>
      </div>

      {/* 2. Screen Defense Policy (Visible for Man-to-Man) */}
      {isManToMan && (
        <div className="flex flex-col gap-2 border-t border-slate-800 pt-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              Screen Defense
              <span title={SLIDER_TOOLTIPS.screenPolicy}>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
              </span>
            </span>
            <span className="text-xs font-bold text-amber-400">
              {defensiveSettings.screenPolicy}
            </span>
          </label>

          <div className="grid grid-cols-3 gap-1.5">
            {(['Stay', 'Switch', 'Auto'] as ScreenPolicy[]).map((policy) => (
              <button
                key={policy}
                onClick={() => updateDefensiveSettings({ screenPolicy: policy })}
                className={`py-1.5 px-2 text-xs font-semibold rounded border transition text-center ${
                  defensiveSettings.screenPolicy === policy
                    ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                    : 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-300'
                }`}
              >
                {policy}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400">
            {defensiveSettings.screenPolicy === 'Stay'
              ? 'Giữ nguyên người kèm, cố vượt qua cản hoặc lùi nhẹ.'
              : defensiveSettings.screenPolicy === 'Switch'
              ? 'Đổi người kèm ngay lập tức khi đối phương set screen.'
              : 'Tự động tính toán đổi người khi screener áp sát cự ly gần.'}
          </p>
        </div>
      )}

      {/* 3. Mandatory Defensive Tactical Sliders (Immediate Live Preview) */}
      <div className="flex flex-col gap-3.5 border-t border-slate-800 pt-3">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Tham số chiến thuật (Live Preview)
        </label>

        {/* Height Slider */}
        <TacticalSlider
          label="Chiều cao đội hình"
          englishLabel="Defensive Height"
          value={defensiveSettings.height}
          tooltip={SLIDER_TOOLTIPS.height}
          onChange={(val) => updateDefensiveSettings({ height: val })}
        />

        {/* Width Slider */}
        <TacticalSlider
          label="Độ rộng đội hình"
          englishLabel="Defensive Width"
          value={defensiveSettings.width}
          tooltip={SLIDER_TOOLTIPS.width}
          onChange={(val) => updateDefensiveSettings({ width: val })}
        />

        {/* Compactness Slider */}
        <TacticalSlider
          label="Compactness"
          englishLabel="Spacing Density"
          value={defensiveSettings.compactness}
          tooltip={SLIDER_TOOLTIPS.compactness}
          onChange={(val) => updateDefensiveSettings({ compactness: val })}
        />

        {/* Pressure Slider */}
        <TacticalSlider
          label="Pressure"
          englishLabel="On-Ball Proximity"
          value={defensiveSettings.pressure}
          tooltip={SLIDER_TOOLTIPS.pressure}
          onChange={(val) => updateDefensiveSettings({ pressure: val })}
        />

        {/* Help Defense Slider */}
        <TacticalSlider
          label="Help Defense"
          englishLabel="Help Rotation"
          value={defensiveSettings.helpDefense}
          tooltip={SLIDER_TOOLTIPS.helpDefense}
          onChange={(val) => updateDefensiveSettings({ helpDefense: val })}
        />

        {/* Ball-side Shift Slider */}
        <TacticalSlider
          label="Ball-side Shift"
          englishLabel="Shell Overload"
          value={defensiveSettings.ballSideShift}
          tooltip={SLIDER_TOOLTIPS.ballSideShift}
          onChange={(val) => updateDefensiveSettings({ ballSideShift: val })}
        />

        {/* Optional Paint vs Perimeter Bias */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300 flex items-center gap-1">
              Ưu tiên phòng thủ
              <span title={SLIDER_TOOLTIPS.paintPerimeterBias}>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
              </span>
            </span>
            <span className="font-mono text-xs font-semibold text-red-400">
              {defensiveSettings.paintPerimeterBias < -15
                ? 'Bịt Sơn (Paint)'
                : defensiveSettings.paintPerimeterBias > 15
                ? 'Bịt 3P (Perimeter)'
                : 'Cân bằng'}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={defensiveSettings.paintPerimeterBias}
            onChange={(e) =>
              updateDefensiveSettings({ paintPerimeterBias: Number(e.target.value) })
            }
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            aria-label="Ưu tiên phòng thủ"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Bảo vệ rổ (Paint)</span>
            <span>Bảo vệ ném xa (3P)</span>
          </div>
        </div>
      </div>

      {/* 4. Live Defensive Explanation Feedback */}
      <div className="flex flex-col gap-1.5 border-t border-slate-800 pt-3">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span>Phản ứng phòng thủ</span>
          <span className="text-[10px] text-slate-400 font-normal">Giải thích vị trí</span>
        </label>

        <div className="flex flex-col gap-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 text-xs">
          {POSITIONS.map((pos) => {
            const def = defense[pos];
            return (
              <div key={pos} className="flex items-start gap-1.5 text-[11px] py-0.5 border-b border-slate-800/40 last:border-0">
                <span className="font-bold text-red-400 font-mono w-6 shrink-0">{pos}:</span>
                <span className="text-slate-300">{def.explanation || 'Giữ cự ly phòng thủ cơ bản'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const TacticalSlider: React.FC<{
  label: string;
  englishLabel: string;
  value: number;
  tooltip: string;
  onChange: (value: number) => void;
}> = ({ label, englishLabel, value, tooltip, onChange }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-1">
        <span className="font-medium text-slate-200">{label}</span>
        <span title={tooltip} className="cursor-help">
          <HelpCircle className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
        </span>
      </div>
      <span className="font-mono text-xs font-bold text-red-400">{value}</span>
    </div>
    <input
      type="range"
      min="0"
      max="100"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
      aria-label={label}
    />
  </div>
);
