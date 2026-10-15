import { COURT_DIMENSIONS } from '../../config/constants';
import { clampPoint, distance, lerp } from '../geometry/courtGeometry';
import { DefensiveSettings, Point, Position } from '../../types/basketball';

/**
 * Rebalance and apply defensive sliders to a set of raw defensive points.
 * Ensures that changes to Height, Width, Compactness, Pressure, Help, and Ball-side Shift
 * visibly, deterministically, and immediately transform the defensive shape.
 */
export function applyDefensiveModifiers(
  rawPositions: Record<Position, Point>,
  ballPos: Point,
  onBallDefender: Position | undefined,
  settings: DefensiveSettings
): Record<Position, Point> {
  const positions = { ...rawPositions };
  const positionsList = Object.keys(positions) as Position[];

  // 1. Calculate defensive centroid for compactness
  let sumX = 0;
  let sumY = 0;
  positionsList.forEach((pos) => {
    sumX += positions[pos].x;
    sumY += positions[pos].y;
  });
  const centroid: Point = {
    x: sumX / positionsList.length,
    y: sumY / positionsList.length,
  };

  // 2. Width factor (0: 0.6x, 50: 1.0x, 100: 1.4x)
  const widthFactor = 0.6 + (settings.width / 100) * 0.8;

  // 3. Height shift: Basket is at y=8, half-court at y=100.
  // Higher height moves defenders further up toward y=100.
  // Range: at 50, factor is 0; at 100: +10 units; at 0: -10 units toward basket.
  const heightShift = ((settings.height - 50) / 50) * 11;

  // 4. Ball-side shell shift: Shifts defensive unit towards ball X
  const ballDeltaX = ballPos.x - 50; // -50 to +50
  const ballShiftMagnitude = (settings.ballSideShift / 100) * 0.22;

  // 5. Compactness pull: Higher compactness pulls off-ball defenders toward centroid/rim core
  const compactnessFactor = (settings.compactness - 50) / 100; // -0.5 to +0.5

  // 6. Paint vs Perimeter Bias (-100 to +100)
  const biasYShift = (settings.paintPerimeterBias / 100) * 6; // + steps up toward perimeter, - sinks to paint

  positionsList.forEach((pos) => {
    let p = { ...positions[pos] };
    const isOnBall = pos === onBallDefender;

    // Apply Width scaling from center X = 50
    p.x = 50 + (p.x - 50) * widthFactor;

    // Apply Height shift (higher up court)
    // On-ball defender feels height shift stronger, interior anchors adjust moderately
    const posHeightWeight = p.y > 35 ? 1.0 : 0.6;
    p.y += heightShift * posHeightWeight + biasYShift;

    // Apply Ball-side shift
    // Defenders shift toward the side of the court the ball is on
    p.x += ballDeltaX * ballShiftMagnitude;

    // Apply Compactness (except direct on-ball defender who must guard the ball)
    if (!isOnBall) {
      if (compactnessFactor > 0) {
        // Pull towards core defensive centroid
        p = lerp(p, centroid, compactnessFactor * 0.4);
      } else if (compactnessFactor < 0) {
        // Spread away from centroid
        const spreadFactor = Math.abs(compactnessFactor) * 0.35;
        p.x += (p.x - centroid.x) * spreadFactor;
        p.y += (p.y - centroid.y) * spreadFactor;
      }
    }

    // Boundary safety clamping
    positions[pos] = clampPoint(p, 5, 95);
  });

  // Final check: prevent defenders from overlapping exactly
  for (let i = 0; i < positionsList.length; i++) {
    for (let j = i + 1; j < positionsList.length; j++) {
      const p1 = positionsList[i];
      const p2 = positionsList[j];
      const d = distance(positions[p1], positions[p2]);
      if (d < 4) {
        // Gently push apart
        const dx = positions[p1].x - positions[p2].x || (Math.random() - 0.5);
        const dy = positions[p1].y - positions[p2].y || (Math.random() - 0.5);
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        positions[p1].x += (dx / len) * 2;
        positions[p1].y += (dy / len) * 2;
        positions[p2].x -= (dx / len) * 2;
        positions[p2].y -= (dy / len) * 2;
        positions[p1] = clampPoint(positions[p1], 5, 95);
        positions[p2] = clampPoint(positions[p2], 5, 95);
      }
    }
  }

  return positions;
}
