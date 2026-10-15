import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useGameStore } from '../../state/useGameStore';
import { CourtLines } from './CourtLines';
import { PlayerMarker } from './PlayerMarker';
import { TacticalPath } from './TacticalPath';
import { PassingLanesOverlay } from './PassingLanesOverlay';
import { ZoneOverlay } from './ZoneOverlay';
import { DefensiveShellOverlay } from './DefensiveShellOverlay';
import { PremoveQueueOverlay } from './PremoveQueueOverlay';
import { calculateSpacingIssues, clampPoint, screenToCourt } from '../../engine/geometry/courtGeometry';
import { Position, Point, ShotResult } from '../../types/basketball';
import { POSITIONS } from '../../config/constants';
import { Check, X, AlertTriangle, Gauge, Zap, Play, Undo2, Minimize2, Maximize2 } from 'lucide-react';
import { AISimulationHUD, AIWinAnalysisModal, DefenseStopAnalysisModal } from '../simulation';
import { StatsModal } from '../stats';

export const BasketballCourt: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const {
    offense,
    defense,
    ballHolder,
    selectedPlayer,
    activeScreen,
    actionDraft,
    timeline,
    uiPreferences,
    isPremoveMode,
    premoveQueue,
    isExecutingPremove,
    isSimulating,
    selectPlayer,
    updateCustomPlayerCoord,
    addDraftPoint,
    startDraft,
    confirmDraft,
    cancelDraft,
    setPlaybackSpeed,
    togglePremoveMode,
    undoLastPremove,
    executePremoveQueue,
  } = useGameStore();

  const [draggingPlayer, setDraggingPlayer] = useState<Position | null>(null);
  const dragPendingRef = useRef<{ pos: Position; startX: number; startY: number; moved: boolean } | null>(null);

  // Dragging handling: do not move player on simple click, require 5px movement
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, pos: Position) => {
    // Select player immediately
    selectPlayer(pos);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragPendingRef.current = { pos, startX: clientX, startY: clientY, moved: false };
  }, [selectPlayer]);

  const handlePointerMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragPendingRef.current || !svgRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (!dragPendingRef.current.moved) {
      const dist = Math.hypot(clientX - dragPendingRef.current.startX, clientY - dragPendingRef.current.startY);
      if (dist < 5) return;
      dragPendingRef.current.moved = true;
      setDraggingPlayer(dragPendingRef.current.pos);
    }

    const rect = svgRef.current.getBoundingClientRect();
    const courtCoord = screenToCourt(clientX, clientY, rect);
    updateCustomPlayerCoord(dragPendingRef.current.pos, courtCoord);
  }, [updateCustomPlayerCoord]);

  const handlePointerUp = useCallback(() => {
    dragPendingRef.current = null;
    if (draggingPlayer) {
      setDraggingPlayer(null);
    }
  }, [draggingPlayer]);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => handlePointerMove(e);
    const handleUp = () => handlePointerUp();

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // Click on court: if an action is drafting, set target point
  const handleCourtClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    if (actionDraft) {
      const rect = svgRef.current.getBoundingClientRect();
      const pt = screenToCourt(e.clientX, e.clientY, rect);
      addDraftPoint(clampPoint(pt));
    }
  };

  // Spacing warnings
  const spacingIssues = uiPreferences.showSpacingGuide
    ? calculateSpacingIssues(offense, 11)
    : [];

  const lastEvent = timeline.length > 0 ? timeline[timeline.length - 1] : undefined;

  // Flying ball animation when pass, handoff, shoot, or layup occurs
  const [flyingBall, setFlyingBall] = useState<{
    start: Point;
    end: Point;
    targetPlayer?: Position;
  } | null>(null);
  const flyingBallRef = useRef<SVGGElement | null>(null);
  const lastEventIdRef = useRef<string | null>(null);
  const [shotFeedback, setShotFeedback] = useState<ShotResult | null>(null);
  const [isShotFeedbackMinimized, setIsShotFeedbackMinimized] = useState(false);

  useEffect(() => {
    if (!lastEvent || lastEvent.id === lastEventIdRef.current) return;
    lastEventIdRef.current = lastEvent.id;

    if (lastEvent.shotResult) {
      setShotFeedback(lastEvent.shotResult);
      setIsShotFeedbackMinimized(false);
      const timer = setTimeout(() => {
        setShotFeedback((prev) => (prev === lastEvent.shotResult ? null : prev));
      }, 5500);
    }

    if (
      (lastEvent.action === 'pass' || lastEvent.action === 'handoff') &&
      lastEvent.targetPlayer &&
      lastEvent.path &&
      lastEvent.path.length >= 2
    ) {
      const start = lastEvent.path[0];
      const end = lastEvent.path[lastEvent.path.length - 1];
      setFlyingBall({
        start,
        end,
        targetPlayer: lastEvent.targetPlayer,
      });

      const startTime = performance.now();
      const speed = uiPreferences.playbackSpeed || 1;
      const duration = Math.min(Math.max(450 / speed, 200), 900);

      let animId: number;
      const stepBall = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currX = start.x + (end.x - start.x) * progress;
        // Parabolic arc for pass
        const arcY = Math.sin(progress * Math.PI) * 4;
        const currY = start.y + (end.y - start.y) * progress - arcY;
        const scale = 1 + Math.sin(progress * Math.PI) * 0.25;

        flyingBallRef.current?.setAttribute(
          'transform',
          `translate(${currX}, ${currY}) scale(${scale})`
        );

        if (progress < 1) {
          animId = requestAnimationFrame(stepBall);
        } else {
          setFlyingBall(null);
        }
      };

      animId = requestAnimationFrame(stepBall);
      return () => cancelAnimationFrame(animId);
    } else if (lastEvent.action === 'shoot' || lastEvent.action === 'shoot_off_screen' || lastEvent.action === 'layup') {
      const start =
        lastEvent.path && lastEvent.path.length > 0
          ? lastEvent.path[0]
          : offense[lastEvent.player].coord;
      const end = { x: 50, y: 8 };
      setFlyingBall({
        start,
        end,
      });

      const startTime = performance.now();
      const speed = uiPreferences.playbackSpeed || 1;
      const duration = Math.min(Math.max(550 / speed, 220), 1200);
      const isShoot = lastEvent.action === 'shoot';

      let animId: number;
      const stepBall = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currX = start.x + (end.x - start.x) * progress;
        // Parabolic arc for shot vs layup
        const arcY = Math.sin(progress * Math.PI) * (isShoot ? 8 : 4);
        const currY = start.y + (end.y - start.y) * progress - arcY;
        const scale = 1 + Math.sin(progress * Math.PI) * 0.35;

        flyingBallRef.current?.setAttribute(
          'transform',
          `translate(${currX}, ${currY}) scale(${scale})`
        );

        if (progress < 1) {
          animId = requestAnimationFrame(stepBall);
        } else {
          setFlyingBall(null);
        }
      };

      animId = requestAnimationFrame(stepBall);
      return () => cancelAnimationFrame(animId);
    }
  }, [lastEvent, offense, uiPreferences.playbackSpeed]);

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full p-2 select-none">
      {/* AI Win Analysis Celebration Modal */}
      <AIWinAnalysisModal />

      {/* AI Defense Stop Analysis Modal */}
      <DefenseStopAnalysisModal />

      {/* Head-to-Head Stats & Playbook Modal */}
      <StatsModal />

      {/* SVG Container with responsive aspect ratio */}
      <div className="relative w-full max-w-[680px] aspect-square rounded-xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-950 flex items-center justify-center">
        {/* Floating AI Simulation HUD */}
        <AISimulationHUD />

        {/* Floating Premove Status Banner on Court */}
        {isPremoveMode && !isSimulating && (
          <div className="absolute top-2 left-2 right-2 z-30 flex items-center justify-between bg-slate-900/95 border border-emerald-500/60 p-2 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                  ⚡ Premove ({premoveQueue.length} bước)
                </span>
                <span className="text-[10px] text-slate-300 hidden sm:inline">
                  Hậu vệ đang ĐÓNG BĂNG. Hãy tạo chuỗi bài chạy!
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {premoveQueue.length > 0 && (
                <>
                  <button
                    onClick={executePremoveQueue}
                    disabled={isExecutingPremove}
                    className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-lg shadow-md flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isExecutingPremove ? 'ĐANG CHẠY...' : `THỰC THI (${premoveQueue.length})`}</span>
                  </button>
                  <button
                    onClick={undoLastPremove}
                    disabled={isExecutingPremove}
                    className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition"
                    title="Hủy bước gần nhất trong chuỗi"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button
                onClick={togglePremoveMode}
                disabled={isExecutingPremove}
                className="p-1 bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-300 text-xs rounded-lg border border-slate-700 transition"
                title="Thoát chế độ Premove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          className={`w-full h-full ${
            actionDraft ? 'cursor-crosshair' : draggingPlayer ? 'cursor-grabbing' : 'cursor-default'
          }`}
          onClick={handleCourtClick}
        >
          {/* Static Court Markings */}
          <CourtLines />

          {/* Optional Zone Overlay */}
          <ZoneOverlay visible={uiPreferences.showZoneAreas} />

          {/* Defensive Shell Overlay (Imaginary Lines & Team Shape Block) */}
          <DefensiveShellOverlay
            defense={defense}
            visible={uiPreferences.showDefensiveShell}
          />

          {/* Premove Queued Actions Overlay */}
          <PremoveQueueOverlay
            queue={premoveQueue}
            visible={isPremoveMode}
          />

          {/* Optional Passing Lanes Overlay */}
          <PassingLanesOverlay
            ballHolder={ballHolder}
            offense={offense}
            defense={defense}
            visible={uiPreferences.showPassingLanes}
          />

          {/* Spacing Guide Lines */}
          {uiPreferences.showSpacingGuide &&
            spacingIssues.map((issue) => {
              const pA = offense[issue.playerA].coord;
              const pB = offense[issue.playerB].coord;
              const midX = (pA.x + pB.x) / 2;
              const midY = (pA.y + pB.y) / 2;
              return (
                <g key={`${issue.playerA}-${issue.playerB}`} opacity="0.8">
                  <line
                    x1={pA.x}
                    y1={pA.y}
                    x2={pB.x}
                    y2={pB.y}
                    stroke="#f59e0b"
                    strokeWidth="0.6"
                    strokeDasharray="1.5, 1"
                  />
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-8.5"
                      y="-1.8"
                      width="17"
                      height="3.6"
                      rx="1"
                      fill="#78350f"
                      stroke="#f59e0b"
                      strokeWidth="0.3"
                    />
                    <text
                      textAnchor="middle"
                      y="0.7"
                      fontSize="1.6"
                      fontWeight="bold"
                      fill="#fef3c7"
                    >
                      Spacing hẹp ({issue.distance})
                    </text>
                  </g>
                </g>
              );
            })}

          {/* Tactical Paths for Draft or Last Event */}
          <TacticalPath
            draft={actionDraft}
            lastEvent={lastEvent}
            visible={uiPreferences.showTacticalPaths}
          />

          {/* Active Screen Tactical Visual Connection */}
          {activeScreen && offense[activeScreen.screener] && offense[activeScreen.target] && (
            <g className="active-screen-overlay pointer-events-none select-none">
              {/* Screen Wall Bridge Line between Screener and Target */}
              <line
                x1={offense[activeScreen.screener].coord.x}
                y1={offense[activeScreen.screener].coord.y}
                x2={offense[activeScreen.target].coord.x}
                y2={offense[activeScreen.target].coord.y}
                stroke="#f59e0b"
                strokeWidth="0.8"
                strokeDasharray="2, 1.2"
                opacity="0.85"
              />

              {/* Screener Shield Badge */}
              <g transform={`translate(${offense[activeScreen.screener].coord.x}, ${offense[activeScreen.screener].coord.y - 5})`}>
                <rect
                  x="-7.5"
                  y="-1.8"
                  width="15"
                  height="3.6"
                  rx="0.9"
                  fill="#78350f"
                  stroke="#f59e0b"
                  strokeWidth="0.4"
                  opacity="0.95"
                />
                <text
                  y="0.7"
                  textAnchor="middle"
                  fontSize="1.6"
                  fontWeight="bold"
                  fill="#fef3c7"
                >
                  🛡️ SCREEN {activeScreen.screener}
                </text>
              </g>

              {/* Recommended Curved Drive Lane Arrow for Target Ball Handler */}
              {(() => {
                const screenerPt = offense[activeScreen.screener].coord;
                const targetPt = offense[activeScreen.target].coord;
                const isLeft = screenerPt.x <= targetPt.x;
                const bypassX = isLeft ? screenerPt.x - 5 : screenerPt.x + 5;
                const finishX = isLeft ? screenerPt.x - 2 : screenerPt.x + 2;
                return (
                  <path
                    d={`M ${targetPt.x} ${targetPt.y} Q ${bypassX} ${targetPt.y - 8} ${finishX} ${Math.max(targetPt.y - 24, 20)}`}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="0.75"
                    strokeDasharray="1.5, 1"
                    markerEnd="url(#arrow-solid)"
                    opacity="0.75"
                  />
                );
              })()}
            </g>
          )}

          {/* 5 Defensive Players */}
          {POSITIONS.map((pos) => (
            <PlayerMarker
              key={`def-${pos}`}
              player={defense[pos]}
              isSelected={false}
              hasBall={false}
              onSelect={() => {}}
            />
          ))}

          {/* 5 Offensive Players */}
          {POSITIONS.map((pos) => (
            <PlayerMarker
              key={`off-${pos}`}
              player={offense[pos]}
              isSelected={selectedPlayer === pos}
              hasBall={ballHolder === pos}
              isScreener={activeScreen?.screener === pos}
              isDrafting={actionDraft?.player === pos}
              isDragging={draggingPlayer === pos}
              movementPath={lastEvent && lastEvent.player === pos ? lastEvent.path : undefined}
              hideBall={flyingBall !== null && (flyingBall.targetPlayer === pos || flyingBall.targetPlayer === undefined)}
              onSelect={selectPlayer}
              onDragStart={handleDragStart}
            />
          ))}

          {/* Animated Flying Ball during passes & hand-offs */}
          {flyingBall && (
            <g
              ref={flyingBallRef}
              transform={`translate(${flyingBall.start.x}, ${flyingBall.start.y})`}
              className="pointer-events-none z-50"
            >
              <ellipse rx="1.6" ry="0.6" fill="#0f172a" opacity="0.35" transform="translate(0, 3)" />
              <circle r="1.6" fill="#f97316" stroke="#ffffff" strokeWidth="0.4" />
              <line x1="-1.6" y1="0" x2="1.6" y2="0" stroke="#7c2d12" strokeWidth="0.2" />
              <line x1="0" y1="-1.6" x2="0" y2="1.6" stroke="#7c2d12" strokeWidth="0.2" />
            </g>
          )}
        </svg>

        {/* Floating Shot Result Feedback Banner */}
        {shotFeedback && isShotFeedbackMinimized && (
          <div
            className={`absolute top-3 right-3 z-40 px-2.5 py-1.5 rounded-lg shadow-xl border backdrop-blur-md flex items-center gap-2 text-xs font-bold animate-in fade-in ${
              shotFeedback.made
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                : 'bg-rose-950/90 border-rose-500 text-rose-200'
            }`}
          >
            <span>{shotFeedback.made ? `🎯 VÀO RỔ +${shotFeedback.points}Đ` : '❌ KHÔNG VÀO'}</span>
            <button
              type="button"
              onClick={() => setIsShotFeedbackMinimized(false)}
              className="p-0.5 text-white/70 hover:text-white rounded"
              title="Mở rộng chi tiết cú ném"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShotFeedback(null)}
              className="p-0.5 text-white/70 hover:text-white rounded"
              title="Đóng thông báo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {shotFeedback && !isShotFeedbackMinimized && (
          <div
            className={`absolute top-3 right-3 z-40 max-w-[270px] p-3 rounded-lg shadow-2xl border backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-200 ${
              shotFeedback.made
                ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-100 shadow-emerald-950/60'
                : 'bg-rose-950/90 border-rose-500/80 text-rose-100 shadow-rose-950/60'
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5 mb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-sm tracking-wide">
                <span>{shotFeedback.made ? '🎯 VÀO RỔ (MADE)' : '❌ KHÔNG VÀO (MISSED)'}</span>
                {shotFeedback.made && (
                  <span className="text-xs px-1.5 py-0.2 rounded bg-emerald-600 text-white font-extrabold shadow-sm">
                    +{shotFeedback.points}Đ
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsShotFeedbackMinimized(true)}
                  className="text-white/60 hover:text-white p-0.5 rounded transition"
                  title="Thu nhỏ thông báo"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShotFeedback(null)}
                  className="text-white/60 hover:text-white p-0.5 rounded transition"
                  title="Đóng thông báo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="text-xs space-y-1">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Dứt điểm:</span>
                <span className="font-semibold text-white">
                  {shotFeedback.shotType === 'layup'
                    ? 'Lên rổ (Layup)'
                    : shotFeedback.shotType === 'three'
                    ? 'Ném 3 Điểm'
                    : 'Ném Trung Bình'}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Áp sát (Contest):</span>
                <span className="font-semibold text-amber-300">
                  {shotFeedback.contestDefender} ({shotFeedback.contestDistance}m)
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Mức độ kèm:</span>
                <span
                  className={`font-semibold ${
                    shotFeedback.contestLevel === 'WIDE_OPEN'
                      ? 'text-emerald-400'
                      : shotFeedback.contestLevel === 'OPEN'
                      ? 'text-cyan-300'
                      : shotFeedback.contestLevel === 'CONTESTED'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {shotFeedback.contestLevel === 'WIDE_OPEN'
                    ? 'Trống trải (Wide Open)'
                    : shotFeedback.contestLevel === 'OPEN'
                    ? 'Hơi thoáng (Open)'
                    : shotFeedback.contestLevel === 'CONTESTED'
                    ? 'Bị kèm (Contested)'
                    : 'Kèm sát (Smothered)'}
                </span>
              </div>
              <div className="flex justify-between text-slate-300 pt-1 border-t border-white/10 font-medium">
                <span className="text-slate-400">Tỉ lệ thành công:</span>
                <span className="font-bold text-white text-[13px]">{shotFeedback.probability}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Draft Confirmation Banner (Floating on Court) */}
        {actionDraft && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-sky-500/70 backdrop-blur-md px-3.5 py-2 rounded-lg shadow-xl flex flex-wrap items-center gap-3 text-sm max-w-[95%]">
            <div className="flex flex-col">
              <span className="font-semibold text-sky-400">
                {actionDraft.player} – {actionDraft.action.toUpperCase()}
                {actionDraft.targetPlayer ? ` cho ${actionDraft.targetPlayer}` : ''}
              </span>
              <span className="text-[11px] text-slate-300">
                Nhấp chuột trên sân để chỉnh hướng/tọa độ đích.
              </span>
            </div>

            {/* Quick Direction Switcher for Screen */}
            {actionDraft.action === 'screen' && actionDraft.targetPlayer && (
              <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded border border-slate-800 text-xs">
                <span className="text-[10px] text-amber-400 mr-1 font-medium">Hướng:</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startDraft('screen', actionDraft.targetPlayer, 'left');
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-200 text-[11px]"
                >
                  ← Trái
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startDraft('screen', actionDraft.targetPlayer, 'top');
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-200 text-[11px]"
                >
                  ↑ Đỉnh
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startDraft('screen', actionDraft.targetPlayer, 'right');
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-200 text-[11px]"
                >
                  Phải →
                </button>
              </div>
            )}

            {/* Quick Direction Switcher for Hand-off */}
            {actionDraft.action === 'handoff' && actionDraft.targetPlayer && (
              <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded border border-slate-800 text-xs">
                <span className="text-[10px] text-orange-400 mr-1 font-medium">Hướng:</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startDraft('handoff', actionDraft.targetPlayer, 'left');
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-orange-200 text-[11px]"
                >
                  ← Trái
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startDraft('handoff', actionDraft.targetPlayer, 'direct');
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-orange-200 text-[11px]"
                >
                  ↕ Trực diện
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startDraft('handoff', actionDraft.targetPlayer, 'right');
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-orange-200 text-[11px]"
                >
                  Phải →
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDraft();
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded shadow transition active:scale-95"
                title="Xác nhận thực hiện bài chạy"
              >
                <Check className="w-4 h-4" />
                <span>Xác nhận</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cancelDraft();
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition active:scale-95"
                title="Hủy thao tác"
              >
                <X className="w-4 h-4" />
                <span>Hủy</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Legend & Speed control under the court */}
      <div className="flex flex-wrap items-center justify-between w-full max-w-[680px] mt-2 px-1 text-xs text-slate-400 gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sky-500 inline-block border border-sky-300"></span>
            <span>Tấn công</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block border border-red-400"></span>
            <span>Phòng thủ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block border border-white"></span>
            <span>Bóng ({ballHolder})</span>
          </div>
          {activeScreen && (
            <div className="flex items-center gap-1.5 text-amber-400 font-medium">
              <span className="w-2.5 h-2.5 border border-amber-400 inline-block"></span>
              <span>Screen: {activeScreen.screener} → {activeScreen.target}</span>
            </div>
          )}
        </div>

        {/* Speed Selector Controls */}
        <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mr-1">
            <Gauge className="w-3 h-3 text-sky-400" />
            Tốc độ:
          </span>
          {([0.25, 0.5, 1] as const).map((spd) => {
            const isAct = (uiPreferences.playbackSpeed || 1) === spd;
            return (
              <button
                key={spd}
                type="button"
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition active:scale-95 ${
                  isAct
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={`Chỉnh tốc độ di chuyển ${spd}x`}
              >
                {spd}x
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
