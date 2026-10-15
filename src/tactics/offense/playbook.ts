import {
  DefensiveSettings,
  DefensiveSystem,
  OffenseFormation,
  Player,
  Point,
  Position,
  PlaybookPlay,
} from '../../types/basketball';
import { AIDecisionResult } from '../../engine/simulation/offensiveAI';
import { distance, calculateScreenPosition, clampPoint } from '../../engine/geometry/courtGeometry';
import { COURT_DIMENSIONS } from '../../config/constants';

/**
 * 10 High-Efficiency Tactical Plays (Playbook Đỉnh Cao Có Tỉ Lệ Thắng Cao Nhất)
 * Includes micro-triggers (DHO, back-screens, flares, slips, elevators, hammer pins).
 */
export const OFFENSIVE_PLAYBOOK: PlaybookPlay[] = [
  {
    id: 'spain_pnr',
    name: 'Spain Pick & Roll',
    vietnameseName: 'Spain PnR (Cản Kép Back-Screen)',
    formation: '5-Out',
    expectedWinRate: 88,
    primaryOption: 'Spain back-screen: C roll úp rổ hoặc SG flare ra ném 3 điểm',
    bestAgainst: 'Man-to-Man Drop Coverage hoặc phòng thủ kèm người rát',
    description:
      'Bài đánh càn quét NBA & EuroLeague: Trung phong (C) dâng lên set ball-screen cho PG. Cùng lúc đó, SG âm thầm lẻn vào sau lưng hậu vệ kèm C để set "back-screen", khiến đối phương rơi vào thế 3-đấu-2 không thể chống đỡ.',
    keyTriggers: ['Center set screen đỉnh cho PG', 'SG lẻn đặt back-screen cho hậu vệ kèm C', 'C roll cận thành dứt điểm hoặc SG flare ra 3P'],
    steps: [
      {
        step: 1,
        player: 'C',
        action: 'screen',
        targetPlayer: 'PG',
        targetPoint: { x: 46, y: 55 },
        triggerDescription: 'Trigger 1: Center (C) dâng cao từ sơn lên đỉnh vạch 3 điểm làm on-ball screen cho PG',
      },
      {
        step: 2,
        player: 'SG',
        action: 'screen',
        targetPlayer: 'C',
        targetPoint: { x: 48, y: 38 },
        triggerDescription: 'Trigger 2 (Spain Back-Screen): SG cắt vào trung lộ đặt cản sau lưng hậu vệ đang lùi kèm C',
      },
      {
        step: 3,
        player: 'PG',
        action: 'drive_off_screen',
        targetPoint: { x: 50, y: 26 },
        triggerDescription: 'Trigger 3: PG lướt qua screen của C đột phá trung lộ thu hút toàn bộ sự chú ý',
      },
      {
        step: 4,
        player: 'PG',
        action: 'pass',
        targetPlayer: 'C',
        triggerDescription: 'Trigger 4: PG chuyền bổng alley-oop cho C vừa thoát người cắt thẳng vào rổ',
      },
      {
        step: 5,
        player: 'C',
        action: 'layup',
        targetPoint: { x: 50, y: 13 },
        triggerDescription: 'Finish: C nhận bóng trên không dứt điểm Layup/Dunk cận thành!',
      },
    ],
  },

  {
    id: 'pistol_21',
    name: 'Pistol / 21 Action',
    vietnameseName: 'Pistol 21 (Nhả Bóng DHO & Step-up Screen)',
    formation: '5-Out',
    expectedWinRate: 85,
    primaryOption: 'DHO Wing hoặc Step-up screen xé toang biên',
    bestAgainst: 'Hàng thủ chuyển trạng thái chậm, phòng thủ cánh lỏng',
    description:
      'Chiến thuật chuyển trạng thái trứ danh: PG chuyền bóng sớm sang cánh cho SG, lập tức bứt tốc lao vào thực hiện Dribble Hand-Off (DHO) hoặc Fake Hand-Off, trong khi C dâng lên tiếp ứng Step-up screen.',
    keyTriggers: ['Chuyền sớm sang cánh phải cho SG', 'PG chạy đan chéo Pitch / Handoff', 'Step-up screen càn quét biên'],
    steps: [
      {
        step: 1,
        player: 'PG',
        action: 'pass',
        targetPlayer: 'SG',
        triggerDescription: 'Trigger 1 (Advance Pass): PG chuyền bóng tốc độ ra cánh phải cho SG',
      },
      {
        step: 2,
        player: 'PG',
        action: 'handoff',
        targetPlayer: 'SG',
        targetPoint: { x: 74, y: 52 },
        triggerDescription: 'Trigger 2 (Pistol Hand-off): PG lao vòng qua SG để nhận nhả bóng DHO ở tốc độ cao',
      },
      {
        step: 3,
        player: 'C',
        action: 'screen',
        targetPlayer: 'PG',
        targetPoint: { x: 70, y: 44 },
        triggerDescription: 'Trigger 3 (Step-up Screen): Trung phong C dâng lên đè chốt chặn hậu vệ truy đuổi',
      },
      {
        step: 4,
        player: 'PG',
        action: 'drive_off_screen',
        targetPoint: { x: 55, y: 20 },
        triggerDescription: 'Trigger 4: PG phóng thẳng vào góc nách bảng rổ',
      },
      {
        step: 5,
        player: 'PG',
        action: 'layup',
        targetPoint: { x: 50, y: 13 },
        triggerDescription: 'Finish: Dứt điểm Layup mượt mà khi hậu vệ bị kẹt sau Step-up screen!',
      },
    ],
  },

  {
    id: 'chicago_zoom',
    name: 'Chicago Action (Zoom)',
    vietnameseName: 'Chicago Zoom (Pin-down Kết Hợp DHO)',
    formation: '5-Out',
    expectedWinRate: 86,
    primaryOption: 'SG thoát Pin-down nhận DHO ném 3P hoặc bứt tốc đột phá',
    bestAgainst: 'Hàng thủ co cụm trung lộ, hậu vệ bám đuổi chậm',
    description:
      'Sự kết hợp huỷ diệt giữa màn cản không bóng (Pin-down screen) của PF dưới góc và quả nhả bóng cầm tay (DHO) của C tại cánh, tạo gia tốc cực đại cho tay ném.',
    keyTriggers: ['PF đặt pin-down screen ở góc', 'SG chạy vòng thoát cản lên cánh', 'C nhả bóng DHO cho SG dứt điểm'],
    steps: [
      {
        step: 1,
        player: 'PF',
        action: 'screen',
        targetPlayer: 'SG',
        targetPoint: { x: 80, y: 35 },
        triggerDescription: 'Trigger 1 (Pin-down Screen): PF cản cứng hậu vệ của SG ở góc sân',
      },
      {
        step: 2,
        player: 'PG',
        action: 'pass',
        targetPlayer: 'C',
        triggerDescription: 'Trigger 2: PG nhả bóng an toàn lên đỉnh cho Center (C)',
      },
      {
        step: 3,
        player: 'SG',
        action: 'cut',
        targetPoint: { x: 68, y: 48 },
        triggerDescription: 'Trigger 3: SG bứt tốc thoát người lao lên cánh đón bóng',
      },
      {
        step: 4,
        player: 'C',
        action: 'handoff',
        targetPlayer: 'SG',
        targetPoint: { x: 64, y: 46 },
        triggerDescription: 'Trigger 4 (Zoom DHO): C làm tường nhả bóng tay cho SG ở cự ly 3 điểm',
      },
      {
        step: 5,
        player: 'SG',
        action: 'shoot',
        targetPoint: { x: 50, y: 8 },
        triggerDescription: 'Finish: SG ném 3 điểm hoàn toàn trống trải với đà chạy hoàn hảo!',
      },
    ],
  },

  {
    id: 'horns_flare',
    name: 'Horns Flare & Slip',
    vietnameseName: 'Horns Flare (Cản Đảo Cánh & Slip Cận Thành)',
    formation: 'Horns',
    expectedWinRate: 84,
    primaryOption: 'Flare 3P cánh yếu hoặc C slip úp rổ',
    bestAgainst: 'Man-to-Man bọc lót trung lộ sâu, Help Defense chậm',
    description:
      'Từ đội hình Horns (2 Bigs ở 2 Elbow), PF di chuyển ngang đỉnh đặt Flare Screen cho SF vòng ra góc ném 3P, cùng tích tắc đó Center C giả vờ cản rồi bất ngờ trượt thẳng vào rổ (Slip).',
    keyTriggers: ['Horns formation với 2 Bigs ở Elbow', 'PF set Flare screen ngang đỉnh', 'C Slip trượt thẳng vào rổ'],
    steps: [
      {
        step: 1,
        player: 'PF',
        action: 'screen',
        targetPlayer: 'SF',
        targetPoint: { x: 30, y: 48 },
        triggerDescription: 'Trigger 1 (Flare Screen): PF từ elbow trái di chuyển ngang cản hậu vệ của SF',
      },
      {
        step: 2,
        player: 'SF',
        action: 'relocate',
        targetPoint: { x: 18, y: 50 },
        triggerDescription: 'Trigger 2: SF thoát cản dạt ra góc cánh trống trải',
      },
      {
        step: 3,
        player: 'C',
        action: 'cut',
        targetPoint: { x: 50, y: 22 },
        triggerDescription: 'Trigger 3 (Slip to Rim): Center C giả vờ lên cản rồi bất ngờ cắt lưng trượt thẳng vào sơn',
      },
      {
        step: 4,
        player: 'PG',
        action: 'pass',
        targetPlayer: 'C',
        triggerDescription: 'Trigger 4: PG đọc bài và chọc khe chuẩn xác cho C trống trải dưới rổ',
      },
      {
        step: 5,
        player: 'C',
        action: 'layup',
        targetPoint: { x: 50, y: 13 },
        triggerDescription: 'Finish: C dứt điểm cận thành dễ dàng ghi 2 điểm!',
      },
    ],
  },

  {
    id: 'elevator_screen',
    name: 'Elevator Doors Action',
    vietnameseName: 'Cửa Thang Máy (Elevator Doors)',
    formation: 'Horns',
    expectedWinRate: 87,
    primaryOption: 'Shooter lọt qua khe, 2 Bigs kẹp cửa thang máy nhốt hậu vệ',
    bestAgainst: 'Hàng thủ bám người kèm sát (Tight Trail Man-to-Man)',
    description:
      'Bài đánh kinh điển của Golden State Warriors (Curry/Thompson): Tay ném SG chạy băng qua khe hẹp giữa 2 Big man (PF & C). Ngay khi SG vừa lọt qua, PF và C lập tức khép chặt vai như cửa thang máy đóng sầm lại, nhốt hoàn toàn hậu vệ đối phương ở phía sau.',
    keyTriggers: ['PF & C đứng song song tại vạch ném phạt', 'SG chạy xuyên qua khe giữa 2 Bigs', 'PF & C kẹp chặt cửa thang máy chặn đứng hậu vệ'],
    steps: [
      {
        step: 1,
        player: 'PG',
        action: 'drive_left',
        targetPoint: { x: 32, y: 60 },
        triggerDescription: 'Trigger 1: PG rê bóng hút sự chú ý sang cánh trái',
      },
      {
        step: 2,
        player: 'PF',
        action: 'move',
        targetPoint: { x: 45, y: 44 },
        triggerDescription: 'Trigger 2: PF di chuyển vào trụ bên trái vạch ném phạt chuẩn bị khép cửa',
      },
      {
        step: 3,
        player: 'C',
        action: 'move',
        targetPoint: { x: 55, y: 44 },
        triggerDescription: 'Trigger 3: C di chuyển vào trụ bên phải vạch ném phạt, chừa khe hẹp ở giữa',
      },
      {
        step: 4,
        player: 'SG',
        action: 'cut',
        targetPoint: { x: 50, y: 52 },
        triggerDescription: 'Trigger 4 (Elevator Squeeze): SG lách qua khe hẹp, PF và C lập tức khép chặt vai nhốt hậu vệ!',
      },
      {
        step: 5,
        player: 'PG',
        action: 'pass',
        targetPlayer: 'SG',
        triggerDescription: 'Trigger 5: PG chuyền thẳng vào đỉnh cho SG hoàn toàn trống trải',
      },
    ],
  },

  {
    id: 'hammer_action',
    name: 'San Antonio Hammer Action',
    vietnameseName: 'Spurs Hammer (Đột Phá Đáy & Đóng Đinh Góc Yếu)',
    formation: '5-Out',
    expectedWinRate: 89,
    primaryOption: 'Góc 3P yếu (Corner 3) hoàn toàn trống trải',
    bestAgainst: 'Phòng thủ Help Defense co cụm quá sâu bảo vệ sơn',
    description:
      'Bài đánh thương hiệu của San Antonio Spurs: Người giữ bóng đột phá dũng mãnh sát đường biên đáy để hút toàn bộ hàng thủ về một góc. Ở góc đối diện, Center bất ngờ đặt một "Hammer Screen" đóng đinh hậu vệ cánh yếu, tạo cơ hội chuyền vòng cho tay ném ở góc.',
    keyTriggers: ['Đột phá đáy (Baseline Drive) hút toàn bộ hàng thủ', 'Weakside Hammer Screen đóng đinh hậu vệ góc yếu', 'Đường chuyền Baseline Skip Pass dọn cỗ'],
    steps: [
      {
        step: 1,
        player: 'PG',
        action: 'pass',
        targetPlayer: 'SG',
        triggerDescription: 'Trigger 1: PG luân chuyển bóng sang cánh cho SG',
      },
      {
        step: 2,
        player: 'SG',
        action: 'drive_right',
        targetPoint: { x: 86, y: 18 },
        triggerDescription: 'Trigger 2 (Baseline Penetration): SG đột phá sát biên đáy làm sụp đổ khối phòng thủ',
      },
      {
        step: 3,
        player: 'C',
        action: 'screen',
        targetPlayer: 'SF',
        targetPoint: { x: 20, y: 22 },
        triggerDescription: 'Trigger 3 (Hammer Screen): C di chuyển xuống góc yếu đóng đinh hậu vệ kèm SF',
      },
      {
        step: 4,
        player: 'SG',
        action: 'pass',
        targetPlayer: 'SF',
        triggerDescription: 'Trigger 4 (Hammer Pass): SG tung đường chuyền vắt ngang đáy sang góc trái cho SF',
      },
      {
        step: 5,
        player: 'SF',
        action: 'shoot',
        targetPoint: { x: 50, y: 8 },
        triggerDescription: 'Finish: SF ném 3 điểm góc góc WIDE OPEN với xác suất trúng cao nhất sân!',
      },
    ],
  },

  {
    id: 'double_drag',
    name: 'Double Drag (77 Action)',
    vietnameseName: 'Double Drag (Hai Tầng Cản Người Liên Tiếp)',
    formation: '5-Out',
    expectedWinRate: 85,
    primaryOption: 'Roll vào rổ dũng mãnh hoặc Pop ra 3P cánh',
    bestAgainst: 'Hàng thủ chuyển trạng thái hoặc bối rối khi chọn người switch',
    description:
      'Bài đánh ưa thích của Luka Dončić: Hai cầu thủ to con (PF & C) lần lượt đặt hai quả screen so le nhau ở đỉnh vạch 3 điểm. Quả screen đầu tiên (PF) Pop ra ngoài 3P, quả screen thứ hai (C) Roll thẳng vào rổ, khiến hàng thủ rơi vào thế lưỡng lự.',
    keyTriggers: ['Drag Screen 1 của PF tại đỉnh', 'Drag Screen 2 của C ngay sau đó', 'PF Pop ra ngoài, C Roll vào rổ'],
    steps: [
      {
        step: 1,
        player: 'PF',
        action: 'screen',
        targetPlayer: 'PG',
        targetPoint: { x: 54, y: 62 },
        triggerDescription: 'Trigger 1 (Drag Screen 1): PF dâng lên đặt quả cản thứ nhất cho PG',
      },
      {
        step: 2,
        player: 'C',
        action: 'screen',
        targetPlayer: 'PG',
        targetPoint: { x: 46, y: 55 },
        triggerDescription: 'Trigger 2 (Drag Screen 2): C dâng lên tiếp nối đặt quả cản thứ hai',
      },
      {
        step: 3,
        player: 'PG',
        action: 'drive_off_screen',
        targetPoint: { x: 50, y: 32 },
        triggerDescription: 'Trigger 3: PG lướt qua cả 2 quả screen lao thẳng vào trung lộ',
      },
      {
        step: 4,
        player: 'PF',
        action: 'pop',
        targetPoint: { x: 68, y: 56 },
        triggerDescription: 'Trigger 4: PF Pop giật lùi ra cánh 3P trong khi C đè người dưới rổ',
      },
      {
        step: 5,
        player: 'PG',
        action: 'layup',
        targetPoint: { x: 50, y: 13 },
        triggerDescription: 'Finish: Hàng thủ bị kéo giãn sang hai cánh, PG thoải mái dứt điểm Layup!',
      },
    ],
  },

  {
    id: 'iverson_cut',
    name: 'Iverson Cut into Pick & Pop',
    vietnameseName: 'Iverson Cut (Cắt Ngang Hai Elbow & Pick Pop)',
    formation: '4-Out 1-In',
    expectedWinRate: 83,
    primaryOption: 'SG nhận bóng với đà chạy cao, Pick & Pop ném 3P',
    bestAgainst: 'Hàng thủ kèm người bắt bài cánh bóng (Deny Defense)',
    description:
      'Bài đánh kinh điển của Allen Iverson: Tay ghi điểm xuất phát từ góc biên, phi nước đại cắt ngang qua hai Elbow được che chắn bởi 2 bigs. Sau khi đón bóng ở cánh đối diện, lập tức phối hợp Pick & Pop để ném rổ.',
    keyTriggers: ['SG chạy Iverson Cut lướt qua hai Elbow', 'PG chuyền bóng với điểm rơi chuẩn xác', 'Pick & Pop phối hợp dứt điểm'],
    steps: [
      {
        step: 1,
        player: 'SG',
        action: 'cut',
        targetPoint: { x: 50, y: 44 },
        triggerDescription: 'Trigger 1 (Iverson Cut): SG bứt tốc cắt ngang từ cánh trái qua đỉnh hai Elbow',
      },
      {
        step: 2,
        player: 'PG',
        action: 'pass',
        targetPlayer: 'SG',
        triggerDescription: 'Trigger 2: PG nhồi bóng và chuyền điểm rơi cho SG tại cánh phải',
      },
      {
        step: 3,
        player: 'PF',
        action: 'screen',
        targetPlayer: 'SG',
        targetPoint: { x: 74, y: 48 },
        triggerDescription: 'Trigger 3: PF dâng lên phối hợp Pick & Pop cho SG',
      },
      {
        step: 4,
        player: 'SG',
        action: 'drive_off_screen',
        targetPoint: { x: 62, y: 28 },
        triggerDescription: 'Trigger 4: SG đột phá xé toang góc phòng thủ',
      },
      {
        step: 5,
        player: 'SG',
        action: 'layup',
        targetPoint: { x: 50, y: 13 },
        triggerDescription: 'Finish: Dứt điểm Layup cận thành khi hậu vệ bị bỏ lại phía sau!',
      },
    ],
  },

  {
    id: 'ucla_high_low',
    name: 'UCLA Cut into High-Low',
    vietnameseName: 'UCLA High-Low (Cắt Cận Thành & Bọc Lót Cầu Cao)',
    formation: '4-Out 1-In',
    expectedWinRate: 84,
    primaryOption: 'UCLA cutter ghi điểm trực tiếp hoặc High-Low chuyền vào Low Post',
    bestAgainst: 'Phòng thủ 2-3 Zone hoặc các đội hình thiếu trung phong bảo vệ rổ',
    description:
      'Bài đánh huyền thoại của HLV John Wooden (UCLA): PG chuyền sang cánh cho SF, rồi bứt tốc chạy bổ thẳng vào rổ nhờ screen sau lưng của C ở High Post. Nếu hậu vệ co cụm bọc lót, C lập tức nhận bóng nhồi tiếp cho PF ở Low Post.',
    keyTriggers: ['PG chuyền sang cánh cho SF', 'UCLA back-screen của Center ở High Post', 'Cắt thẳng vào rổ hoặc chuyền High-Low'],
    steps: [
      {
        step: 1,
        player: 'PG',
        action: 'pass',
        targetPlayer: 'SF',
        triggerDescription: 'Trigger 1: PG chuyền bóng sang cánh trái cho SF',
      },
      {
        step: 2,
        player: 'C',
        action: 'screen',
        targetPlayer: 'PG',
        targetPoint: { x: 42, y: 46 },
        triggerDescription: 'Trigger 2 (UCLA Screen): C ở High Post đặt cản sau lưng hậu vệ kèm PG',
      },
      {
        step: 3,
        player: 'PG',
        action: 'cut',
        targetPoint: { x: 48, y: 18 },
        triggerDescription: 'Trigger 3 (UCLA Cut): PG phi như tên bắn bổ thẳng vào khu vực dưới rổ',
      },
      {
        step: 4,
        player: 'SF',
        action: 'pass',
        targetPlayer: 'PG',
        triggerDescription: 'Trigger 4: SF chuyền bóng dọn cỗ cho PG đang lao vào rổ',
      },
      {
        step: 5,
        player: 'PG',
        action: 'layup',
        targetPoint: { x: 50, y: 13 },
        triggerDescription: 'Finish: PG nhận bóng dứt điểm Layup đảo tay ghi điểm mãn nhãn!',
      },
    ],
  },

  {
    id: 'corner_ghost',
    name: 'Corner Zoom / Ghost Screen',
    vietnameseName: 'Ghost Screen (Cản Giả Trượt Ra Góc 3 Điểm)',
    formation: '5-Out',
    expectedWinRate: 86,
    primaryOption: 'Ghost screener thoát ra góc 3P hoặc PG drive thẳng',
    bestAgainst: 'Phòng thủ Switch (đổi người) vội vàng hoặc 3-2 Zone',
    description:
      'Chiêu thức hiện đại trừng phạt hàng thủ thích Switch: Screener lao lên hùng dũng như sắp va chạm set screen, nhưng vào tích tắc cuối cùng "biến mất như bóng ma" (Ghost), bất ngờ trượt thẳng ra vạch 3 điểm khiến hai hậu vệ va vào nhau.',
    keyTriggers: ['Screener vờ lên đặt screen cứng', 'Ghost Slip: trượt không tiếp xúc ra vạch 3 điểm', 'Hai hậu vệ đối phương giẫm chân nhau'],
    steps: [
      {
        step: 1,
        player: 'PG',
        action: 'dribble',
        targetPoint: { x: 58, y: 58 },
        triggerDescription: 'Trigger 1: PG nhồi bóng lệch sang cánh phải',
      },
      {
        step: 2,
        player: 'PF',
        action: 'move',
        targetPoint: { x: 52, y: 54 },
        triggerDescription: 'Trigger 2: PF lao lên hùng hổ giả vờ set screen on-ball',
      },
      {
        step: 3,
        player: 'PF',
        action: 'pop',
        targetPoint: { x: 74, y: 52 },
        triggerDescription: 'Trigger 3 (Ghost Slip): PF bất ngờ bẻ góc lượn ra ngoài vạch 3P không hề chạm người',
      },
      {
        step: 4,
        player: 'PG',
        action: 'pass',
        targetPlayer: 'PF',
        triggerDescription: 'Trigger 4: Hai hậu vệ va vào nhau lúng túng, PG nhả bóng ngay cho PF',
      },
      {
        step: 5,
        player: 'PF',
        action: 'shoot',
        targetPoint: { x: 50, y: 8 },
        triggerDescription: 'Finish: PF ném 3 điểm khi hậu vệ hoàn toàn mất phương hướng!',
      },
    ],
  },
];

/**
 * Get playbook play by ID.
 */
export function getPlaybookPlay(id: string): PlaybookPlay | undefined {
  return OFFENSIVE_PLAYBOOK.find((p) => p.id === id);
}

/**
 * AI Auto-Selector: Chooses the highest win-percentage counter-play
 * against the opponent's current defensive system and settings.
 */
export function selectBestPlaybookPlay(
  defensiveSystem: DefensiveSystem,
  defensiveSettings: DefensiveSettings
): PlaybookPlay {
  if (defensiveSystem === '2-3 Zone') {
    // 2-3 Zone packs paint, weak against UCLA cut, Chicago Zoom, or Horns Flare
    return getPlaybookPlay('ucla_high_low') || OFFENSIVE_PLAYBOOK[0];
  } else if (defensiveSystem === '3-2 Zone') {
    // 3-2 Zone attacks perimeter, vulnerable in corners (Hammer action) or Elevator
    return getPlaybookPlay('hammer_action') || OFFENSIVE_PLAYBOOK[0];
  } else if (defensiveSystem === '1-3-1 Zone') {
    // 1-3-1 Zone vulnerable to Corner Ghost or Double Drag
    return getPlaybookPlay('corner_ghost') || OFFENSIVE_PLAYBOOK[0];
  } else {
    // Man-to-Man: Spain PnR is the #1 killer against Drop coverage or Switch
    if (defensiveSettings.screenPolicy === 'Switch') {
      return getPlaybookPlay('corner_ghost') || getPlaybookPlay('spain_pnr')!;
    }
    return getPlaybookPlay('spain_pnr')!;
  }
}

/**
 * Execute a structured Playbook step in the simulation.
 */
export function getPlaybookDecisionForStep(
  play: PlaybookPlay,
  stepNumber: number,
  offense: Record<Position, Player>,
  defense: Record<Position, Player>,
  ballHolder: Position
): AIDecisionResult {
  const currentStep = play.steps.find((s) => s.step === stepNumber) || play.steps[play.steps.length - 1];
  const player = currentStep.player;
  const playerCoord = offense[player].coord;
  const action = currentStep.action;

  let path: Point[] = [playerCoord];
  if (currentStep.targetPoint) {
    path = [playerCoord, currentStep.targetPoint];
  } else if (action === 'layup') {
    path = [playerCoord, { x: 50, y: 13 }];
  } else if (action === 'shoot' || action === 'shoot_off_screen') {
    path = [playerCoord, { x: 50, y: 8 }];
  } else if (action === 'pass' && currentStep.targetPlayer) {
    path = [playerCoord, offense[currentStep.targetPlayer].coord];
  }

  const isFinishing = action === 'shoot' || action === 'layup' || action === 'shoot_off_screen';

  return {
    draft: {
      player,
      action,
      targetPlayer: currentStep.targetPlayer,
      path,
      isValid: true,
    },
    thought: `📘 [PLAYBOOK: ${play.name}] Nhịp ${stepNumber}/5: ${currentStep.triggerDescription}`,
    tacticName: `${play.name} (Nhịp ${stepNumber})`,
    isFinishingAttempt: isFinishing,
  };
}
