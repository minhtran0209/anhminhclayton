import {
  DefensiveSettings,
  DefensiveSystem,
  DefenseAdaptiveMemory,
  DefenseStopAnalysis,
  Player,
  Point,
  Position,
  TacticalEvent,
} from '../../types/basketball';
import { distance } from '../geometry/courtGeometry';
import { COURT_DIMENSIONS } from '../../config/constants';

export interface DefenseDecision {
  adaptedSystem: DefensiveSystem;
  adaptedSettings: DefensiveSettings;
  thought: string;
  tacticalAdjustment: string;
  updatedMemory: DefenseAdaptiveMemory;
  suggestedFocusDefender?: Position;
}

/**
 * AI Defense Real-time Learning and Adaptation Engine.
 * Analyzes opponent tendencies, learns from mistakes (points conceded),
 * and autonomously adjusts defensive formation, system, and tactical sliders.
 */
export function analyzeOpponentAndAdaptDefense(
  offense: Record<Position, Player>,
  defense: Record<Position, Player>,
  ballHolder: Position,
  currentSystem: DefensiveSystem,
  currentSettings: DefensiveSettings,
  memory: DefenseAdaptiveMemory,
  lastEvent: TacticalEvent | null,
  possessionStep: number = 1
): DefenseDecision {
  const basket = COURT_DIMENSIONS.BASKET; // { x: 50, y: 8 }
  const ballCoord = offense[ballHolder].coord;
  const distToBasket = distance(ballCoord, basket);

  const updatedMemory: DefenseAdaptiveMemory = {
    ...memory,
    recentOffenseActions: [...(memory?.recentOffenseActions || [])],
    activeAdjustments: [...(memory?.activeAdjustments || [])],
  };

  if (lastEvent) {
    updatedMemory.recentOffenseActions.push(lastEvent.action);
    if (updatedMemory.recentOffenseActions.length > 8) {
      updatedMemory.recentOffenseActions.shift();
    }
  }

  // Count recent actions
  const recentActions = updatedMemory.recentOffenseActions;
  const screenCount = recentActions.filter((a) => a === 'screen' || a === 'shoot_off_screen' || a === 'drive_off_screen').length;
  const passCount = recentActions.filter((a) => a === 'pass').length;
  const insideCount = recentActions.filter((a) => a === 'layup').length;

  let adaptedSystem: DefensiveSystem = currentSystem;
  const adaptedSettings: DefensiveSettings = { ...currentSettings };
  let thought = '';
  let tacticalAdjustment = '';

  // 1. SỬA SAI KHI ĐỐI THỦ VỪA GHI ĐIỂM (Learning from Points Conceded)
  if (lastEvent?.shotResult?.made) {
    const is3Pt = lastEvent.shotResult.shotType === 'three';
    const points = lastEvent.shotResult.points;

    if (is3Pt) {
      // Đối phương vừa ném 3 điểm thành công -> Ngoại vi đang bị hở!
      updatedMemory.consecutiveConceded = (memory?.consecutiveConceded || 0) + 1;
      updatedMemory.consecutiveStops = 0;
      updatedMemory.opponentTendency = 'perimeter_threes';
      updatedMemory.lastConcededReason = 'Ngoại vi bị hở (Conceded 3PT)';

      // Tự động chuyển hệ thống khắc chế 3PT: 3-2 Zone hoặc 1-3-1 Zone dâng cao
      adaptedSystem = Math.random() < 0.6 ? '3-2 Zone' : '1-3-1 Zone';
      adaptedSettings.height = Math.min(85, adaptedSettings.height + 15); // Dâng cao ép ném
      adaptedSettings.width = Math.min(85, adaptedSettings.width + 12);   // Mở rộng cánh
      adaptedSettings.paintPerimeterBias = 65;                             // Ưu tiên bảo vệ 3P
      adaptedSettings.pressure = Math.min(90, adaptedSettings.pressure + 10); // Áp sát contest

      thought = `🛡️ [SỬA SAI THỜI GIAN THỰC] Bị thủng 3 điểm (+${points}đ) do kèm lỏng -> AI phòng thủ chuyển sang "${adaptedSystem}", dâng Height lên ${adaptedSettings.height} và khóa chặt 3P (Bias +65)!`;
      tacticalAdjustment = `Chuyển ${adaptedSystem} • Ép Ngoại Vi (Height ${adaptedSettings.height})`;
      updatedMemory.activeAdjustments = ['3-2 Zone dâng cao', 'Bịt vạch 3 điểm', 'Tăng áp lực contest'];
      return { adaptedSystem, adaptedSettings, thought, tacticalAdjustment, updatedMemory };
    } else {
      // Đối phương vừa ghi điểm cận thành / Layup -> Khu vực dưới rổ bị xé toang!
      updatedMemory.consecutiveConceded = (memory?.consecutiveConceded || 0) + 1;
      updatedMemory.consecutiveStops = 0;
      updatedMemory.opponentTendency = 'paint_attack';
      updatedMemory.lastConcededReason = 'Bị khoét cận thành (Conceded Paint Layup)';

      // Tự động chuyển sang 2-3 Zone bịt kín khu vực 3 giây
      adaptedSystem = '2-3 Zone';
      adaptedSettings.compactness = Math.min(95, adaptedSettings.compactness + 20); // Co cụm trung lộ
      adaptedSettings.paintPerimeterBias = -70;                                     // Bịt kín sơn
      adaptedSettings.helpDefense = Math.min(90, adaptedSettings.helpDefense + 15); // Tăng bọc lót
      adaptedSettings.height = Math.max(30, adaptedSettings.height - 15);          // Lùi sâu bảo vệ bảng rổ

      thought = `🛡️ [SỬA SAI THỜI GIAN THỰC] Để lọt rổ cận thành (+${points}đ) -> AI phòng thủ lập tức chuyển sang "2-3 Zone", kéo Compactness lên ${adaptedSettings.compactness} và khoá chặt sơn (Bias -70)!`;
      tacticalAdjustment = `Chuyển 2-3 Zone • Khóa Chặt Khu Sơn (Compactness ${adaptedSettings.compactness})`;
      updatedMemory.activeAdjustments = ['2-3 Zone bịt sơn', 'Tăng Compactness', 'Hỗ trợ Help Defense'];
      return { adaptedSystem, adaptedSettings, thought, tacticalAdjustment, updatedMemory };
    }
  }

  // 2. BẮT BÀI ĐỐI THỦ DỰA TRÊN TENDENCY VÀ TÌNH HUỐNG HIỆN TẠI (Proactive Opponent Counter)
  if (screenCount >= 2 || lastEvent?.action === 'screen' || lastEvent?.action === 'shoot_off_screen') {
    // Đối thủ đang khai thác Pick & Roll / Screen
    updatedMemory.opponentTendency = 'pick_and_roll';
    adaptedSystem = 'Man-to-Man';
    adaptedSettings.screenPolicy = 'Switch'; // Đổi người kèm ngay lập tức
    adaptedSettings.helpDefense = Math.min(90, adaptedSettings.helpDefense + 12);
    adaptedSettings.pressure = Math.min(85, adaptedSettings.pressure + 8);

    thought = `🛡️ [BẮT BÀI PICK & ROLL] Phát hiện đối phương liên tục dựng cản Screen -> AI phòng thủ chuyển Man-to-Man với Screen Policy "SWITCH" & tăng Help Defense (${adaptedSettings.helpDefense}) để dập tắt khoảng trống!`;
    tacticalAdjustment = 'Man-to-Man Switch • Bọc lót Screen';
    updatedMemory.activeAdjustments = ['Screen Switch', 'Tăng Help Defense'];
    return { adaptedSystem, adaptedSettings, thought, tacticalAdjustment, updatedMemory };
  }

  if (insideCount >= 2 || distToBasket <= 28) {
    // Cầu thủ đối phương đang áp sát khu vực hình thang
    updatedMemory.opponentTendency = 'paint_attack';
    adaptedSystem = '2-3 Zone';
    adaptedSettings.compactness = Math.min(90, adaptedSettings.compactness + 10);
    adaptedSettings.paintPerimeterBias = -55;
    adaptedSettings.helpDefense = Math.min(90, adaptedSettings.helpDefense + 10);

    thought = `🛡️ [BẮT BÀI ĐỘT PHÁ] Cầu thủ cầm bóng đang tiếp cận cận thành (${Math.round(distToBasket)}m) -> AI phòng thủ siết chặt "2-3 Zone", kéo giãn trợ thủ và phong tỏa đường vào rổ!`;
    tacticalAdjustment = '2-3 Zone • Thu hẹp cự ly bảo vệ bảng rổ';
    updatedMemory.activeAdjustments = ['2-3 Zone siết chặt', 'Bảo vệ bảng rổ'];
    return { adaptedSystem, adaptedSettings, thought, tacticalAdjustment, updatedMemory };
  }

  if (passCount >= 3) {
    // Đối thủ đang luân chuyển bóng nhiều đường chuyền
    updatedMemory.opponentTendency = 'ball_movement';
    adaptedSettings.pressure = Math.min(90, adaptedSettings.pressure + 15); // Tăng áp lực để cướp bóng
    adaptedSettings.ballSideShift = Math.min(85, adaptedSettings.ballSideShift + 12);

    thought = `🛡️ [BẪY CƯỚP BÓNG / TRAP] Đối thủ chuyền bóng nhiều nhịp -> AI tăng mạnh Áp lực (Pressure ${adaptedSettings.pressure}) và đẩy Ball-side Shift lên ${adaptedSettings.ballSideShift} để ép Turnover cướp bóng!`;
    tacticalAdjustment = `Tăng Áp Lực (Pressure ${adaptedSettings.pressure}) • Chặn đường chuyền`;
    updatedMemory.activeAdjustments = ['Áp sát cướp bóng', 'Overload cánh giữ bóng'];
    return { adaptedSystem, adaptedSettings, thought, tacticalAdjustment, updatedMemory };
  }

  // 3. DUY TRÌ VÀ GIA TĂNG ÁP LỰC SAU KHI PHÒNG THỦ THÀNH CÔNG (Reinforce on Stop / Steal)
  if (lastEvent?.isSteal || (lastEvent?.shotResult && !lastEvent.shotResult.made)) {
    updatedMemory.consecutiveStops = (memory?.consecutiveStops || 0) + 1;
    updatedMemory.consecutiveConceded = 0;

    if (lastEvent?.isSteal) {
      thought = `🔥 [PHÒNG THỦ ĐẮC THẮNG] Cướp bóng thành công! Tiếp tục duy trì áp lực cao (Pressure ${adaptedSettings.pressure}) để đè bẹp nhịp tấn công đối thủ!`;
      tacticalAdjustment = 'Duy Trì Bẫy Áp Lực Cao • Đón đầu phản công';
    } else {
      thought = `🔥 [PHÒNG THỦ ĐẮC THẮNG] Bắt bài cú ném thành công (${lastEvent.shotResult?.contestLevel})! AI phòng thủ củng cố khối đội hình vững chắc.`;
      tacticalAdjustment = 'Củng Cố Đội Hình • Duy trì phong độ cản phá';
    }

    return { adaptedSystem, adaptedSettings, thought, tacticalAdjustment, updatedMemory };
  }

  // Mặc định: Phân tích cự ly và chủ động áp sát
  thought = `🛡️ [THEO DÕI THỜI GIAN THỰC] AI phân tích vị trí ${ballHolder} (${Math.round(distToBasket)}m) -> Cân bằng khối ${adaptedSystem}, sẵn sàng ứng phó bài chạy đối phương.`;
  tacticalAdjustment = `Duy trì ${adaptedSystem} • Sẵn sàng chuyển trạng thái`;
  return { adaptedSystem, adaptedSettings, thought, tacticalAdjustment, updatedMemory };
}

/**
 * Generate Defense Stop Tactical Analysis on successful defensive possession.
 * Evaluates why the defense won the possession and awards points/rewards.
 */
export function generateDefenseStopAnalysis(
  events: TacticalEvent[],
  finalEvent: TacticalEvent,
  systemUsed: DefensiveSystem,
  settings: DefensiveSettings,
  possessionIndex: number
): DefenseStopAnalysis {
  const isSteal = Boolean(finalEvent.isSteal);
  const stealer = finalEvent.stealer || 'PG';
  const shot = finalEvent.shotResult;

  let title = '';
  let counterStrategy = '';
  let reward = 100;
  const keyMoves: string[] = [];

  if (isSteal) {
    title = `CƯỚP BÓNG XUẤT THẦN: ${stealer} Thò Tay Steal Tuyệt Vời!`;
    counterStrategy = `Áp lực tầm gần (${settings.pressure}%) và bẫy đường chuyền bất ngờ.`;
    reward = 160 + Math.round(settings.pressure * 0.5);
    keyMoves.push(
      `Hậu vệ ${stealer} áp sát cự ly ${finalEvent.stealDistance}m cướp bóng chớp nhoáng`,
      `Ép đối phương mất quyền kiểm soát (Turnover) ngay ở bước ${finalEvent.stepNumber}`,
      `Khối đội hình ${systemUsed} gây nghẹt thở hoàn toàn đối phương`
    );
  } else if (shot) {
    if (shot.contestLevel === 'HEAVILY_CONTESTED') {
      title = `PHÒNG THỦ KÍN KẼ: Ép Đối Phương Ném Hụt Dưới Áp Sát Ngột Ngạt!`;
      counterStrategy = `Hậu vệ ${shot.contestDefender} áp sát cự ly cực gần (${shot.contestDistance}m), giảm xác suất ném xuống chỉ còn ${shot.probability}%.`;
      reward = 130;
      keyMoves.push(
        `Áp sát Smothered cự ly ${shot.contestDistance}m bởi ${shot.contestDefender}`,
        `Hạ thấp tỉ lệ dứt điểm xuống chỉ còn ${shot.probability}%`,
        `Bọc lót hoàn hảo từ khối phòng thủ ${systemUsed}`
      );
    } else if (shot.distanceToBasket > 52) {
      title = `BẮT BÀI CỰ LY: Ép Đối Phương Ném Tuyệt Vọng Từ Quá Xa Ngoài Sơn!`;
      counterStrategy = `Bịt kín toàn bộ đường đột phá cận thành, ép ném xa với tỉ lệ thành công < 5%.`;
      reward = 110;
      keyMoves.push(
        `Khóa chặt sơn buộc đối phương phải ném xa cự ly ${shot.distanceToBasket}m`,
        `Tỉ lệ thành công bị dìm xuống mức thấp nhất (${shot.probability}%)`,
        `Hệ thống ${systemUsed} giữ cự ly chuẩn xác`
      );
    } else {
      title = `PHÒNG THỦ THÀNH CÔNG: Chặn Đứng Đợt Tấn Công Của Đối Thủ!`;
      counterStrategy = `Bao quát vị trí tốt, contest kịp thời ở cự ly ${shot.contestDistance}m.`;
      reward = 95;
      keyMoves.push(
        `Contest ${shot.contestLevel} cự ly ${shot.contestDistance}m`,
        `Bảo vệ rổ an toàn, thu hồi bóng thành công`
      );
    }
  } else {
    title = `PHÒNG THỦ VỮNG CHẮC: Chặn Đứng Tấn Công!`;
    counterStrategy = `Hệ thống ${systemUsed} phong tỏa mọi hướng bóng.`;
    reward = 80;
    keyMoves.push(`Ngăn chặn triển khai bài chạy của đối phương`);
  }

  const explanation = isSteal
    ? `Hàng phòng thủ ${systemUsed} đã đọc vị được nhịp di chuyển chậm của đối phương. Với thiết lập Áp lực (Pressure: ${settings.pressure}), ${stealer} đã lập tức bứt tốc cướp bóng ở cự ly ${finalEvent.stealDistance}m, đoạt lại quyền tấn công.`
    : `Chiến thuật ${systemUsed} đã hoàn toàn bắt bài ý đồ của đối phương. Bằng cách điều chỉnh cự ly và bọc lót Help Defense kịp thời, các hậu vệ đã hạ thấp xác suất dứt điểm của đối thủ xuống còn ${shot?.probability || 5}%, bảo toàn mành lưới thành công.`;

  return {
    id: `def-stop-${possessionIndex}-${Date.now()}`,
    title,
    systemUsed,
    settingsAdjusted: { ...settings },
    opponentTacticDetected: isSteal ? 'Chuyền bóng / Rê dắt thiếu quan sát' : shot?.shotType === 'three' ? 'Ném 3 điểm ngoại vi' : 'Đột phá cận thành',
    counterStrategy,
    reward,
    explanation,
    keyDefenseMoves: keyMoves,
    isSteal,
    stealer: isSteal ? stealer : undefined,
    contestLevel: shot?.contestLevel,
  };
}
