import { COURT_DIMENSIONS } from '../../config/constants';
import {
  checkScreenCollision,
  clampPoint,
  distance,
  isBallSide,
  lerp,
} from '../geometry/courtGeometry';
import {
  DefenderState,
  Point,
  Position,
} from '../../types/basketball';
import { DefenseContext, DefenseOutput, DefenseStrategy } from './DefenseStrategy';
import { applyDefensiveModifiers } from './rebalance';

export class ManToManDefense implements DefenseStrategy {
  name = 'Man-to-Man' as const;

  calculate(context: DefenseContext): DefenseOutput {
    const { offense, ballHolder, settings, activeScreen, lastAction } = context;
    const basket = COURT_DIMENSIONS.BASKET;
    const ballPos = offense[ballHolder].coord;

    // 1. Maintain or initialize assignments
    const assignments: Record<Position, Position> = context.currentAssignments
      ? { ...context.currentAssignments }
      : {
          PG: 'PG',
          SG: 'SG',
          SF: 'SF',
          PF: 'PF',
          C: 'C',
        };

    const states: Record<Position, DefenderState> = {
      PG: 'MARK',
      SG: 'MARK',
      SF: 'MARK',
      PF: 'MARK',
      C: 'MARK',
    };

    const explanations: Record<Position, string> = {
      PG: '',
      SG: '',
      SF: '',
      PF: '',
      C: '',
    };

    // 2. Identify who is guarding the ball handler
    let onBallDefender: Position = 'PG';
    (Object.keys(assignments) as Position[]).forEach((defPos) => {
      if (assignments[defPos] === ballHolder) {
        onBallDefender = defPos;
      }
    });

    // 3. Handle Screen Policies: Stay vs Switch vs Auto
    let screenSwitched = false;
    if (activeScreen) {
      const screener = activeScreen.screener;
      const targetOffense = activeScreen.target; // typically the ball handler
      
      // Find defender of screener and defender of target
      let screenerDefender: Position | undefined;
      let targetDefender: Position | undefined;

      (Object.keys(assignments) as Position[]).forEach((defPos) => {
        if (assignments[defPos] === screener) screenerDefender = defPos;
        if (assignments[defPos] === targetOffense) targetDefender = defPos;
      });

      if (screenerDefender && targetDefender && screenerDefender !== targetDefender) {
        const distToScreen = distance(offense[screener].coord, offense[targetOffense].coord);

        if (settings.screenPolicy === 'Switch') {
          // Explicit switch
          assignments[screenerDefender] = targetOffense;
          assignments[targetDefender] = screener;
          states[screenerDefender] = 'SWITCH';
          states[targetDefender] = 'SWITCH';
          explanations[screenerDefender] = `Switch kèm ${targetOffense} sau cản`;
          explanations[targetDefender] = `Switch sang kèm ${screener}`;
          screenSwitched = true;
          // Update who is now on-ball
          if (targetOffense === ballHolder) {
            onBallDefender = screenerDefender;
          }
        } else if (settings.screenPolicy === 'Auto') {
          // Auto policy: On-ball defender marks ball handler; when ball handler drives past, defender is screened!
          explanations[screenerDefender] = `Hedge phòng ngự Screen ${screener}`;
          explanations[targetDefender] = `Theo kèm qua cản ${targetOffense}`;
        } else {
          // Stay policy: Fight through / Drop coverage
          explanations[screenerDefender] = `Giữ kèm ${screener} (Drop bịt sơn)`;
          explanations[targetDefender] = `Vượt qua cản kèm ${targetOffense}`;
        }
      }
    }

    // 4. Calculate raw defender positions
    const rawPositions: Record<Position, Point> = {} as any;
    const isDrive =
      lastAction?.action === 'drive_left' ||
      lastAction?.action === 'drive_right' ||
      lastAction?.action === 'layup';

    (Object.keys(assignments) as Position[]).forEach((defPos) => {
      const assignedOffense = assignments[defPos];
      const assignedCoord = offense[assignedOffense].coord;

      if (defPos === onBallDefender) {
        // ON-BALL DEFENDER
        const onBallDistance = 12 - (settings.pressure / 100) * 8.5;

        // Position directly on the line between ball and basket
        const dirToBasket = {
          x: basket.x - assignedCoord.x,
          y: basket.y - assignedCoord.y,
        };
        const len = Math.sqrt(dirToBasket.x * dirToBasket.x + dirToBasket.y * dirToBasket.y) || 1;

        const idealPos: Point = {
          x: assignedCoord.x + (dirToBasket.x / len) * onBallDistance,
          y: assignedCoord.y + (dirToBasket.y / len) * onBallDistance,
        };

        let isBlocked = false;

        // Screen collision & blocking detection
        if (activeScreen && activeScreen.target === assignedOffense && !screenSwitched) {
          const screenPt = activeScreen.point || offense[activeScreen.screener]?.coord;
          if (screenPt) {
            const ballStart = lastAction?.path && lastAction.path.length > 0
              ? lastAction.path[0]
              : assignedCoord;
            const ballEnd = assignedCoord;
            const defStart = context.previousDefense?.[defPos] || {
              x: ballStart.x + (dirToBasket.x / len) * onBallDistance,
              y: ballStart.y + (dirToBasket.y / len) * onBallDistance,
            };

            const collision = checkScreenCollision(
              screenPt,
              ballStart,
              ballEnd,
              defStart,
              idealPos
            );

            // Ball handler is on the basket-side of the screen (has driven past or around the screen)
            const ballDrivenPast = (ballEnd.y <= screenPt.y + 1.5) && Math.abs(ballEnd.x - screenPt.x) <= 28;

            if (collision.hasCollided || ballDrivenPast) {
              rawPositions[defPos] = collision.hasCollided ? collision.blockedPosition : {
                x: screenPt.x + (defStart.x < screenPt.x ? -3.5 : 3.5),
                y: screenPt.y + 1.2,
              };
              states[defPos] = 'SCREENED';
              explanations[defPos] = `⛔ Bị ${activeScreen.screener} cản lại tại (${Math.round(screenPt.x)}, ${Math.round(screenPt.y)}) - Mất kèm ${assignedOffense}!`;
              isBlocked = true;
            }
          }
        }

        if (!isBlocked) {
          rawPositions[defPos] = idealPos;
          if (states[defPos] !== 'SWITCH') {
            states[defPos] = 'ON_BALL';
          }
          if (!screenSwitched) {
            explanations[defPos] = `Áp sát On-Ball (Pressure ${settings.pressure}%)`;
          }
        }
      } else {
        // OFF-BALL DEFENDER
        // Form defensive triangle: Assigned Player <-> Defender <-> Ball / Basket
        const ballDistance = distance(assignedCoord, ballPos);
        const isStrongSide = isBallSide(assignedCoord, ballPos);

        // Vector towards basket
        const toBasket = {
          x: basket.x - assignedCoord.x,
          y: basket.y - assignedCoord.y,
        };
        const basketDist = Math.sqrt(toBasket.x * toBasket.x + toBasket.y * toBasket.y) || 1;

        if (isDrive && !isStrongSide && settings.helpDefense >= 40) {
          // WEAK SIDE HELP DEFENSE AGAINST DRIVE
          // Drops toward rim / paint center to form wall
          if (states[defPos] !== 'SWITCH') states[defPos] = 'HELP';
          const helpDepth = (settings.helpDefense / 100) * 0.65;
          const helpTarget: Point = {
            x: 50,
            y: Math.min(assignedCoord.y, 25),
          };
          rawPositions[defPos] = lerp(assignedCoord, helpTarget, helpDepth);
          explanations[defPos] = `Hỗ trợ bịt sơn Help Defense (${settings.helpDefense}%)`;
        } else if (isStrongSide) {
          // STRONG SIDE (1 pass away)
          // Denial / Gap defense
          const denialRatio = 0.2 + (settings.pressure / 100) * 0.3; // Closer to assignment if high pressure
          const sagTowardsBall = (100 - settings.pressure) / 100 * 0.25;

          let pos = lerp(assignedCoord, basket, denialRatio);
          pos = lerp(pos, ballPos, sagTowardsBall);
          rawPositions[defPos] = pos;

          if (states[defPos] !== 'SWITCH') {
            states[defPos] = settings.pressure >= 65 ? 'DENY' : 'MARK';
          }
          if (!screenSwitched) {
            explanations[defPos] = settings.pressure >= 65 
              ? `Deny chuyền bóng sang ${assignedOffense}` 
              : `Kèm người cánh bóng (${assignedOffense})`;
          }
        } else {
          // WEAK SIDE (2+ passes away)
          // Sinks toward lane/midline depending on Help Defense & Compactness
          const helpSag = (settings.helpDefense / 100) * 0.5; // up to 50% toward midline
          const midlineTarget: Point = {
            x: 50,
            y: lerp(assignedCoord, basket, 0.4).y,
          };

          rawPositions[defPos] = lerp(assignedCoord, midlineTarget, helpSag);
          if (states[defPos] !== 'SWITCH') {
            states[defPos] = settings.helpDefense >= 50 ? 'HELP' : 'ROTATE';
          }
          if (!screenSwitched) {
            explanations[defPos] = `Pistol / Weak-side Help (${assignedOffense})`;
          }
        }
      }
    });

    // 5. Apply team rebalancing modifiers (Height, Width, Compactness, Ball-side Shift)
    const balancedPositions = applyDefensiveModifiers(
      rawPositions,
      ballPos,
      onBallDefender,
      settings
    );

    return {
      positions: balancedPositions,
      states,
      assignments,
      explanations,
    };
  }
}
