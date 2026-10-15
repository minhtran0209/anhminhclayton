import { COURT_DIMENSIONS } from '../../config/constants';
import {
  PassingLane,
  Player,
  Point,
  Position,
  SpacingWarning,
} from '../../types/basketball';

/**
 * Clamp point within valid playable court boundaries.
 * Prevents players or ball from leaving the tactical court.
 */
export function clampPoint(p: Point, min = 4, max = 96): Point {
  return {
    x: Math.min(Math.max(p.x, min), max),
    y: Math.min(Math.max(p.y, min), max),
  };
}

/**
 * Euclidean distance between two 2D points.
 */
export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Linear interpolation between two points.
 */
export function lerp(a: Point, b: Point, t: number): Point {
  const clampedT = Math.max(0, Math.min(1, t));
  return {
    x: a.x + (b.x - a.x) * clampedT,
    y: a.y + (b.y - a.y) * clampedT,
  };
}

/**
 * Distance to basket rim (basket is at x: 50, y: 8).
 */
export function distanceToBasket(p: Point): number {
  return distance(p, COURT_DIMENSIONS.BASKET);
}

/**
 * Check if a point is on the same side of the court as the ball relative to center (X = 50).
 */
export function isBallSide(p: Point, ballPos: Point): boolean {
  const ballIsRight = ballPos.x >= 50;
  const pointIsRight = p.x >= 50;
  return ballIsRight === pointIsRight;
}

/**
 * Project a point from `from` towards `to` by a certain percentage or fixed distance.
 */
export function projectToward(from: Point, to: Point, ratio: number): Point {
  return lerp(from, to, ratio);
}

/**
 * Scale horizontal distance relative to the center axis (X = 50).
 * factor = 1.0 means no change, < 1.0 compresses toward midline, > 1.0 expands.
 */
export function scaleFromCenter(x: number, factor: number, centerX = 50): number {
  return centerX + (x - centerX) * factor;
}

/**
 * Find the nearest defender to a given point.
 */
export function nearestDefender(
  point: Point,
  defenders: Record<Position, Player>
): { position: Position; defender: Player; dist: number } {
  let closestPos: Position = 'PG';
  let minDist = Infinity;

  (Object.keys(defenders) as Position[]).forEach((pos) => {
    const d = distance(point, defenders[pos].coord);
    if (d < minDist) {
      minDist = d;
      closestPos = pos;
    }
  });

  return {
    position: closestPos,
    defender: defenders[closestPos],
    dist: minDist,
  };
}

/**
 * Find the nearest offensive teammate to a given point.
 */
export function nearestOffensivePlayer(
  point: Point,
  offense: Record<Position, Player>,
  excludePos?: Position
): { position: Position; player: Player; dist: number } {
  let closestPos: Position = 'PG';
  let minDist = Infinity;

  (Object.keys(offense) as Position[]).forEach((pos) => {
    if (pos === excludePos) return;
    const d = distance(point, offense[pos].coord);
    if (d < minDist) {
      minDist = d;
      closestPos = pos;
    }
  });

  return {
    position: closestPos,
    player: offense[closestPos],
    dist: minDist,
  };
}

/**
 * Calculate the perpendicular distance from point P to line segment AB.
 */
export function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const l2 = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
  if (l2 === 0) return distance(p, a);

  // Consider the line extending the segment, parameterized as a + t (b - a).
  // Find projection of point p onto the line.
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projection = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  };

  return distance(p, projection);
}

/**
 * Convert screen coordinates (from mouse / touch event on SVG) to normalized court coords (0-100).
 */
export function screenToCourt(screenX: number, screenY: number, svgRect: DOMRect): Point {
  if (svgRect.width === 0 || svgRect.height === 0) {
    return { x: 50, y: 50 };
  }
  const relX = ((screenX - svgRect.left) / svgRect.width) * COURT_DIMENSIONS.WIDTH;
  const relY = ((screenY - svgRect.top) / svgRect.height) * COURT_DIMENSIONS.HEIGHT;
  return clampPoint({ x: relX, y: relY });
}

/**
 * Geometry-based passing lane analysis from ball holder to other teammates.
 * Evaluates whether defenders intercept the line of pass.
 */
export function calculatePassingLanes(
  ballHolderPos: Position,
  offense: Record<Position, Player>,
  defenders: Record<Position, Player>
): Record<Position, PassingLane> {
  const lanes: Partial<Record<Position, PassingLane>> = {};
  const origin = offense[ballHolderPos].coord;

  (Object.keys(offense) as Position[]).forEach((targetPos) => {
    if (targetPos === ballHolderPos) return;

    const dest = offense[targetPos].coord;
    let minPerpDistance = Infinity;
    let interceptorPos: Position | undefined;

    (Object.keys(defenders) as Position[]).forEach((defPos) => {
      const defCoord = defenders[defPos].coord;
      const perpDist = pointToSegmentDistance(defCoord, origin, dest);
      
      // Also ensure defender is between origin and dest (not far behind pass)
      const distToPasser = distance(defCoord, origin);
      const distToTarget = distance(defCoord, dest);
      const totalPassDist = distance(origin, dest);

      // If defender is within the pass hallway
      if (distToPasser < totalPassDist + 5 && distToTarget < totalPassDist + 5) {
        if (perpDist < minPerpDistance) {
          minPerpDistance = perpDist;
          interceptorPos = defPos;
        }
      }
    });

    let status: 'Open' | 'Contested' | 'Blocked' = 'Open';
    if (minPerpDistance < 4) {
      status = 'Blocked';
    } else if (minPerpDistance < 9) {
      status = 'Contested';
    }

    lanes[targetPos] = {
      target: targetPos,
      status,
      defenderDistance: minPerpDistance,
      interceptor: interceptorPos,
    };
  });

  return lanes as Record<Position, PassingLane>;
}

/**
 * Detect spacing issues among offensive players (warning if two players get too close).
 */
export function calculateSpacingIssues(
  offense: Record<Position, Player>,
  minThreshold = 12
): SpacingWarning[] {
  const warnings: SpacingWarning[] = [];
  const positions = Object.keys(offense) as Position[];

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const p1 = positions[i];
      const p2 = positions[j];
      const dist = distance(offense[p1].coord, offense[p2].coord);
      if (dist < minThreshold) {
        warnings.push({
          playerA: p1,
          playerB: p2,
          distance: Math.round(dist * 10) / 10,
        });
      }
    }
  }

  return warnings;
}

/**
 * Calculates a tactically realistic screen (pick) position.
 * In basketball, a screen is planted ON THE DEFENDER guarding the target teammate,
 * blocking the defender's ability to contest or slide laterally.
 *
 * @param targetCoord Coordinate of the offensive teammate receiving the screen
 * @param defenderCoord Coordinate of the defender guarding that teammate
 * @param direction 'left' | 'right' | 'top' | custom Point
 */
export function calculateScreenPosition(
  targetCoord: Point,
  defenderCoord?: Point,
  direction?: 'left' | 'right' | 'top' | Point
): Point {
  if (direction && typeof direction === 'object') {
    return clampPoint(direction);
  }

  const basket = COURT_DIMENSIONS.BASKET; // { x: 50, y: 8 }

  // If no defender coordinate is known, estimate defender position between target teammate and basket
  let def = defenderCoord;
  if (!def) {
    const dirToBasket = { x: basket.x - targetCoord.x, y: basket.y - targetCoord.y };
    const distToBasket = Math.hypot(dirToBasket.x, dirToBasket.y) || 1;
    // Standard defensive contest gap ~ 8 court units toward basket
    def = {
      x: targetCoord.x + (dirToBasket.x / distToBasket) * 8,
      y: targetCoord.y + (dirToBasket.y / distToBasket) * 8,
    };
  }

  // Vector from offensive target to defender
  const v = { x: def.x - targetCoord.x, y: def.y - targetCoord.y };
  const d = Math.hypot(v.x, v.y);

  // Unit vector u from offensive target toward defender
  let u: Point;
  if (d < 0.5) {
    const toB = { x: basket.x - targetCoord.x, y: basket.y - targetCoord.y };
    const lenB = Math.hypot(toB.x, toB.y) || 1;
    u = { x: toB.x / lenB, y: toB.y / lenB };
  } else {
    u = { x: v.x / d, y: v.y / d };
  }

  // Perpendicular vector pointing to court-right from the perspective of target facing defender:
  // If u points up (0, -1), court-right is (1, 0), so pRight = (-u.y, u.x)
  const pRight: Point = { x: -u.y, y: u.x };

  // Determine which side to set screen if not explicitly specified
  let side = direction;
  if (!side) {
    // Smart side: if defender is on the right half of court, screen on left to force drive to middle, and vice-versa
    side = def.x >= 50 ? 'left' : 'right';
  }

  let screenPoint: Point;

  // If defender is within realistic contest range (<= 16 court units)
  if (d <= 16) {
    if (side === 'left') {
      // Screen planted on the left shoulder/hip of the defender
      screenPoint = {
        x: def.x - 1.2 * u.x - 4.2 * pRight.x,
        y: def.y - 1.2 * u.y - 4.2 * pRight.y,
      };
    } else if (side === 'right') {
      // Screen planted on the right shoulder/hip of the defender
      screenPoint = {
        x: def.x - 1.2 * u.x + 4.2 * pRight.x,
        y: def.y - 1.2 * u.y + 4.2 * pRight.y,
      };
    } else {
      // 'top': High/Blind screen set directly on defender's back (between defender and offensive target)
      screenPoint = {
        x: def.x - 3.0 * u.x,
        y: def.y - 3.0 * u.y,
      };
    }
  } else {
    // Defender is sagging deep (> 16 units). Screen is set as an on-ball high screen in front of target
    const anchor = {
      x: targetCoord.x + 7.5 * u.x,
      y: targetCoord.y + 7.5 * u.y,
    };
    if (side === 'left') {
      screenPoint = {
        x: anchor.x - 4.2 * pRight.x,
        y: anchor.y - 4.2 * pRight.y,
      };
    } else if (side === 'right') {
      screenPoint = {
        x: anchor.x + 4.2 * pRight.x,
        y: anchor.y + 4.2 * pRight.y,
      };
    } else {
      screenPoint = anchor;
    }
  }

  return clampPoint(screenPoint);
}

export interface ScreenCollisionResult {
  hasCollided: boolean;
  blockedPosition: Point;
  separationDistance: number;
}

/**
 * Evaluates whether a defender pursuing a moving ball handler collides with an active screen.
 * If the ball handler moves past or through the screen and the defender's chase path intersects
 * the screen's influence zone, the defender is physically stopped at the screen wall,
 * creating an open scoring lane and separation for the ball handler.
 *
 * @param screenPoint The coordinate of the screener on the court.
 * @param ballStart The ball handler's starting position before movement.
 * @param ballEnd The ball handler's target/current position.
 * @param defenderStart The defender's starting position.
 * @param defenderIdeal The position the defender would normally occupy to contest the ball handler.
 * @param screenRadius Influence/blocking radius of the screen (default: 6.0 court units).
 */
export function checkScreenCollision(
  screenPoint: Point,
  ballStart: Point,
  ballEnd: Point,
  defenderStart: Point,
  defenderIdeal: Point,
  screenRadius = 6.0
): ScreenCollisionResult {
  // 1. Did the ball handler's trajectory use or pass near the screen?
  const ballDistToScreen = pointToSegmentDistance(screenPoint, ballStart, ballEnd);
  const ballCloseToScreen = ballDistToScreen <= 9.0 || distance(ballEnd, screenPoint) <= 9.5;

  // 2. Did the defender's pursuit trajectory enter or cross the screen influence zone?
  const defDistToScreen = pointToSegmentDistance(screenPoint, defenderStart, defenderIdeal);
  const defStartNearScreen = distance(defenderStart, screenPoint) <= 7.0;
  const defIdealNearScreen = distance(defenderIdeal, screenPoint) <= screenRadius;
  const defCrossingScreen = defDistToScreen <= screenRadius;

  // 3. Movement threshold: ball handler actually moved
  const hasMoved = distance(ballStart, ballEnd) > 1.2;

  // Collision occurs when ball handler uses screen and pursuing defender encounters the screen
  const hasCollided = hasMoved && ballCloseToScreen && (defStartNearScreen || defIdealNearScreen || defCrossingScreen);

  if (hasCollided) {
    // The defender is blocked against the contact side of the screen
    const dx = defenderStart.x - screenPoint.x;
    const dy = defenderStart.y - screenPoint.y;
    const len = Math.hypot(dx, dy);

    let contactDir: Point;
    if (len < 0.3) {
      // Defender was right at center of screen, stop on the defensive side
      contactDir = { x: 0, y: 1 };
    } else {
      contactDir = { x: dx / len, y: dy / len };
    }

    // Pinned at collision boundary (touching screener)
    const blockedPos: Point = clampPoint({
      x: screenPoint.x + contactDir.x * 3.6,
      y: screenPoint.y + contactDir.y * 3.6,
    });

    const separationDistance = distance(ballEnd, blockedPos);

    return {
      hasCollided: true,
      blockedPosition: blockedPos,
      separationDistance,
    };
  }

  return {
    hasCollided: false,
    blockedPosition: defenderIdeal,
    separationDistance: distance(ballEnd, defenderIdeal),
  };
}


