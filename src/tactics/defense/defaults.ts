import { DefensiveSystem } from '../../types/basketball';

export const DEFENSIVE_SYSTEMS: readonly DefensiveSystem[] = [
  'Man-to-Man',
  '2-3 Zone',
  '3-2 Zone',
  '1-3-1 Zone',
] as const;

export const DEFENSE_DESCRIPTIONS: Record<DefensiveSystem, string> = {
  'Man-to-Man': "Phòng thủ 1 kèm 1 truyền thống: mỗi hậu vệ chịu trách nhiệm theo sát đối thủ tương ứng, kết hợp cự ly kèm người (Pressure), hỗ trợ trung lộ (Help Defense) và chính sách Screen (Stay/Switch/Auto).",
  '2-3 Zone': "Phòng thủ khu vực 2-3: 2 hậu vệ trên đỉnh bảo vệ vòng cung và thu hẹp cánh; 3 cầu thủ dưới bảo vệ sơn, cọc góc (Corner) và hỗ trợ rổ. Cực kỳ hiệu quả chống drive và bảo vệ dưới bảng rổ.",
  '3-2 Zone': "Phòng thủ khu vực 3-2: 3 cầu thủ dâng cao bao quát toàn bộ perimeter và hai cánh; 2 Bigman neo dưới đáy rổ. Ưu tiên phong tỏa ném 3 điểm bên ngoài.",
  '1-3-1 Zone': "Phòng thủ khu vực 1-3-1: 1 Point trên đỉnh, 3 cầu thủ giăng ngang tuyến giữa, 1 hậu vệ quét đường đáy (Baseline runner). Tạo bẫy trap cánh và áp lực liên hoàn.",
};
