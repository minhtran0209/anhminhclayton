import React, { useEffect, useRef } from 'react';
import { Player, Point, Position } from '../../types/basketball';
import { distance } from '../../engine/geometry/courtGeometry';
import { useGameStore } from '../../state/useGameStore';

interface PlayerMarkerProps {
  player: Player;
  isSelected: boolean;
  hasBall: boolean;
  isScreener?: boolean;
  isDrafting?: boolean;
  isDragging?: boolean;
  movementPath?: Point[];
  hideBall?: boolean;
  onSelect: (position: Position) => void;
  onDragStart?: (e: React.MouseEvent | React.TouchEvent, position: Position) => void;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function interpolateAlongPath(path: Point[], progress: number): Point {
  if (!path || path.length === 0) return { x: 50, y: 50 };
  if (path.length === 1) return path[0];
  if (progress <= 0) return path[0];
  if (progress >= 1) return path[path.length - 1];

  const distances: number[] = [0];
  for (let i = 0; i < path.length - 1; i++) {
    const d = distance(path[i], path[i + 1]);
    distances.push(distances[i] + d);
  }
  const totalDistance = distances[distances.length - 1];
  if (totalDistance <= 0.001) return path[path.length - 1];

  const targetDist = progress * totalDistance;

  for (let i = 0; i < distances.length - 1; i++) {
    if (targetDist <= distances[i + 1]) {
      const segLen = distances[i + 1] - distances[i];
      const localT = segLen > 0 ? (targetDist - distances[i]) / segLen : 0;
      return {
        x: path[i].x + (path[i + 1].x - path[i].x) * localT,
        y: path[i].y + (path[i + 1].y - path[i].y) * localT,
      };
    }
  }

  return path[path.length - 1];
}

export const PlayerMarker: React.FC<PlayerMarkerProps> = ({
  player,
  isSelected,
  hasBall,
  isScreener,
  isDrafting,
  isDragging,
  movementPath,
  hideBall,
  onSelect,
  onDragStart,
}) => {
  const isOffense = player.team === 'offense';
  const { x, y } = player.coord;
  const playbackSpeed = useGameStore((s) => s.uiPreferences.playbackSpeed);

  const groupRef = useRef<SVGGElement | null>(null);
  const currentPosRef = useRef<Point>({ x, y });
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isDragging) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      currentPosRef.current = { x: player.coord.x, y: player.coord.y };
      groupRef.current?.setAttribute('transform', `translate(${player.coord.x}, ${player.coord.y})`);
      return;
    }

    const startPos = { ...currentPosRef.current };
    const targetPos = player.coord;
    const dist = distance(startPos, targetPos);

    if (dist < 0.15) {
      groupRef.current?.setAttribute('transform', `translate(${targetPos.x}, ${targetPos.y})`);
      currentPosRef.current = targetPos;
      return;
    }

    const speed = playbackSpeed || 1;
    // Speed scaling: 0.25x -> 2080ms (slow-mo), 0.5x -> 1040ms, 1x -> 520ms
    const duration = Math.min(Math.max(520 / speed, 200), 2200);
    const startTime = performance.now();
    const activePath = movementPath && movementPath.length >= 2 ? movementPath : [startPos, targetPos];

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);
      const curr = interpolateAlongPath(activePath, eased);
      currentPosRef.current = curr;
      groupRef.current?.setAttribute('transform', `translate(${curr.x}, ${curr.y})`);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        currentPosRef.current = targetPos;
        groupRef.current?.setAttribute('transform', `translate(${targetPos.x}, ${targetPos.y})`);
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [player.coord.x, player.coord.y, isDragging, movementPath, playbackSpeed]);

  // Colors & Styling
  const fillColor = isOffense ? '#0284c7' : '#dc2626'; // Sky 600 vs Red 600
  const strokeColor = isOffense ? '#38bdf8' : '#f87171'; // Sky 400 vs Red 400
  const textColor = '#ffffff';

  return (
    <g
      ref={groupRef}
      className={`player-marker cursor-pointer select-none ${
        isSelected ? 'z-30' : 'z-20'
      }`}
      data-team={player.team}
      data-position={player.position}
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(player.position);
      }}
      onMouseDown={(e) => {
        if (onDragStart && isOffense) {
          onDragStart(e, player.position);
        }
      }}
      onTouchStart={(e) => {
        if (onDragStart && isOffense) {
          onDragStart(e, player.position);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${isOffense ? 'Tấn công' : 'Phòng thủ'} ${player.position}${
        hasBall ? ' (Đang giữ bóng)' : ''
      }${isSelected ? ' (Đang chọn)' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(player.position);
        }
      }}
    >
      {/* Selection Highlight Ring */}
      {isSelected && (
        <circle
          r="4.8"
          fill="none"
          stroke="#facc15"
          strokeWidth="0.8"
          strokeDasharray="2, 1"
          className="animate-spin-slow"
        />
      )}

      {/* Screen Indicator Glow */}
      {isScreener && (
        <rect
          x="-4.2"
          y="-4.2"
          width="8.4"
          height="8.4"
          rx="1.5"
          fill="none"
          stroke="#eab308"
          strokeWidth="0.8"
        />
      )}

      {/* Main Player Marker Circle */}
      <circle
        r="3.5"
        fill={fillColor}
        stroke={isSelected ? '#facc15' : strokeColor}
        strokeWidth={isSelected ? '1' : '0.6'}
        className="drop-shadow"
      />

      {/* Position Label (PG, SG, SF, PF, C) */}
      <text
        y="1.1"
        textAnchor="middle"
        fontSize="2.4"
        fontWeight="bold"
        fill={textColor}
        fontFamily="ui-monospace, monospace"
        pointerEvents="none"
      >
        {player.position}
      </text>

      {/* Defender State / Assignment Badge (compact below or above marker) */}
      {!isOffense && player.state && player.state !== 'HOME' && player.state !== 'MARK' && (
        <g transform="translate(0, -4.5)">
          <rect
            x={player.state === 'SCREENED' ? "-6.0" : "-4.5"}
            y="-1.8"
            width={player.state === 'SCREENED' ? "12.0" : "9"}
            height="2.8"
            rx="1.2"
            fill={player.state === 'SCREENED' ? "#78350f" : "#1e293b"}
            stroke={player.state === 'SCREENED' ? "#f59e0b" : "#ef4444"}
            strokeWidth="0.4"
            opacity="0.95"
          />
          <text
            y="0.1"
            textAnchor="middle"
            fontSize={player.state === 'SCREENED' ? "1.4" : "1.6"}
            fontWeight="bold"
            fill={player.state === 'SCREENED' ? "#fef3c7" : "#fca5a5"}
          >
            {player.state === 'SCREENED'
              ? '⛔ BỊ CẢN'
              : player.state === 'ON_BALL'
              ? 'ON BALL'
              : player.state === 'CLOSEOUT'
              ? 'CLOSEOUT'
              : player.state === 'HELP'
              ? 'HELP'
              : player.state === 'SWITCH'
              ? 'SWITCH'
              : player.state === 'ROTATE'
              ? 'ROTATE'
              : player.state === 'DENY'
              ? 'DENY'
              : 'ZONE'}
          </text>
        </g>
      )}

      {/* Ball Indicator when possessed */}
      {hasBall && !hideBall && (
        <g transform="translate(2.8, -2.8)">
          <circle r="1.5" fill="#f97316" stroke="#ffffff" strokeWidth="0.4" />
          {/* Basketball seams */}
          <line x1="-1.5" y1="0" x2="1.5" y2="0" stroke="#7c2d12" strokeWidth="0.2" />
          <line x1="0" y1="-1.5" x2="0" y2="1.5" stroke="#7c2d12" strokeWidth="0.2" />
        </g>
      )}
    </g>
  );
};
