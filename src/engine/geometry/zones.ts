import { CourtZone, Point } from '../../types/basketball';

/**
 * Determine the semantic court zone for any normalized coordinate.
 * Basket is near x: 50, y: 8; Half-court is at y: 100.
 */
export function getCourtZone(p: Point): CourtZone {
  const { x, y } = p;

  // 1. Corners (Deep perimeter near baseline outside the 3-point line)
  if (y <= 24 && x <= 20) {
    return 'LEFT_CORNER';
  }
  if (y <= 24 && x >= 80) {
    return 'RIGHT_CORNER';
  }

  // 2. Short Corners (Between paint and corner along baseline)
  if (y <= 16 && x > 20 && x < 35) {
    return 'SHORT_CORNER_LEFT';
  }
  if (y <= 16 && x > 65 && x < 80) {
    return 'SHORT_CORNER_RIGHT';
  }

  // 3. Low Posts (Flanks of the paint near the block)
  if (y > 16 && y <= 34 && x >= 28 && x <= 40) {
    return 'LEFT_LOW_POST';
  }
  if (y > 16 && y <= 34 && x >= 60 && x <= 72) {
    return 'RIGHT_LOW_POST';
  }

  // 4. Paint (The key area)
  if (y <= 38 && x > 35 && x < 65) {
    return 'PAINT';
  }

  // 5. High Post / Elbows (Around free-throw line)
  if (y > 34 && y <= 50 && x >= 32 && x <= 68) {
    return 'HIGH_POST';
  }

  // 6. Wings
  if (y > 24 && y <= 68 && x < 35) {
    return 'LEFT_WING';
  }
  if (y > 24 && y <= 68 && x > 65) {
    return 'RIGHT_WING';
  }

  // 7. Top of the Key / Perimeter Point
  return 'TOP';
}

/**
 * Zone labels and colors for optional tactical overlay visualization.
 */
export const ZONE_METADATA: Record<CourtZone, { name: string; color: string }> = {
  TOP: { name: "Đỉnh (Top)", color: "rgba(56, 189, 248, 0.15)" },
  LEFT_WING: { name: "Cánh trái (Left Wing)", color: "rgba(59, 130, 246, 0.15)" },
  RIGHT_WING: { name: "Cánh phải (Right Wing)", color: "rgba(168, 85, 247, 0.15)" },
  LEFT_CORNER: { name: "Góc trái (Left Corner)", color: "rgba(34, 197, 94, 0.15)" },
  RIGHT_CORNER: { name: "Góc phải (Right Corner)", color: "rgba(234, 179, 8, 0.15)" },
  HIGH_POST: { name: "High Post", color: "rgba(249, 115, 22, 0.15)" },
  LEFT_LOW_POST: { name: "Low Post Trái", color: "rgba(236, 72, 153, 0.15)" },
  RIGHT_LOW_POST: { name: "Low Post Phải", color: "rgba(244, 63, 94, 0.15)" },
  PAINT: { name: "Khu vực Sơn (Paint)", color: "rgba(239, 68, 68, 0.2)" },
  SHORT_CORNER_LEFT: { name: "Short Corner Trái", color: "rgba(16, 185, 129, 0.15)" },
  SHORT_CORNER_RIGHT: { name: "Short Corner Phải", color: "rgba(245, 158, 11, 0.15)" },
};
