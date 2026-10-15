import { COURT_DIMENSIONS } from '../../config/constants';
import { calculateScreenPosition, clampPoint, distance, lerp } from '../geometry/courtGeometry';
import {
  ActionDraft,
  GameSnapshot,
  OffenseFormation,
  Player,
  Point,
  Position,
  ShotResult,
  TacticalEvent,
} from '../../types/basketball';
import { getDefenseStrategy } from '../defense';

export interface ExecuteActionResult {
  updatedOffense: Record<Position, Player>;
  updatedDefense: Record<Position, Player>;
  updatedBallHolder: Position;
  event: TacticalEvent;
  activeScreen?: { screener: Position; target: Position; point: Point };
}

/**
 * Execute a confirmed offensive action, detect tactical consequences,
 * invoke the defensive system strategy to calculate automatic reaction,
 * and return the resulting game state and timeline event.
 */
export function executeOffensiveAction(
  draft: ActionDraft,
  currentSnapshot: GameSnapshot,
  stepNumber: number
): ExecuteActionResult {
  const { player, action, targetPlayer, path } = draft;
  const offense = { ...currentSnapshot.offense };
  const defense = { ...currentSnapshot.defense };
  let ballHolder = currentSnapshot.ballHolder;
  let activeScreen = currentSnapshot.activeScreen;
  let shotResult: ShotResult | undefined;

  const playerCoord = { ...offense[player] };
  let finalCoord = playerCoord;
  let description = '';

  // 1. Process Offensive Action Mechanics
  switch (action) {
    case 'move':
    case 'dribble': {
      if (path && path.length > 0) {
        finalCoord = path[path.length - 1];
      }
      const actionName = action === 'dribble' ? 'Dribble' : 'Di chuyển';
      description = `${player} – ${actionName} tới (${Math.round(finalCoord.x)}, ${Math.round(finalCoord.y)})`;
      break;
    }

    case 'drive_left': {
      // Drives into left lane toward basket
      const target: Point = {
        x: Math.max(playerCoord.x - 18, 30),
        y: Math.max(playerCoord.y - 32, 22),
      };
      finalCoord = clampPoint(target);
      description = `${player} – Drive Left đột phá nách trái vào sơn`;
      break;
    }

    case 'drive_right': {
      // Drives into right lane toward basket
      const target: Point = {
        x: Math.min(playerCoord.x + 18, 70),
        y: Math.max(playerCoord.y - 32, 22),
      };
      finalCoord = clampPoint(target);
      description = `${player} – Drive Right đột phá nách phải vào sơn`;
      break;
    }

    case 'drive_off_screen': {
      const screener = activeScreen?.screener || 'C';
      if (path && path.length > 1) {
        finalCoord = clampPoint(path[path.length - 1]);
      } else {
        const screenerCoord = activeScreen?.point || offense[screener] || { x: playerCoord.x - 6.5, y: playerCoord.y };
        const isLeft = screenerCoord.x <= playerCoord.x;
        finalCoord = clampPoint({
          x: isLeft ? Math.max(screenerCoord.x - 1, 28) : Math.min(screenerCoord.x + 1, 72),
          y: Math.max(playerCoord.y - 28, 18),
        });
      }
      description = `${player} – Đột phá lướt qua Screen của ${screener} vào sơn! (Hậu vệ bị cản lại)`;
      break;
    }

    case 'pass': {
      if (targetPlayer && targetPlayer !== player) {
        ballHolder = targetPlayer;
        description = `${player} – Pass chuyền bóng cho ${targetPlayer}`;
      } else {
        description = `${player} – Chuyền bóng`;
      }
      break;
    }

    case 'shoot': {
      const basket = COURT_DIMENSIONS.BASKET; // { x: 50, y: 8 }
      const distToBasket = distance(playerCoord, basket);
      const is3Pt = distToBasket >= 26;
      const points = is3Pt ? 3 : 2;

      // Find closest defender to contest the shot
      let closestDefender: Position = 'PG';
      let minDefDist = 999;
      (Object.keys(currentSnapshot.defense) as Position[]).forEach((defPos) => {
        const defCoord = currentSnapshot.defense[defPos].coord;
        const d = distance(playerCoord, defCoord);
        if (d < minDefDist) {
          minDefDist = d;
          closestDefender = defPos;
        }
      });

      // If protected by an active screen on this shooter, screener blocks on-ball defender
      const hasScreenShield = Boolean(activeScreen && activeScreen.target === player);
      let contestLabel = 'Kèm thoáng';
      if (hasScreenShield) {
        minDefDist = Math.max(minDefDist + 5.5, 8.5);
        contestLabel = `Ném sau cản của ${activeScreen!.screener}`;
      }

      let contestLevel: ShotResult['contestLevel'] = 'OPEN';
      let probability = 36;

      if (minDefDist >= 11) {
        contestLevel = 'WIDE_OPEN';
        if (!hasScreenShield) contestLabel = 'Hoàn toàn trống trải';
        probability = is3Pt ? 46 : 56;
      } else if (minDefDist >= 7) {
        contestLevel = 'OPEN';
        if (!hasScreenShield) contestLabel = 'Kèm thoáng (Open)';
        probability = is3Pt ? 36 : 46;
      } else if (minDefDist >= 3.8) {
        contestLevel = 'CONTESTED';
        if (!hasScreenShield) contestLabel = `Bị kèm (${closestDefender} Contest)`;
        probability = is3Pt ? 25 : 34;
      } else {
        contestLevel = 'HEAVILY_CONTESTED';
        if (!hasScreenShield) contestLabel = `Bị áp sát (${closestDefender} Smothered)`;
        probability = is3Pt ? 14 : 20;
      }

      const roll = Math.random() * 100;
      const made = roll < probability;

      shotResult = {
        shotType: is3Pt ? 'three' : 'mid',
        distanceToBasket: Math.round(distToBasket),
        contestDistance: Math.round(minDefDist * 10) / 10,
        contestLevel,
        contestDefender: closestDefender,
        probability,
        made,
        points,
      };

      const outcomeText = made
        ? `→ VÀO RỔ (MADE) +${points}Đ!`
        : `→ KHÔNG VÀO (MISSED)!`;

      description = `${player} – Ném rổ ${points}Đ [${contestLabel} – Tỉ lệ: ${probability}%] ${outcomeText}`;
      if (hasScreenShield) activeScreen = undefined;
      break;
    }

    case 'shoot_off_screen': {
      const screener = activeScreen?.screener || 'C';
      const basket = COURT_DIMENSIONS.BASKET; // { x: 50, y: 8 }
      const distToBasket = distance(playerCoord, basket);
      const is3Pt = distToBasket >= 26;
      const points = is3Pt ? 3 : 2;

      let closestDefender: Position = screener === 'C' ? 'C' : 'PF';
      let minDefDist = 999;
      (Object.keys(currentSnapshot.defense) as Position[]).forEach((defPos) => {
        if (defPos !== player) {
          const defCoord = currentSnapshot.defense[defPos].coord;
          const d = distance(playerCoord, defCoord);
          if (d < minDefDist) {
            minDefDist = d;
            closestDefender = defPos;
          }
        }
      });

      const effectiveDist = Math.max(minDefDist, 9.2);
      let contestLevel: ShotResult['contestLevel'] = 'OPEN';
      let contestLabel = `Ném sau Screen của ${screener} (Chắn người thành công)`;
      let probability = is3Pt ? 44 : 54;

      if (effectiveDist >= 11) {
        contestLevel = 'WIDE_OPEN';
        contestLabel = `Thoát người hoàn toàn sau Screen của ${screener}`;
        probability = is3Pt ? 52 : 62;
      }

      const roll = Math.random() * 100;
      const made = roll < probability;

      shotResult = {
        shotType: is3Pt ? 'three' : 'mid',
        distanceToBasket: Math.round(distToBasket),
        contestDistance: Math.round(effectiveDist * 10) / 10,
        contestLevel,
        contestDefender: closestDefender,
        probability,
        made,
        points,
      };

      const outcomeText = made
        ? `→ VÀO RỔ (MADE) +${points}Đ!`
        : `→ KHÔNG VÀO (MISSED)!`;

      description = `${player} – Ném rổ sau Screen ${points}Đ [${contestLabel} – Tỉ lệ: ${probability}%] ${outcomeText}`;
      activeScreen = undefined;
      break;
    }

    case 'layup': {
      const rimTarget: Point = { x: 50, y: 13 };
      finalCoord = clampPoint(path && path.length > 1 ? path[path.length - 1] : rimTarget);
      break;
    }

    case 'screen': {
      const target = targetPlayer || (player === 'C' || player === 'PF' ? 'PG' : 'SG');
      const targetCoord = offense[target];

      // Find defender guarding target in currentSnapshot.defense
      let targetDefCoord: Point | undefined;
      let screenedDefender: Position | undefined;
      if (currentSnapshot.defense) {
        (Object.keys(currentSnapshot.defense) as Position[]).forEach((defPos) => {
          const def = currentSnapshot.defense[defPos];
          if (def && def.assignment === target) {
            targetDefCoord = def.coord;
            screenedDefender = defPos;
          }
        });
        if (!targetDefCoord) {
          let minD = Infinity;
          (Object.keys(currentSnapshot.defense) as Position[]).forEach((defPos) => {
            const def = currentSnapshot.defense[defPos];
            if (def && def.coord) {
              const d = distance(targetCoord, def.coord);
              if (d < minD) {
                minD = d;
                targetDefCoord = def.coord;
                screenedDefender = defPos;
              }
            }
          });
        }
      }

      if (path && path.length > 1) {
        finalCoord = clampPoint(path[path.length - 1]);
      } else {
        finalCoord = calculateScreenPosition(targetCoord, targetDefCoord, undefined);
      }
      activeScreen = {
        screener: player,
        target,
        point: finalCoord,
      };
      const dirLabel =
        finalCoord.x < targetCoord.x - 2
          ? 'bên Trái'
          : finalCoord.x > targetCoord.x + 2
          ? 'bên Phải'
          : 'phía Sau/Đỉnh';
      const defLabel = screenedDefender ? ` cản ${screenedDefender}` : '';
      description = `${player} – Set Screen (${dirLabel})${defLabel} yểm trợ cho ${target}`;
      break;
    }

    case 'roll': {
      // Roll to the rim
      const rollTarget: Point = {
        x: activeScreen ? activeScreen.point.x * 0.7 + 50 * 0.3 : 50,
        y: 18,
      };
      finalCoord = clampPoint(rollTarget);
      activeScreen = undefined;
      description = `${player} – Roll lướt cắt thẳng vào rổ`;
      break;
    }

    case 'pop': {
      // Pop outward to 3-point line
      const popTarget: Point = {
        x: activeScreen ? (activeScreen.point.x < 50 ? 20 : 80) : 50,
        y: 68,
      };
      finalCoord = clampPoint(popTarget);
      activeScreen = undefined;
      description = `${player} – Pop dạt ra ngoài vạch 3 điểm`;
      break;
    }

    case 'cut': {
      if (path && path.length > 0) {
        finalCoord = path[path.length - 1];
      } else {
        // Cut toward basket/elbow
        finalCoord = clampPoint({ x: 50, y: 26 });
      }
      description = `${player} – Cut cắt bóng vào khoảng trống`;
      break;
    }

    case 'backdoor': {
      // Backdoor cut behind defender to rim
      finalCoord = clampPoint({
        x: playerCoord.x < 50 ? 32 : 68,
        y: 14,
      });
      description = `${player} – Backdoor Cut luồn sau lưng hậu vệ về phía rổ`;
      break;
    }

    case 'handoff': {
      if (targetPlayer && targetPlayer !== player) {
        const targetCoord = offense[targetPlayer];
        if (path && path.length > 1) {
          finalCoord = clampPoint(path[path.length - 1]);
        } else {
          finalCoord = clampPoint(lerp(playerCoord, targetCoord, 0.65));
        }

        // The receiver teammate moves to meet at the handoff spot
        const receiverCoord: Point = clampPoint({
          x: finalCoord.x > 50 ? finalCoord.x + 3.5 : finalCoord.x - 3.5,
          y: finalCoord.y,
        });
        offense[targetPlayer] = receiverCoord;

        ballHolder = targetPlayer;

        const dirLabel =
          finalCoord.x < playerCoord.x - 3
            ? 'hướng Trái'
            : finalCoord.x > playerCoord.x + 3
            ? 'hướng Phải'
            : 'trực diện';
        description = `${player} – Hand-off (${dirLabel}) trao bóng tận tay cho ${targetPlayer}`;
      } else {
        description = `${player} – Hand-off trao bóng`;
      }
      break;
    }

    case 'relocate': {
      // Relocate along the 3-point arc
      finalCoord = clampPoint({
        x: playerCoord.x < 50 ? Math.max(playerCoord.x - 14, 10) : Math.min(playerCoord.x + 14, 90),
        y: Math.min(playerCoord.y + 8, 76),
      });
      description = `${player} – Relocate di chuyển tìm góc ném thoáng`;
      break;
    }

    case 'spot_up': {
      description = `${player} – Spot Up đứng sẵn chờ bóng ngoài vạch`;
      break;
    }
  }

  // Update offensive coordinates
  offense[player] = finalCoord;

  // Convert Record<Position, Point> to Record<Position, Player> format for defense engine
  const offensePlayersFormatted: Record<Position, Player> = {} as any;
  (Object.keys(offense) as Position[]).forEach((pos) => {
    offensePlayersFormatted[pos] = {
      id: `offense-${pos}`,
      team: 'offense',
      position: pos,
      coord: offense[pos],
    };
  });

  // 2. Invoke Defensive System Engine
  const strategy = getDefenseStrategy(currentSnapshot.defensiveSystem);
  const currentAssignments = {} as Record<Position, Position>;
  (Object.keys(defense) as Position[]).forEach((pos) => {
    if (defense[pos].assignment) {
      currentAssignments[pos] = defense[pos].assignment!;
    }
  });

  const prevDefCoords: Record<Position, Point> = {} as any;
  (Object.keys(defense) as Position[]).forEach((pos) => {
    prevDefCoords[pos] = defense[pos].coord;
  });

  const defenseResult = strategy.calculate({
    offense: offensePlayersFormatted,
    ballHolder,
    settings: currentSnapshot.defensiveSettings,
    activeScreen,
    lastAction: {
      action,
      player,
      targetPlayer,
      path,
    },
    currentAssignments: Object.keys(currentAssignments).length > 0 ? currentAssignments : undefined,
    previousDefense: prevDefCoords,
  });

  // Check if any defender was screened during this action
  let screenedDefenderName: Position | undefined;
  (Object.keys(defenseResult.states) as Position[]).forEach((defPos) => {
    if (defenseResult.states[defPos] === 'SCREENED') {
      screenedDefenderName = defPos;
    }
  });

  if (screenedDefenderName && (action === 'move' || action === 'dribble' || action === 'drive_left' || action === 'drive_right' || action === 'drive_off_screen')) {
    description += ` [Hậu vệ ${screenedDefenderName} bị chặn lại tại Screen – Mở ra khoảng trống!]`;
  }

  // 2.5 Calculate realistic Layup Contest based on Drive Context & Reactive Defense
  if (action === 'layup') {
    const basket = COURT_DIMENSIONS.BASKET; // { x: 50, y: 8 }
    const startDistToBasket = distance(playerCoord, basket);
    const isPerimeterDrive = startDistToBasket > 25; // Started at 3PT line or perimeter

    // 1. Closest defender at the start of the drive (perimeter on-ball pressure)
    let closestStartDefender: Position = 'PG';
    let startDefDist = 999;
    (Object.keys(currentSnapshot.defense) as Position[]).forEach((defPos) => {
      const d = distance(playerCoord, currentSnapshot.defense[defPos].coord);
      if (d < startDefDist) {
        startDefDist = d;
        closestStartDefender = defPos;
      }
    });

    const hasScreen = Boolean(activeScreen && activeScreen.target === player);

    // 2. Closest defender at the rim AFTER the defense reacted to penetration
    let closestRimDefender: Position = 'C';
    let minRimDefDist = 999;
    (Object.keys(defenseResult.positions) as Position[]).forEach((defPos) => {
      const defCoord = defenseResult.positions[defPos];
      const d = distance(finalCoord, defCoord);
      if (d < minRimDefDist) {
        minRimDefDist = d;
        closestRimDefender = defPos;
      }
    });

    // 3. Effective Contest Distance calculation:
    // If driving all the way from the perimeter (> 25 units) without a screen:
    // The on-ball defender was right on the driver's hip and contests the entire penetration.
    let effectiveContestDist = minRimDefDist;
    let primaryContestDefender: Position = closestRimDefender;
    let contestLabel = '';

    if (isPerimeterDrive) {
      if (!hasScreen && startDefDist < 6.5) {
        // Driver attempted to drive past on-ball defender from 3PT line without a pick
        effectiveContestDist = Math.min(minRimDefDist, Math.max(startDefDist * 0.65, 1.8));
        primaryContestDefender = startDefDist <= minRimDefDist ? closestStartDefender : closestRimDefender;
        contestLabel = `Đột phá từ ngoài bị ${closestStartDefender} đeo bám rát`;
      } else if (hasScreen) {
        // Pick freed driver from perimeter defender, now facing rim protector
        effectiveContestDist = minRimDefDist;
        contestLabel = `Dùng Screen vượt qua ${closestStartDefender}, đối đầu ${closestRimDefender} dưới rổ`;
      } else {
        // Perimeter defender was sagging off
        effectiveContestDist = minRimDefDist;
        contestLabel = `Đột phá thoáng từ ngoài, đối mặt ${closestRimDefender} dưới rổ`;
      }
    } else {
      // Driver was already close to the basket (e.g. cut, backdoor, roll)
      effectiveContestDist = minRimDefDist;
      contestLabel = minRimDefDist >= 7.5
        ? 'Sơn trống cận thành (Wide Open)'
        : `Cận thành đối mặt ${closestRimDefender}`;
    }

    // 4. Assign Contest Level & Realistic Basketball Probability
    let contestLevel: ShotResult['contestLevel'] = 'OPEN';
    let probability = 65;

    if (effectiveContestDist >= 7.5) {
      contestLevel = 'WIDE_OPEN';
      if (!contestLabel) contestLabel = isPerimeterDrive ? 'Đột phá sơn trống (Wide Open)' : 'Sơn trống (Wide Open Layup)';
      probability = 84;
    } else if (effectiveContestDist >= 4.8) {
      contestLevel = 'OPEN';
      if (!contestLabel) contestLabel = `Ít áp lực dưới rổ (${primaryContestDefender} Open)`;
      probability = 65;
    } else if (effectiveContestDist >= 2.8) {
      contestLevel = 'CONTESTED';
      if (!contestLabel) contestLabel = `Bị ${primaryContestDefender} kèm rát (Contest)`;
      probability = 44;
    } else {
      contestLevel = 'HEAVILY_CONTESTED';
      if (!contestLabel) contestLabel = `Bị ${primaryContestDefender} phong tỏa rát (Smothered)`;
      probability = 28;
    }

    const roll = Math.random() * 100;
    const made = roll < probability;

    shotResult = {
      shotType: 'layup',
      distanceToBasket: Math.round(distance(finalCoord, basket)),
      contestDistance: Math.round(effectiveContestDist * 10) / 10,
      contestLevel,
      contestDefender: primaryContestDefender,
      probability,
      made,
      points: 2,
    };

    const outcomeText = made ? '→ VÀO RỔ (MADE) +2Đ!' : '→ KHÔNG VÀO (MISSED)!';
    description = `${player} – Lên rổ cận thành [${contestLabel} – Tỉ lệ: ${probability}%] ${outcomeText}`;
    activeScreen = undefined;
  }

  // 3. Assemble updated defense players
  const updatedDefense: Record<Position, Player> = {} as any;
  (Object.keys(defenseResult.positions) as Position[]).forEach((pos) => {
    updatedDefense[pos] = {
      id: `defense-${pos}`,
      team: 'defense',
      position: pos,
      coord: defenseResult.positions[pos],
      state: defenseResult.states[pos],
      assignment: defenseResult.assignments ? defenseResult.assignments[pos] : undefined,
      explanation: defenseResult.explanations[pos],
    };
  });

  const updatedOffense: Record<Position, Player> = {} as any;
  (Object.keys(offense) as Position[]).forEach((pos) => {
    updatedOffense[pos] = {
      id: `offense-${pos}`,
      team: 'offense',
      position: pos,
      coord: offense[pos],
    };
  });

  const event: TacticalEvent = {
    id: `event-${Date.now()}-${stepNumber}`,
    stepNumber,
    player,
    action,
    targetPlayer,
    path,
    description,
    timestamp: Date.now(),
    explanations: defenseResult.explanations,
    shotResult,
  };

  return {
    updatedOffense,
    updatedDefense,
    updatedBallHolder: ballHolder,
    event,
    activeScreen,
  };
}
