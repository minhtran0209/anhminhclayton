import React from 'react';
import { COURT_DIMENSIONS } from '../../config/constants';

/**
 * High-precision Half-Court SVG Lines and Markings.
 * Normalized coordinates: X: [0, 100], Y: [0, 100].
 * Basket is at { x: 50, y: 8 }. Half court boundary is at Y = 100.
 */
export const CourtLines: React.FC = () => {
  const {
    PAINT,
    FREE_THROW_LINE_Y,
    FREE_THROW_CIRCLE_RADIUS,
    BACKBOARD_Y,
    RIM_RADIUS,
    RESTRICTED_RADIUS,
  } = COURT_DIMENSIONS;

  return (
    <g className="court-markings pointer-events-none select-none">
      {/* Court Outer Boundary */}
      <rect
        x="0"
        y="0"
        width="100"
        height="100"
        fill="#1e293b"
        stroke="#64748b"
        strokeWidth="0.8"
      />

      {/* Paint / Key Area Fill & Border */}
      <rect
        x={PAINT.LEFT}
        y={PAINT.TOP}
        width={PAINT.RIGHT - PAINT.LEFT}
        height={PAINT.BOTTOM - PAINT.TOP}
        fill="#172554"
        stroke="#94a3b8"
        strokeWidth="0.6"
        opacity="0.85"
      />

      {/* Free Throw Line */}
      <line
        x1={PAINT.LEFT}
        y1={FREE_THROW_LINE_Y}
        x2={PAINT.RIGHT}
        y2={FREE_THROW_LINE_Y}
        stroke="#e2e8f0"
        strokeWidth="0.7"
      />

      {/* Free Throw Top Circle (Towards half court - solid arc) */}
      <path
        d={`M ${PAINT.LEFT} ${FREE_THROW_LINE_Y} A ${FREE_THROW_CIRCLE_RADIUS} ${FREE_THROW_CIRCLE_RADIUS} 0 0 0 ${PAINT.RIGHT} ${FREE_THROW_LINE_Y}`}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="0.6"
      />

      {/* Free Throw Bottom Circle (Inside paint - dashed arc) */}
      <path
        d={`M ${PAINT.LEFT} ${FREE_THROW_LINE_Y} A ${FREE_THROW_CIRCLE_RADIUS} ${FREE_THROW_CIRCLE_RADIUS} 0 0 1 ${PAINT.RIGHT} ${FREE_THROW_LINE_Y}`}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="0.6"
        strokeDasharray="1.5, 1.5"
      />

      {/* Restricted Area Arc (Radius 7.5 under rim at x=50, y=8) */}
      <path
        d={`M ${50 - RESTRICTED_RADIUS} ${BACKBOARD_Y} A ${RESTRICTED_RADIUS} ${RESTRICTED_RADIUS} 0 0 0 ${50 + RESTRICTED_RADIUS} ${BACKBOARD_Y}`}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="0.6"
      />

      {/* Three-Point Line */}
      {/* Corner lines: x=8 down to y=22, and x=92 down to y=22 */}
      {/* Arc: from (8, 22) through (50, 51.5) to (92, 22) */}
      <path
        d="M 8 0 L 8 22 A 43.5 43.5 0 0 0 92 22 L 92 0"
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="0.75"
      />

      {/* Lane Block Markers / Hash marks along key */}
      {[14, 20, 26, 32].map((y) => (
        <React.Fragment key={y}>
          <line
            x1={PAINT.LEFT - 1.2}
            y1={y}
            x2={PAINT.LEFT}
            y2={y}
            stroke="#cbd5e1"
            strokeWidth="0.6"
          />
          <line
            x1={PAINT.RIGHT}
            y1={y}
            x2={PAINT.RIGHT + 1.2}
            y2={y}
            stroke="#cbd5e1"
            strokeWidth="0.6"
          />
        </React.Fragment>
      ))}

      {/* Backboard */}
      <line
        x1="43"
        y1={BACKBOARD_Y}
        x2="57"
        y2={BACKBOARD_Y}
        stroke="#cbd5e1"
        strokeWidth="1.2"
      />
      {/* Backboard support arm */}
      <line
        x1="50"
        y1="0"
        x2="50"
        y2={BACKBOARD_Y}
        stroke="#475569"
        strokeWidth="1"
      />

      {/* Basket Rim */}
      <circle
        cx="50"
        cy="8"
        r={RIM_RADIUS}
        fill="none"
        stroke="#f97316"
        strokeWidth="1"
      />
      {/* Rim connector */}
      <line
        x1="50"
        y1={BACKBOARD_Y}
        x2="50"
        y2={8 - RIM_RADIUS}
        stroke="#ea580c"
        strokeWidth="0.8"
      />

      {/* Center Half-Court Line */}
      <line
        x1="0"
        y1="100"
        x2="100"
        y2="100"
        stroke="#94a3b8"
        strokeWidth="1"
      />

      {/* Center Circle Arc at half court */}
      <path
        d="M 38 100 A 12 12 0 0 1 62 100"
        fill="none"
        stroke="#94a3b8"
        strokeWidth="0.6"
      />
      {/* Outer center restraining circle */}
      <path
        d="M 28 100 A 22 22 0 0 1 72 100"
        fill="none"
        stroke="#64748b"
        strokeWidth="0.5"
        strokeDasharray="2, 2"
      />
    </g>
  );
};
