import { DefensiveSettings, Position } from '../types/basketball';

/**
 * Global Configuration and Constants for Basketball Tactical Lab
 * Single source of truth for working title and court geometry dimensions.
 */
export const APP_CONFIG = {
  TITLE: "BASKETBALL TACTICAL LAB",
  SUBTITLE: "Hệ thống sa bàn chiến thuật & mô phỏng phòng thủ 5v5",
  VERSION: "1.0.0",
} as const;

export const COURT_DIMENSIONS = {
  WIDTH: 100, // Normalized X: 0 to 100
  HEIGHT: 100, // Normalized Y: 0 to 100
  BASKET: { x: 50, y: 8 }, // Basket location near top baseline
  BACKBOARD_Y: 5.5,
  BACKBOARD_WIDTH: 12,
  RIM_RADIUS: 2.8,
  RESTRICTED_RADIUS: 7.5,
  PAINT: {
    LEFT: 34,
    RIGHT: 66,
    TOP: 0,
    BOTTOM: 38,
  },
  FREE_THROW_LINE_Y: 38,
  FREE_THROW_CIRCLE_RADIUS: 12,
  THREE_POINT_RADIUS: 43.5,
  CORNER_THREE_X_LEFT: 8,
  CORNER_THREE_X_RIGHT: 92,
  CORNER_THREE_BREAK_Y: 22,
  CENTER_CIRCLE_RADIUS: 12,
} as const;

export const POSITIONS: readonly Position[] = ['PG', 'SG', 'SF', 'PF', 'C'] as const;

export const POSITION_DESCRIPTIONS: Record<Position, string> = {
  PG: "Point Guard (Hậu vệ dẫn bóng)",
  SG: "Shooting Guard (Hậu vệ ghi điểm)",
  SF: "Small Forward (Tiền đạo phụ)",
  PF: "Power Forward (Tiền đạo chính)",
  C: "Center (Trung phong)",
};

export const DEFAULT_DEFENSIVE_SETTINGS: DefensiveSettings = {
  height: 50,
  width: 50,
  compactness: 60,
  pressure: 55,
  helpDefense: 65,
  ballSideShift: 60,
  paintPerimeterBias: 0, // -100: Protect Paint, +100: Protect Perimeter
  screenPolicy: 'Auto',
};

export const SLIDER_TOOLTIPS = {
  height: "Mức độ hàng thủ dâng cao khỏi khu vực rổ (0 = lùi sâu bảo vệ rổ, 100 = dâng cao áp sát vạch 3 điểm).",
  width: "Mức độ hàng thủ mở rộng sang hai biên để bao quát góc và cánh (0 = co hẹp trung lộ, 100 = bao quát sát biên).",
  compactness: "Mức độ các hậu vệ giữ cự ly gần nhau và khối phòng thủ vững chắc (khác với Độ rộng, Compactness kéo các vị trí yếu về tâm khối).",
  pressure: "Mức độ áp sát người cầm bóng và thu hẹp khoảng cách phòng thủ kèm người.",
  helpDefense: "Mức độ hậu vệ không kèm bóng rời vị trí để hỗ trợ bịt đường drive đột phá vào sơn.",
  ballSideShift: "Mức độ toàn bộ khối phòng thủ đồng loạt dịch chuyển hướng về phía có bóng (Shell Shift).",
  paintPerimeterBias: "Ưu tiên bảo vệ: Nghiêng về bịt chặt khu vực dưới rổ (Paint) hay phong tỏa ném xa (Perimeter).",
  screenPolicy: "Chiến thuật xử lý screen trong Man-to-Man: Stay (giữ nguyên kèm người), Switch (đổi kèm), Auto (tự động đổi khi chạm cản).",
} as const;
