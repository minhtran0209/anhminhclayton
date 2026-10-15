import { COURT_DIMENSIONS } from '../../config/constants';
import { distance, clampPoint, calculateScreenPosition } from '../geometry/courtGeometry';
import {
  ActionDraft,
  AIAdaptiveMemory,
  AIPossessionAnalysis,
  DefensiveSettings,
  DefensiveSystem,
  GameSnapshot,
  Player,
  Point,
  Position,
  ShotResult,
  TacticalEvent,
} from '../../types/basketball';
import { POSITIONS } from '../../config/constants';

export interface AIDecisionResult {
  draft: ActionDraft;
  thought: string;
  tacticName: string;
  isFinishingAttempt?: boolean;
}

/**
 * Autonomous Offensive AI Brain
 * Evaluates current court geometry, defensive positions, coverage gaps,
 * adapts to recent failures (adaptive learning), and makes realistic basketball decisions.
 */
export function decideNextAIAction(
  offense: Record<Position, Player>,
  defense: Record<Position, Player>,
  ballHolder: Position,
  defensiveSystem: DefensiveSystem,
  defensiveSettings: DefensiveSettings,
  activeScreen?: { screener: Position; target: Position; point: Point },
  possessionStep: number = 1,
  adaptiveMemory?: AIAdaptiveMemory
): AIDecisionResult {
  const basket = COURT_DIMENSIONS.BASKET; // { x: 50, y: 8 }
  const ballCoord = offense[ballHolder].coord;
  const distToBasket = distance(ballCoord, basket);

  // 1. Evaluate distance from ballHolder to nearest defender
  let minDefDist = 999;
  let closestDef: Position = 'PG';
  POSITIONS.forEach((defPos) => {
    const d = distance(ballCoord, defense[defPos].coord);
    if (d < minDefDist) {
      minDefDist = d;
      closestDef = defPos;
    }
  });

  // 2. Evaluate all teammates: openness (separation from nearest defender) & basket proximity
  const teammateEvaluations = POSITIONS.filter((p) => p !== ballHolder).map((pos) => {
    const pCoord = offense[pos].coord;
    let defDist = 999;
    POSITIONS.forEach((defPos) => {
      const d = distance(pCoord, defense[defPos].coord);
      if (d < defDist) defDist = d;
    });
    const distBasket = distance(pCoord, basket);
    return {
      pos,
      coord: pCoord,
      separation: defDist,
      distBasket,
      isCorner: pCoord.y <= 24 && (pCoord.x <= 18 || pCoord.x >= 82),
      isWing: pCoord.y >= 35 && pCoord.y <= 65 && (pCoord.x <= 25 || pCoord.x >= 75),
    };
  });

  // Sort teammates by separation (most open first)
  teammateEvaluations.sort((a, b) => b.separation - a.separation);
  const mostOpenTeammate = teammateEvaluations[0];

  // ==========================================
  // ADAPTIVE EXPLORATION (Requirement 2: Tự tìm hướng đi mới sau thất bại)
  // ==========================================
  // A. Nếu đợt trước vừa bị Cướp Bóng (Steal), AI không rê dắt trước mặt hậu vệ áp sát!
  if (adaptiveMemory?.lastFailureType === 'STEAL_TURNOVER' && minDefDist <= 3.8 && possessionStep <= 2) {
    return {
      draft: {
        player: ballHolder,
        action: 'pass',
        targetPlayer: mostOpenTeammate.pos,
        path: [ballCoord, mostOpenTeammate.coord],
        isValid: true,
      },
      thought: `[THÍCH NGHI] Tránh bẫy cướp bóng: Hậu vệ đối phương đang áp sát (${minDefDist.toFixed(1)}m) -> AI chuyển hướng: Luân chuyển bóng nhanh sang cho ${mostOpenTeammate.pos} (${mostOpenTeammate.separation.toFixed(1)}m)!`,
      tacticName: 'Chuyền Nhanh Thoát Áp Lực Steal',
    };
  }

  // B. Nếu đợt trước ném 3 hụt, AI từ chối ném 3 sớm và chuyển sang khai thác Pick & Roll hoặc đột phá cận thành
  const avoid3PtSpam = adaptiveMemory?.lastFailureType === '3PT_MISSED' && possessionStep <= 3;

  if (avoid3PtSpam && !activeScreen && possessionStep <= 2) {
    const screener: Position = offense.C.coord.y < offense.PF.coord.y ? 'PF' : 'C';
    const screenTargetPoint = calculateScreenPosition(ballCoord, defense[closestDef].coord, 'top');
    return {
      draft: {
        player: screener,
        action: 'screen',
        targetPlayer: ballHolder,
        path: [offense[screener].coord, screenTargetPoint],
        isValid: true,
      },
      thought: `[THÍCH NGHI] Đợt trước ném 3 hụt -> AI chuyển hướng: Không ném xa nữa, gọi ${screener} dâng cao Pick & Roll để đột phá cận thành!`,
      tacticName: 'Đổi Hướng: Khai Thác Pick & Roll',
    };
  }

  // ==========================================
  // RULE 1: FINISHING ATTEMPTS (Score bucket!)
  // ==========================================
  // A. Point blank near basket (< 22 court units) -> Layup
  if (distToBasket <= 22) {
    return {
      draft: {
        player: ballHolder,
        action: 'layup',
        path: [ballCoord, { x: 50, y: 13 }],
        isValid: true,
      },
      thought: `Đã đột phá sâu vào khu vực hình thang (${Math.round(distToBasket)}m) -> Tấn công bảng rổ dứt điểm Layup!`,
      tacticName: 'Layup Cận Thành',
      isFinishingAttempt: true,
    };
  }

  // B. Open perimeter or mid-range
  // Requirement 1: Only shoot within realistic 3PT range (distToBasket <= 50 && ballCoord.y <= 58), NOT from deep half-court (y=78 / dist=70)!
  if (minDefDist >= 7.2 && distToBasket <= 50 && ballCoord.y <= 58 && !avoid3PtSpam) {
    return {
      draft: {
        player: ballHolder,
        action: 'shoot',
        path: [ballCoord, { x: 50, y: 8 }],
        isValid: true,
      },
      thought: `Khoảng trống chuẩn cự ly (${minDefDist.toFixed(1)}m, cách rổ ${Math.round(distToBasket)}m) -> Tự tin ném rổ WIDE OPEN!`,
      tacticName: distToBasket >= 26 ? 'Ném 3 Điểm Trống Trải' : 'Ném Trung Bình Thoáng',
      isFinishingAttempt: true,
    };
  }

  // C. Shot off Screen if screen is set and ballHolder is near screen
  if (activeScreen && activeScreen.target === ballHolder) {
    const screenerPos = activeScreen.screener;
    const isScreenerScreening = defense[closestDef]?.state === 'SCREENED' || minDefDist >= 7.2;

    if (isScreenerScreening && distToBasket <= 50 && ballCoord.y <= 58) {
      return {
        draft: {
          player: ballHolder,
          action: 'shoot_off_screen',
          path: [ballCoord, { x: 50, y: 8 }],
          isValid: true,
        },
        thought: `${screenerPos} đã chặn thành công hậu vệ -> Thoát người hoàn toàn, ném rổ sau Screen!`,
        tacticName: 'Ném Rổ Sau Screen (Pick & Pop)',
        isFinishingAttempt: true,
      };
    } else {
      // Drive off screen into the paint
      return {
        draft: {
          player: ballHolder,
          action: 'drive_off_screen',
          path: [ballCoord, clampPoint({ x: activeScreen.point.x, y: activeScreen.point.y - 12 }), { x: 50, y: 18 }],
          isValid: true,
        },
        thought: `Lướt qua vai của ${screenerPos} đột phá xé toang cự ly phòng thủ!`,
        tacticName: 'Đột Phá Sau Screen (Pick & Roll Drive)',
      };
    }
  }

  // D. Possession clock running out:
  if (possessionStep >= 4) {
    if (possessionStep === 4 && mostOpenTeammate.separation >= 8.5 && mostOpenTeammate.distBasket <= 34) {
      return {
        draft: {
          player: ballHolder,
          action: 'pass',
          targetPlayer: mostOpenTeammate.pos,
          path: [ballCoord, mostOpenTeammate.coord],
          isValid: true,
        },
        thought: `Hết thời gian tấn công -> Chuyền ngay cho ${mostOpenTeammate.pos} đang có khoảng trống lớn nhất để dứt điểm!`,
        tacticName: 'Chuyền Bóng Dứt Điểm Gấp',
      };
    } else {
      const isLayup = distToBasket <= 28;
      return {
        draft: {
          player: ballHolder,
          action: isLayup ? 'layup' : 'shoot',
          path: [ballCoord, { x: 50, y: isLayup ? 13 : 8 }],
          isValid: true,
        },
        thought: `Hết thời gian bài chạy (Nhịp ${possessionStep}/5) -> Quyết đoán tung cú dứt điểm rổ!`,
        tacticName: 'Dứt Điểm Cuối Bài Chạy',
        isFinishingAttempt: true,
      };
    }
  }

  // ==========================================
  // RULE 2: ZONE DEFENSE EXPLOITATION
  // ==========================================
  if (defensiveSystem === '2-3 Zone' || defensiveSystem === '3-2 Zone' || defensiveSystem === '1-3-1 Zone') {
    // A. 2-3 Zone weakness: High Post (Free throw line x=50, y=42)
    const highPostTeammate = teammateEvaluations.find(
      (t) => t.distBasket <= 36 && Math.abs(t.coord.x - 50) <= 12
    );

    if (highPostTeammate && highPostTeammate.separation >= 6.5) {
      return {
        draft: {
          player: ballHolder,
          action: 'pass',
          targetPlayer: highPostTeammate.pos,
          path: [ballCoord, highPostTeammate.coord],
          isValid: true,
        },
        thought: `Khai thác điểm mù của ${defensiveSystem}: Chuyền bóng vào High Post cho ${highPostTeammate.pos} để hút các hậu vệ Zone co lại!`,
        tacticName: 'Phá Zone High-Post Entry',
      };
    }

    // B. Weak-side Skip Pass (When defense shifted heavily to one side)
    const weaksideShooter = teammateEvaluations.find(
      (t) => (t.coord.x < 50 && ballCoord.x > 50) || (t.coord.x > 50 && ballCoord.x < 50)
    );

    if (weaksideShooter && weaksideShooter.separation >= 7.5) {
      return {
        draft: {
          player: ballHolder,
          action: 'pass',
          targetPlayer: weaksideShooter.pos,
          path: [ballCoord, weaksideShooter.coord],
          isValid: true,
        },
        thought: `Khối phòng thủ Zone bị dạt sâu cánh bóng -> Chuyền đảo cánh Skip Pass cho ${weaksideShooter.pos} ở góc yếu!`,
        tacticName: 'Skip Pass Đảo Cánh Phá Zone',
      };
    }
  }

  // ==========================================
  // RULE 3: PICK & ROLL (SCREEN)
  // ==========================================
  // If ballHolder is tightly guarded (< 6.2m) and no screen set yet
  if (minDefDist <= 6.2 && !activeScreen && possessionStep <= 2) {
    // Center or Power Forward runs up to set a screen
    const screener: Position = offense.C.coord.y < offense.PF.coord.y ? 'PF' : 'C';
    const screenTargetPoint = calculateScreenPosition(ballCoord, defense[closestDef].coord, 'top');

    return {
      draft: {
        player: screener,
        action: 'screen',
        targetPlayer: ballHolder,
        path: [offense[screener].coord, screenTargetPoint],
        isValid: true,
      },
      thought: `${ballHolder} đang bị hậu vệ ${closestDef} áp sát (${minDefDist.toFixed(1)}m) -> ${screener} chủ động dâng lên làm Screen Pick & Roll!`,
      tacticName: 'Pick & Roll (Screen Đỉnh)',
    };
  }

  // ==========================================
  // RULE 4: PASS TO OPEN SHOOTER
  // ==========================================
  if (mostOpenTeammate.separation >= 8.0) {
    return {
      draft: {
        player: ballHolder,
        action: 'pass',
        targetPlayer: mostOpenTeammate.pos,
        path: [ballCoord, mostOpenTeammate.coord],
        isValid: true,
      },
      thought: `${mostOpenTeammate.pos} đang hoàn toàn trống trải (${mostOpenTeammate.separation.toFixed(1)}m) -> Luân chuyển bóng ngay!`,
      tacticName: 'Luân Chuyển Bóng Ra Cánh',
    };
  }

  // ==========================================
  // RULE 5: OFF-BALL CUT / BACKDOOR CUT
  // ==========================================
  if (possessionStep === 1) {
    // SF or SG cuts backdoor toward rim
    const cutter: Position = ballHolder === 'PG' ? 'SF' : 'SG';
    return {
      draft: {
        player: cutter,
        action: 'backdoor',
        path: [offense[cutter].coord, { x: offense[cutter].coord.x < 50 ? 34 : 66, y: 16 }],
        isValid: true,
      },
      thought: `${cutter} quan sát thấy hậu vệ dâng cao áp sát -> Thực hiện Backdoor Cut luồn sau lưng vào rổ!`,
      tacticName: 'Backdoor Cut Không Bóng',
    };
  }

  // ==========================================
  // RULE 6: DRIVE TO COLLAPSE DEFENSE
  // ==========================================
  const driveDirection = ballCoord.x < 50 ? 'drive_right' : 'drive_left';
  const targetDrivePoint: Point = {
    x: driveDirection === 'drive_left' ? Math.max(ballCoord.x - 18, 30) : Math.min(ballCoord.x + 18, 70),
    y: Math.max(ballCoord.y - 28, 20),
  };

  return {
    draft: {
      player: ballHolder,
      action: driveDirection,
      path: [ballCoord, targetDrivePoint],
      isValid: true,
    },
    thought: `Chủ động đột phá nách vào trung lộ để hút hàng thủ đối phương co cụm bọc lót!`,
    tacticName: 'Đột Phá Kéo Hút Phòng Thủ',
  };
}

/**
 * Evaluates the outcome of an AI possession, calculates reinforcement learning rewards,
 * and generates a deep tactical post-game analysis of why the AI succeeded.
 */
export function generateTacticalWinAnalysis(
  events: TacticalEvent[],
  finalEvent: TacticalEvent,
  defensiveSystem: DefensiveSystem,
  defensiveSettings: DefensiveSettings,
  totalPossessions: number
): AIPossessionAnalysis {
  const isSteal = Boolean(finalEvent.isSteal);
  const shot = finalEvent.shotResult;
  const isWin = shot ? shot.made : false;
  const points = shot ? shot.points : 0;
  const contestDist = shot ? shot.contestDistance : (finalEvent.stealDistance || 7.0);

  // Calculate Reinforcement Reward Score
  let reward = 0;
  const keyTactics: string[] = [];

  if (isWin) {
    reward += points === 3 ? 120 : 100; // Base score for bucket

    if (shot?.contestLevel === 'WIDE_OPEN') {
      reward += 60;
      keyTactics.push('Tạo Cú Ném Wide-Open');
    } else if (shot?.contestLevel === 'OPEN') {
      reward += 35;
      keyTactics.push('Khoảng Trống Cận Kề');
    }
  } else if (isSteal) {
    reward = -35; // Penalty for turnover
    keyTactics.push('Bị Cướp Bóng (Steal)');
  } else {
    reward = 5; // Minimal exploration score
    if (shot?.contestLevel === 'WIDE_OPEN') {
      keyTactics.push('Tạo Góc Ném Tốt Nhưng Hụt');
    }
  }

  // Bonus rewards for team coordination
  const screenEvent = events.find((e) => e.action === 'screen');
  if (screenEvent) {
    reward += 40;
    keyTactics.push('Pick & Roll Screen');
  }

  const passCount = events.filter((e) => e.action === 'pass' || e.action === 'handoff').length;
  if (passCount >= 2) {
    reward += passCount * 20;
    keyTactics.push(`Luân Chuyển ${passCount} Đường Chuyền`);
  }

  const cutEvent = events.find((e) => e.action === 'cut' || e.action === 'backdoor');
  if (cutEvent) {
    reward += 30;
    keyTactics.push('Cắt Bóng Thông Minh');
  }

  // Generate deep tactical explanations based on defensive system
  let title = '';
  let summary = '';
  let explanation = '';
  let defensiveBreakdown = '';

  if (isSteal) {
    title = `⚠️ Mất Quyền Kiểm Soát Bóng (${finalEvent.stealer} Steal)`;
    summary = `Hậu vệ ${finalEvent.stealer} đã áp sát cự ly ${contestDist}m và cướp bóng thành công từ ${finalEvent.player}!`;
    explanation = `Người cầm bóng giữ bóng quá lâu khi đối phương áp sát hoặc cố gắng rê dắt/chuyền bóng mà không có yểm trợ Screen. Đối thủ đã tận dụng cự ly gần để ra tay cướp bóng.`;
    defensiveBreakdown = `Hệ thống phòng thủ ${defensiveSystem} với Áp lực ${defensiveSettings.pressure}% đã gây áp lực thành công buộc hàng công mắc lỗi mất bóng.`;
  } else if (defensiveSystem === 'Man-to-Man') {
    title = screenEvent
      ? '🎯 Phối Hợp Pick & Roll Phá Vỡ 1 Kèm 1'
      : '⚡ Xuyên Phá Cự Ly Kèm Người Man-to-Man';

    summary = `AI đã thực hiện ${events.length} bước phối hợp bài bản, kéo giãn hàng thủ 1 kèm 1 và tạo khoảng trống ${contestDist}m cho ${finalEvent.player} dứt điểm thành công (+${points} điểm)!`;

    explanation = screenEvent
      ? `Center (C) dâng lên đặt Screen cản đúng góc kèm của hậu vệ On-Ball. Khi hậu vệ bị cản lại, người cầm bóng đột phá thu hút trung phong đối phương co cụm bọc lót, tạo điều kiện thuận lợi nhất để dứt điểm hoặc thả bóng cận thành.`
      : `Bằng các bài chạy cắt bóng linh hoạt và luân chuyển bóng nhanh, AI đã buộc các hậu vệ đối phương phải liên tục xoay xở đổi hướng kèm người, làm trễ nhịp Close-out phòng ngự.`;

    defensiveBreakdown = `Hệ thống Man-to-Man với Áp lực ${defensiveSettings.pressure}% và Cự ly bọc lót ${defensiveSettings.helpDefense}% đã bị chậm nhịp trước các pha di chuyển bất ngờ của AI.`;
  } else {
    title = '🔥 Đảo Cánh Xé Toang Khối Phòng Ngự ' + defensiveSystem;

    summary = `AI nhận diện điểm yếu cố hữu của hệ thống ${defensiveSystem}, kéo lệch khối phòng thủ và khai thác khoảng trống yếu ở cánh đối diện (+${points} điểm)!`;

    explanation = `Hàng thủ ${defensiveSystem} có độ co cụm (Compactness ${defensiveSettings.compactness}%) và Ball-side Shift cao, khiến các hậu vệ dạt dồn sang một bên sân. AI đã kiên nhẫn phối hợp bóng ra góc cánh trống trải (Corner/Wing), khiến đối thủ không thể di chuyển kịp quãng đường dài để tranh chấp (Contest đạt ${contestDist}m).`;

    defensiveBreakdown = `Khối ${defensiveSystem} phòng ngự dày đặc nhưng để lộ góc chết ngoài vòng 3 điểm và nách trung lộ (High-Post).`;
  }

  return {
    id: `ai-analysis-${Date.now()}`,
    timestamp: Date.now(),
    isWin,
    title,
    summary,
    explanation,
    keyTactics,
    contestDistance: contestDist,
    pointsEarned: points,
    reward,
    possessionSteps: events.length,
    defensiveSystem,
    defensiveBreakdown,
  };
}
