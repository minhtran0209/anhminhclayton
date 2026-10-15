import React from 'react';
import { calculatePassingLanes } from '../../engine/geometry/courtGeometry';
import { Player, Position } from '../../types/basketball';

interface PassingLanesOverlayProps {
  ballHolder: Position;
  offense: Record<Position, Player>;
  defense: Record<Position, Player>;
  visible: boolean;
}

export const PassingLanesOverlay: React.FC<PassingLanesOverlayProps> = ({
  ballHolder,
  offense,
  defense,
  visible,
}) => {
  if (!visible) return null;

  const lanes = calculatePassingLanes(ballHolder, offense, defense);
  const origin = offense[ballHolder].coord;

  return (
    <g className="passing-lanes-overlay pointer-events-none select-none">
      {(Object.keys(lanes) as Position[]).map((targetPos) => {
        const lane = lanes[targetPos];
        const dest = offense[targetPos].coord;

        const strokeColor =
          lane.status === 'Open'
            ? '#10b981' // Green
            : lane.status === 'Contested'
            ? '#f59e0b' // Yellow
            : '#ef4444'; // Red

        const midX = (origin.x + dest.x) / 2;
        const midY = (origin.y + dest.y) / 2;

        return (
          <g key={targetPos} opacity="0.65">
            {/* Lane line */}
            <line
              x1={origin.x}
              y1={origin.y}
              x2={dest.x}
              y2={dest.y}
              stroke={strokeColor}
              strokeWidth="0.5"
              strokeDasharray="1.5, 1"
            />
            {/* Status indicator tag */}
            <g transform={`translate(${midX}, ${midY})`}>
              <circle r="1.6" fill="#0f172a" stroke={strokeColor} strokeWidth="0.4" />
              <text
                textAnchor="middle"
                y="0.6"
                fontSize="1.4"
                fontWeight="bold"
                fill={strokeColor}
              >
                {lane.status === 'Open' ? 'O' : lane.status === 'Contested' ? 'C' : 'X'}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
};
