import { OffenseFormation, Point, Position } from '../../types/basketball';

/**
 * Standard Offensive Formations in normalized court coordinates (0-100).
 * Basket is at { x: 50, y: 8 }. Offense attacks toward decreasing Y.
 */
export const OFFENSIVE_FORMATIONS: Record<
  Exclude<OffenseFormation, 'Custom'>,
  Record<Position, Point>
> = {
  '5-Out': {
    PG: { x: 50, y: 78 }, // Top of key
    SG: { x: 84, y: 62 }, // Right wing
    SF: { x: 16, y: 62 }, // Left wing
    PF: { x: 88, y: 16 }, // Right corner
    C:  { x: 12, y: 16 }, // Left corner
  },

  '4-Out 1-In': {
    PG: { x: 50, y: 78 }, // Top of key
    SG: { x: 82, y: 60 }, // Right wing
    SF: { x: 18, y: 60 }, // Left wing
    PF: { x: 88, y: 16 }, // Right corner
    C:  { x: 50, y: 22 }, // In the dunker spot / low post
  },

  '3-Out 2-In': {
    PG: { x: 50, y: 78 }, // Top
    SG: { x: 82, y: 60 }, // Right wing
    SF: { x: 18, y: 60 }, // Left wing
    PF: { x: 34, y: 22 }, // Left low post
    C:  { x: 66, y: 22 }, // Right low post
  },

  'Horns': {
    PG: { x: 50, y: 82 }, // Top
    SG: { x: 88, y: 16 }, // Right corner
    SF: { x: 12, y: 16 }, // Left corner
    PF: { x: 36, y: 44 }, // Left elbow (high post)
    C:  { x: 64, y: 44 }, // Right elbow (high post)
  },

  'Box': {
    PG: { x: 50, y: 78 }, // Top
    SG: { x: 34, y: 46 }, // Left elbow
    SF: { x: 66, y: 46 }, // Right elbow
    PF: { x: 34, y: 20 }, // Left low block
    C:  { x: 66, y: 20 }, // Right low block
  },

  'Stack': {
    PG: { x: 50, y: 80 }, // Top
    SG: { x: 82, y: 55 }, // Right wing spacer
    SF: { x: 30, y: 46 }, // High stack
    PF: { x: 30, y: 30 }, // Mid stack
    C:  { x: 30, y: 16 }, // Low stack near baseline
  },
};

export const FORMATION_DESCRIPTIONS: Record<OffenseFormation, string> = {
  '5-Out': "5 cầu thủ mở rộng tối đa vòng ngoài (Perimeter), tạo khoảng trống mênh mông trong sơn để drive.",
  '4-Out 1-In': "4 cầu thủ giãn ngoài vạch 3 điểm và 1 Bigman (C) hoạt động sâu trong sơn hoặc dunker spot.",
  '3-Out 2-In': "Đội hình cổ điển với 3 cầu thủ vòng ngoài và 2 Bigman (PF, C) chiếm lĩnh hai bên cọc bảng rổ (Low Post).",
  'Horns': "Đội hình sừng trâu hiện đại với 2 Bigman dâng cao ở 2 Elbow, sẵn sàng pick & roll hoặc pop.",
  'Box': "4 cầu thủ xếp thành hình hộp chữ nhật trong sơn (2 Elbow, 2 Block) thuận lợi chạy bài phân màng cản.",
  'Stack': "3 cầu thủ xếp hàng dọc (Stack) dồn về một bên cánh để thực hiện các bài chạy thoát người bất ngờ.",
  'Custom': "Đội hình tùy chỉnh do người dùng tự do kéo thả cầu thủ tới các tọa độ mong muốn trên sân.",
};

const STORAGE_KEY_CUSTOM_FORMATION = 'basketball_lab_custom_formation';

export function loadSavedCustomFormation(): Record<Position, Point> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_FORMATION);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCustomFormation(formation: Record<Position, Point>): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_FORMATION, JSON.stringify(formation));
  } catch (err) {
    console.error("Failed to save custom formation to local storage:", err);
  }
}
