import React, { useMemo } from 'react';
import { Player, Position } from '../../types/basketball';
import { POSITIONS } from '../../config/constants';

interface DefensiveShellOverlayProps {
  defense: Record<Position, Player>;
  visible: boolean;
}

interface DefenderPoint {
  x: number;
  y: number;
  pos: Position;
}

// 2D Cross product for Convex Hull
function cross(o: DefenderPoint, a: DefenderPoint, b: DefenderPoint): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

// Monotone chain algorithm to compute 2D Convex Hull
function getConvexHull(points: DefenderPoint[]): DefenderPoint[] {
  if (points.length <= 2) return points;
  const sorted = [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

  const lower: DefenderPoint[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: DefenderPoint[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

// Polygon area via Shoelace formula
function computePolygonArea(vertices: DefenderPoint[]): number {
  let total = 0;
  for (let i = 0, l = vertices.length; i < l; i++) {
    const addX = vertices[i].x;
    const addY = vertices[i === vertices.length - 1 ? 0 : i + 1].y;
    const subX = vertices[i === vertices.length - 1 ? 0 : i + 1].x;
    const subY = vertices[i].y;
    total += addX * addY * 0.5;
    total -= subX * subY * 0.5;
  }
  return Math.abs(total);
}

export const DefensiveShellOverlay: React.FC<DefensiveShellOverlayProps> = ({
  defense,
  visible,
}) => {
  const { hull, interiorPoints, internalMeshEdges, centroid, area, statusText } = useMemo(() => {
    const points: DefenderPoint[] = POSITIONS.map((pos) => ({
      x: defense[pos].coord.x,
      y: defense[pos].coord.y,
      pos,
    }));

    // Centroid / Center of Mass
    const cx = points.reduce((acc, p) => acc + p.x, 0) / points.length;
    const cy = points.reduce((acc, p) => acc + p.y, 0) / points.length;

    const hullPoints = getConvexHull(points);
    const hullSet = new Set(hullPoints.map((p) => p.pos));
    const interior = points.filter((p) => !hullSet.has(p.pos));

    // Internal structural connection lines (Triangulation mesh)
    const meshEdges: Array<[DefenderPoint, DefenderPoint]> = [];

    if (interior.length > 0) {
      // Connect each interior defender to surrounding hull vertices
      interior.forEach((intP) => {
        hullPoints.forEach((hullP) => {
          meshEdges.push([intP, hullP]);
        });
      });
    } else if (hullPoints.length >= 4) {
      // If all 5 (or 4) defenders are on the perimeter, triangulate from anchor defender (closest to basket)
      // The rim is at y = 10, so min y is closest to the rim
      let anchor = hullPoints[0];
      for (const p of hullPoints) {
        if (p.y < anchor.y) {
          anchor = p;
        }
      }
      const anchorIdx = hullPoints.findIndex((p) => p.pos === anchor.pos);
      // Connect anchor to non-adjacent vertices
      for (let i = 0; i < hullPoints.length; i++) {
        const diff = Math.abs(i - anchorIdx);
        const circularDiff = Math.min(diff, hullPoints.length - diff);
        if (circularDiff > 1) {
          meshEdges.push([anchor, hullPoints[i]]);
        }
      }
    }

    const polyArea = computePolygonArea(hullPoints);
    let status = 'Cân bằng (Balanced)';
    if (polyArea < 260) {
      status = 'Bó hẹp (Compact)';
    } else if (polyArea > 450) {
      status = 'Dãn rộng (Spread)';
    }

    return {
      hull: hullPoints,
      interiorPoints: interior,
      internalMeshEdges: meshEdges,
      centroid: { x: cx, y: cy },
      area: polyArea,
      statusText: status,
    };
  }, [defense]);

  if (!visible || hull.length < 3) return null;

  const polygonPath = `${hull.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}`;

  return (
    <g className="defensive-shell-overlay pointer-events-none select-none transition-all duration-300">
      <defs>
        {/* Subtle defensive red fill gradient */}
        <radialGradient id="defensiveShellRadial" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18" />
          <stop offset="70%" stopColor="#ef4444" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0.03" />
        </radialGradient>
      </defs>

      {/* 1. Defensive Shell Solid Polygon Fill */}
      <polygon
        points={polygonPath}
        fill="url(#defensiveShellRadial)"
        stroke="#ef4444"
        strokeWidth="0.8"
        strokeDasharray="2.5, 1.5"
        strokeLinejoin="round"
        className="transition-all duration-200"
      />

      {/* 2. Internal Tactical Support Web Lines */}
      {internalMeshEdges.map(([p1, p2], idx) => (
        <line
          key={`mesh-${idx}-${p1.pos}-${p2.pos}`}
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke="#f87171"
          strokeWidth="0.5"
          strokeDasharray="1.2, 1.5"
          opacity="0.55"
        />
      ))}

      {/* 3. Perimeter Node Dots on Defender Anchors */}
      {hull.map((p) => (
        <circle
          key={`node-${p.pos}`}
          cx={p.x}
          cy={p.y}
          r="0.9"
          fill="#ef4444"
          opacity="0.8"
        />
      ))}

      {/* 4. Center of Mass / Defensive Shell Center Badge */}
      <g transform={`translate(${centroid.x}, ${centroid.y})`} opacity="0.9">
        {/* Subtle tactical center indicator */}
        <circle r="1.4" fill="#1e293b" stroke="#ef4444" strokeWidth="0.4" />
        <circle r="0.4" fill="#f87171" />

        {/* Tactical Info Badge */}
        <g transform="translate(0, 3.2)">
          <rect
            x="-11"
            y="-1.8"
            width="22"
            height="3.6"
            rx="1.2"
            fill="#0f172a"
            stroke="#ef4444"
            strokeWidth="0.35"
            opacity="0.92"
          />
          <text
            y="0.6"
            textAnchor="middle"
            fontSize="1.6"
            fontWeight="bold"
            fill="#fca5a5"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            KHỐI PHÒNG THỦ · {statusText.split(' ')[0]}
          </text>
        </g>
      </g>
    </g>
  );
};
