import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../state/useGameStore';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Undo2,
  Redo2,
  RotateCcw,
  Trash2,
  Clock,
  Gauge,
  Eye,
  Sliders,
} from 'lucide-react';

export const TacticalTimeline: React.FC = () => {
  const {
    timeline,
    history,
    isPlaying,
    playbackStep,
    uiPreferences,
    undo,
    redo,
    resetPositions,
    clearPlay,
    goToTimelineStep,
    togglePlayback,
    stepForward,
    stepBackward,
    setPlaybackSpeed,
    updateUIPreferences,
  } = useGameStore();

  const [resetToast, setResetToast] = useState(false);

  const handleResetPositions = () => {
    resetPositions();
    setResetToast(true);
    setTimeout(() => setResetToast(false), 2000);
  };

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // Auto playback ticker
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      const intervalMs = 1200 / uiPreferences.playbackSpeed;
      timer = setInterval(() => {
        const nextStep = playbackStep + 1;
        if (nextStep < timeline.length) {
          goToTimelineStep(nextStep);
        } else {
          togglePlayback();
        }
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackStep, timeline.length, uiPreferences.playbackSpeed, goToTimelineStep, togglePlayback]);

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 shadow-xl">
      {/* 1. Main Playback Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
        {/* Playback action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={stepBackward}
            disabled={timeline.length === 0 || playbackStep <= 0}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition"
            title="Bước trước (Previous Step)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlayback}
            disabled={timeline.length === 0}
            className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white font-semibold flex items-center gap-1.5 transition shadow"
            title={isPlaying ? "Tạm dừng (Pause)" : "Phát lại toàn bộ pha bóng (Play)"}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-white" />
                <span className="text-xs">Tạm dừng</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span className="text-xs">Phát lại</span>
              </>
            )}
          </button>

          <button
            onClick={stepForward}
            disabled={timeline.length === 0 || playbackStep >= timeline.length - 1}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition"
            title="Bước tiếp theo (Next Step)"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Speed Selector Pills (0.25x, 0.5x, 1x) */}
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-800 text-xs">
            <div className="flex items-center gap-1 text-slate-400 mr-0.5">
              <Gauge className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px] font-medium hidden sm:inline">Tốc độ:</span>
            </div>
            {[0.25, 0.5, 1].map((spd) => (
              <button
                key={spd}
                type="button"
                data-speed={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition border ${
                  uiPreferences.playbackSpeed === spd
                    ? 'bg-sky-600 border-sky-400 text-white shadow ring-1 ring-sky-400/40'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                }`}
                title={`Đặt tốc độ di chuyển ${spd}x`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Undo, Redo, Reset Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs text-slate-300 font-medium transition"
            title="Hoàn tác (Undo)"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>

          <button
            onClick={redo}
            disabled={!canRedo}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs text-slate-300 font-medium transition"
            title="Làm lại (Redo)"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span>Redo</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1"></div>

          <div className="relative">
            <button
              onClick={handleResetPositions}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-xs text-amber-300 font-medium border border-amber-600/30 transition"
              title="Đưa cầu thủ về vị trí đội hình ban đầu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset vị trí</span>
            </button>
            {resetToast && (
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px] shadow-lg whitespace-nowrap animate-bounce z-50">
                Đã reset!
              </span>
            )}
          </div>

          <button
            onClick={clearPlay}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-red-950/40 hover:bg-red-900/50 text-xs text-red-300 font-medium border border-red-800/40 transition"
            title="Xóa toàn bộ play và timeline"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Xóa play</span>
          </button>
        </div>

        {/* Tactical Overlays Toggles */}
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
            <input
              type="checkbox"
              checked={uiPreferences.showTacticalPaths}
              onChange={(e) =>
                updateUIPreferences({ showTacticalPaths: e.target.checked })
              }
              className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
            />
            <span>Đường chạy</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
            <input
              type="checkbox"
              checked={uiPreferences.showPassingLanes}
              onChange={(e) =>
                updateUIPreferences({ showPassingLanes: e.target.checked })
              }
              className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
            />
            <span>Passing Lanes</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
            <input
              type="checkbox"
              checked={uiPreferences.showZoneAreas}
              onChange={(e) =>
                updateUIPreferences({ showZoneAreas: e.target.checked })
              }
              className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
            />
            <span>Khu vực Zone</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
            <input
              type="checkbox"
              checked={uiPreferences.showSpacingGuide}
              onChange={(e) =>
                updateUIPreferences({ showSpacingGuide: e.target.checked })
              }
              className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
            />
            <span>Cảnh báo Spacing</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
            <input
              type="checkbox"
              checked={uiPreferences.showDefensiveShell}
              onChange={(e) =>
                updateUIPreferences({ showDefensiveShell: e.target.checked })
              }
              className="rounded bg-slate-800 border-slate-700 text-red-500 focus:ring-0"
            />
            <span className="text-red-300 font-medium">Khối phòng thủ (Shell)</span>
          </label>
        </div>
      </div>

      {/* 2. Timeline Steps Sequence */}
      <div className="flex items-center gap-2 overflow-x-auto py-1.5 min-h-[52px]">
        {timeline.length === 0 ? (
          <div className="flex items-center justify-center w-full py-2 text-xs text-slate-500 italic">
            Chưa có hành động nào được ghi nhận. Chọn cầu thủ tấn công và bấm thực hiện bài chạy để bắt đầu.
          </div>
        ) : (
          timeline.map((evt, idx) => {
            const isCurrent = playbackStep === idx;
            return (
              <button
                key={evt.id}
                onClick={() => goToTimelineStep(idx)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left shrink-0 transition ${
                  isCurrent
                    ? 'bg-sky-600/30 border-sky-400 text-white shadow-md'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300'
                }`}
                title={evt.description}
              >
                <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-900/80 text-sky-400 border border-slate-700">
                  {String(evt.stepNumber).padStart(2, '0')}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-200">
                    {evt.player} – {evt.action.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
                    {evt.targetPlayer ? `Tới ${evt.targetPlayer}` : evt.description}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
