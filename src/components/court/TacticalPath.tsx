import React from 'react';
import { ActionDraft, Point, TacticalEvent } from '../../types/basketball';

interface TacticalPathProps {
  draft: ActionDraft | null;
  lastEvent?: TacticalEvent;
  visible: boolean;
}

export const TacticalPath: React.FC<TacticalPathProps> = ({ draft, lastEvent, visible }) => {
  if (!visible && !draft) return null;

  // Render Marker Definitions for Arrow Heads & Screen T-Bar
  return (
    <g className="tactical-paths pointer-events-none select-none">
      <defs>
        {/* Solid Arrow for Movement */}
        <marker
          id="arrow-solid"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
        </marker>

        {/* Dashed Pass Arrow */}
        <marker
          id="arrow-pass"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#facc15" />
        </marker>

        {/* Screen T-Bar Marker */}
        <marker
          id="marker-screen"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <line x1="5" y1="0" x2="5" y2="10" stroke="#f59e0b" strokeWidth="3" />
        </marker>

        {/* Roll Curved Arrow */}
        <marker
          id="arrow-roll"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
        </marker>
      </defs>

      {/* Render Current Active Action Draft Path */}
      {draft && draft.path.length >= 2 && (
        <RenderPath
          path={draft.path}
          action={draft.action}
          isDraft={true}
        />
      )}

      {/* Render Last Committed Event Path (subtly visible if toggle on) */}
      {visible && !draft && lastEvent && lastEvent.path && lastEvent.path.length >= 2 && (
        <RenderPath
          path={lastEvent.path}
          action={lastEvent.action}
          isDraft={false}
        />
      )}
    </g>
  );
};

const RenderPath: React.FC<{ path: Point[]; action: string; isDraft: boolean }> = ({
  path,
  action,
  isDraft,
}) => {
  // Build SVG path data string
  let d = `M ${path[0].x} ${path[0].y}`;
  for (let i = 1; i < path.length; i++) {
    d += ` L ${path[i].x} ${path[i].y}`;
  }

  const opacity = isDraft ? 0.95 : 0.45;

  if (action === 'pass') {
    return (
      <path
        d={d}
        fill="none"
        stroke="#facc15"
        strokeWidth="0.9"
        strokeDasharray="2, 1.5"
        markerEnd="url(#arrow-pass)"
        opacity={opacity}
      />
    );
  }

  if (action === 'dribble') {
    return (
      <path
        d={d}
        fill="none"
        stroke="#38bdf8"
        strokeWidth="1"
        strokeDasharray="1, 1"
        markerEnd="url(#arrow-solid)"
        opacity={opacity}
      />
    );
  }

  if (action === 'screen') {
    const end = path[path.length - 1];
    return (
      <g>
        <path
          d={d}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.1"
          markerEnd="url(#marker-screen)"
          opacity={opacity}
        />
        {isDraft && (
          <g transform={`translate(${end.x}, ${end.y})`}>
            <circle r="3.0" fill="#d97706" opacity="0.3" className="animate-pulse" />
            <circle r="0.9" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.3" />
            <g transform={`translate(${end.x >= 50 ? 7.5 : -7.5}, -2.5)`}>
              <rect
                x="-6.5"
                y="-1.8"
                width="13"
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
                Vị trí Screen
              </text>
            </g>
          </g>
        )}
      </g>
    );
  }

  if (action === 'handoff') {
    const end = path[path.length - 1];
    return (
      <g>
        <path
          d={d}
          fill="none"
          stroke="#f97316"
          strokeWidth="1.1"
          strokeDasharray="2, 1"
          markerEnd="url(#arrow-solid)"
          opacity={opacity}
        />
        {isDraft && (
          <g transform={`translate(${end.x}, ${end.y})`}>
            <circle r="3.4" fill="#ea580c" opacity="0.35" className="animate-pulse" />
            <circle r="1.8" fill="none" stroke="#fed7aa" strokeWidth="0.5" />
            <rect
              x="-7.5"
              y="-6.4"
              width="15"
              height="3.4"
              rx="0.8"
              fill="#7c2d12"
              stroke="#ea580c"
              strokeWidth="0.3"
            />
            <text
              y="-4.1"
              textAnchor="middle"
              fontSize="1.7"
              fontWeight="bold"
              fill="#ffedd5"
            >
              Điểm Hand-off
            </text>
          </g>
        )}
      </g>
    );
  }

  if (action === 'roll') {
    return (
      <path
        d={d}
        fill="none"
        stroke="#10b981"
        strokeWidth="1"
        markerEnd="url(#arrow-roll)"
        opacity={opacity}
      />
    );
  }

  if (action === 'drive_off_screen') {
    const end = path[path.length - 1];
    return (
      <g>
        <path
          d={d}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.1"
          strokeDasharray="2.5, 1"
          markerEnd="url(#arrow-solid)"
          opacity={opacity}
        />
        {isDraft && (
          <g transform={`translate(${end.x}, ${end.y})`}>
            <circle r="3.2" fill="#d97706" opacity="0.3" className="animate-pulse" />
            <circle r="1.3" fill="#f59e0b" />
          </g>
        )}
      </g>
    );
  }

  if (action === 'shoot' || action === 'shoot_off_screen') {
    const end = path[path.length - 1];
    return (
      <g>
        <path
          d={d}
          fill="none"
          stroke="#facc15"
          strokeWidth="0.9"
          strokeDasharray="1.5, 1"
          markerEnd="url(#arrow-pass)"
          opacity={opacity}
        />
        {isDraft && (
          <g transform={`translate(${end.x}, ${end.y})`}>
            <circle r="3" fill="#eab308" opacity="0.25" className="animate-pulse" />
            <circle r="1.2" fill="#facc15" />
          </g>
        )}
      </g>
    );
  }

  // Standard movement / cut / backdoor
  const end = path[path.length - 1];
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="#38bdf8"
        strokeWidth="0.85"
        markerEnd="url(#arrow-solid)"
        opacity={opacity}
      />
      {isDraft && (
        <g transform={`translate(${end.x}, ${end.y})`}>
          <circle r="2.8" fill="#0284c7" opacity="0.25" className="animate-pulse" />
          <circle r="1.2" fill="#38bdf8" />
        </g>
      )}
    </g>
  );
};
