import { COURT_DIMENSIONS } from '../../config/constants';
import { checkScreenCollision, clampPoint, distance, lerp } from '../geometry/courtGeometry';
import { getCourtZone } from '../geometry/zones';
import { DefenderState, Point, Position } from '../../types/basketball';
import { DefenseContext, DefenseOutput, DefenseStrategy } from './DefenseStrategy';
import { applyDefensiveModifiers } from './rebalance';

export class Zone23Defense implements DefenseStrategy {
  name = '2-3 Zone' as const;

  calculate(context: DefenseContext): DefenseOutput {
    const { offense, ballHolder, settings, activeScreen, lastAction } = context;
    const ballPos = offense[ballHolder].coord;
    const ballZone = getCourtZone(ballPos);

    // Baseline Home positions for 2-3 Zone
    // Upper line: PG (left guard), SG (right guard)
    // Lower line: SF (left forward), C (middle center), PF (right forward)
    const home: Record<Position, Point> = {
      PG: { x: 38, y: 64 }, // Left upper
      SG: { x: 62, y: 64 }, // Right upper
      SF: { x: 22, y: 22 }, // Left bottom
      C:  { x: 50, y: 18 }, // Middle bottom / rim protector
      PF: { x: 78, y: 22 }, // Right bottom
    };

    const raw: Record<Position, Point> = {
      PG: { ...home.PG },
      SG: { ...home.SG },
      SF: { ...home.SF },
      C:  { ...home.C },
      PF: { ...home.PF },
    };

    const states: Record<Position, DefenderState> = {
      PG: 'ZONE_GUARD',
      SG: 'ZONE_GUARD',
      SF: 'ZONE_GUARD',
      C:  'ZONE_GUARD',
      PF: 'ZONE_GUARD',
    };

    const explanations: Record<Position, string> = {
      PG: 'Bao quát đỉnh trái',
      SG: 'Bao quát đỉnh phải',
      SF: 'Bao quát đáy trái',
      C:  'Neo giữ cọc sơn và rổ',
      PF: 'Bao quát đáy phải',
    };

    let activeOnBall: Position = 'PG';

    // Proximity closeout distance governed by Pressure
    const closeoutGap = 11 - (settings.pressure / 100) * 7.5;

    // React specifically to ball zone
    switch (ballZone) {
      case 'TOP': {
        // PG & SG share top responsibility based on ball X
        if (ballPos.x < 50) {
          activeOnBall = 'PG';
          raw.PG = lerp(ballPos, COURT_DIMENSIONS.BASKET, closeoutGap / distance(ballPos, COURT_DIMENSIONS.BASKET));
          raw.SG = { x: 58, y: 56 }; // Shading pass to right wing
          states.PG = 'ON_BALL';
          states.SG = 'DENY';
          explanations.PG = 'Áp sát người cầm bóng đỉnh trái';
          explanations.SG = 'Chặn đường chuyền sang cánh phải';
        } else {
          activeOnBall = 'SG';
          raw.SG = lerp(ballPos, COURT_DIMENSIONS.BASKET, closeoutGap / distance(ballPos, COURT_DIMENSIONS.BASKET));
          raw.PG = { x: 42, y: 56 }; // Shading pass to left wing
          states.SG = 'ON_BALL';
          states.PG = 'DENY';
          explanations.SG = 'Áp sát người cầm bóng đỉnh phải';
          explanations.PG = 'Chặn đường chuyền sang cánh trái';
        }
        // Bottom 3 maintain rim/paint shell
        raw.C = { x: 50, y: 18 };
        raw.SF = { x: 25, y: 22 };
        raw.PF = { x: 75, y: 22 };
        break;
      }

      case 'RIGHT_WING': {
        // SG closes out to right wing
        activeOnBall = 'SG';
        raw.SG = lerp(ballPos, COURT_DIMENSIONS.BASKET, closeoutGap / distance(ballPos, COURT_DIMENSIONS.BASKET));
        states.SG = 'CLOSEOUT';
        explanations.SG = 'Closeout áp sát bóng cánh phải (Right Wing)';

        // PG drops to high post/elbow area to deny penetration
        raw.PG = { x: 48, y: 52 };
        states.PG = 'DENY';
        explanations.PG = 'Thu về Elbow bọc lót đường đột phá';

        // PF slides toward short corner / wing support
        raw.PF = { x: 78, y: 28 };
        states.PF = 'ZONE_GUARD';
        explanations.PF = 'Sẵn sàng chặn góc Corner & Short corner';

        // C slides towards ball-side block
        raw.C = { x: 56, y: 19 };
        states.C = 'HELP';
        explanations.C = 'Dịch sang cọc sơn phải yểm trợ';

        // SF pinches towards weak-side paint
        raw.SF = { x: 34, y: 18 };
        states.SF = 'ROTATE';
        explanations.SF = 'Bóp hẹp Weak-side bảo vệ bảng rổ';
        break;
      }

      case 'LEFT_WING': {
        // PG closes out to left wing
        activeOnBall = 'PG';
        raw.PG = lerp(ballPos, COURT_DIMENSIONS.BASKET, closeoutGap / distance(ballPos, COURT_DIMENSIONS.BASKET));
        states.PG = 'CLOSEOUT';
        explanations.PG = 'Closeout áp sát bóng cánh trái (Left Wing)';

        // SG drops to high post / elbow area
        raw.SG = { x: 52, y: 52 };
        states.SG = 'DENY';
        explanations.SG = 'Thu về Elbow bọc lót đường đột phá';

        // SF slides toward left short corner
        raw.SF = { x: 22, y: 28 };
        states.SF = 'ZONE_GUARD';
        explanations.SF = 'Sẵn sàng chặn góc Corner & Short corner';

        // C slides towards left block
        raw.C = { x: 44, y: 19 };
        states.C = 'HELP';
        explanations.C = 'Dịch sang cọc sơn trái yểm trợ';

        // PF pinches towards weak-side paint
        raw.PF = { x: 66, y: 18 };
        states.PF = 'ROTATE';
        explanations.PF = 'Bóp hẹp Weak-side bảo vệ bảng rổ';
        break;
      }

      case 'RIGHT_CORNER':
      case 'SHORT_CORNER_RIGHT': {
        // PF takes primary responsibility for right corner
        activeOnBall = 'PF';
        raw.PF = lerp(ballPos, COURT_DIMENSIONS.BASKET, closeoutGap / distance(ballPos, COURT_DIMENSIONS.BASKET));
        states.PF = 'ON_BALL';
        explanations.PF = 'Chốt chặn bóng tại góc 0 độ phải (Right Corner)';

        // SG sinks to deny return pass to wing
        raw.SG = { x: 74, y: 44 };
        states.SG = 'DENY';
        explanations.SG = 'Sink xuống chặn chuyền bóng trả về cánh';

        // C shifts to ball-side rim/block to prevent drive
        raw.C = { x: 58, y: 16 };
        states.C = 'HELP';
        explanations.C = 'Neo cọc bảng rổ bảo vệ vòng trong';

        // SF rotates to low weak-side paint
        raw.SF = { x: 38, y: 16 };
        states.SF = 'ROTATE';
        explanations.SF = 'Thu về tâm rổ bọc lót Weak-side';

        // PG drops to high post
        raw.PG = { x: 48, y: 46 };
        states.PG = 'ROTATE';
        explanations.PG = 'Kiểm soát High Post';
        break;
      }

      case 'LEFT_CORNER':
      case 'SHORT_CORNER_LEFT': {
        // SF takes primary responsibility for left corner
        activeOnBall = 'SF';
        raw.SF = lerp(ballPos, COURT_DIMENSIONS.BASKET, closeoutGap / distance(ballPos, COURT_DIMENSIONS.BASKET));
        states.SF = 'ON_BALL';
        explanations.SF = 'Chốt chặn bóng tại góc 0 độ trái (Left Corner)';

        // PG sinks to deny return pass to wing
        raw.PG = { x: 26, y: 44 };
        states.PG = 'DENY';
        explanations.PG = 'Sink xuống chặn chuyền bóng trả về cánh';

        // C shifts to left ball-side block
        raw.C = { x: 42, y: 16 };
        states.C = 'HELP';
        explanations.C = 'Neo cọc bảng rổ bảo vệ vòng trong';

        // PF rotates to low weak-side paint
        raw.PF = { x: 62, y: 16 };
        states.PF = 'ROTATE';
        explanations.PF = 'Thu về tâm rổ bọc lót Weak-side';

        // SG drops to high post
        raw.SG = { x: 52, y: 46 };
        states.SG = 'ROTATE';
        explanations.SG = 'Kiểm soát High Post';
        break;
      }

      case 'HIGH_POST': {
        // High post ball: C and nearest upper guard collapse
        activeOnBall = ballPos.x < 50 ? 'PG' : 'SG';
        raw.C = { x: 50, y: 26 };
        states.C = 'HELP';
        explanations.C = 'Bước lên tranh chấp bóng High Post';

        raw.PG = { x: 42, y: 48 };
        raw.SG = { x: 58, y: 48 };
        raw.SF = { x: 28, y: 20 };
        raw.PF = { x: 72, y: 20 };
        states[activeOnBall] = 'ON_BALL';
        explanations[activeOnBall] = 'Áp sát bóng High Post';
        break;
      }

      case 'PAINT':
      case 'LEFT_LOW_POST':
      case 'RIGHT_LOW_POST': {
        // Ball in paint / post: C challenges, wings & forwards collapse
        activeOnBall = 'C';
        raw.C = lerp(ballPos, COURT_DIMENSIONS.BASKET, 0.4);
        states.C = 'ON_BALL';
        explanations.C = 'Tranh chấp bóng trực diện trong sơn';

        raw.SF = lerp(raw.SF, ballPos, 0.4);
        raw.PF = lerp(raw.PF, ballPos, 0.4);
        states.SF = 'HELP';
        states.PF = 'HELP';
        explanations.SF = 'Thu hẹp bọc lót sơn';
        explanations.PF = 'Thu hẹp bọc lót sơn';
        break;
      }
    }

    // 5. ZONE HANDOFF OF CUTTERS
    // If an offensive player makes a cut through the zone,
    // detect which defender's zone they pass through and hand off!
    if (lastAction?.action === 'cut' || lastAction?.action === 'backdoor') {
      const cutterPos = lastAction.player;
      const cutterCoord = offense[cutterPos].coord;
      const cutterZone = getCourtZone(cutterCoord);

      // Find the defender whose home is closest to the cutter's current zone
      let trackingDefender: Position | undefined;
      let minZoneDist = Infinity;
      (Object.keys(home) as Position[]).forEach((pos) => {
        if (pos !== activeOnBall) {
          const d = distance(home[pos], cutterCoord);
          if (d < minZoneDist) {
            minZoneDist = d;
            trackingDefender = pos;
          }
        }
      });

      if (trackingDefender && minZoneDist <= 22) {
        states[trackingDefender] = 'TRACK_CUTTER';
        raw[trackingDefender] = lerp(raw[trackingDefender], cutterCoord, 0.45);
        explanations[trackingDefender] = `Tiếp quản theo kèm cutter (${cutterPos}) tại ${cutterZone}`;
      }
    }

    // 5.5 Active Screen on Zone Closeout Defender
    if (activeScreen) {
      const screenPt = activeScreen.point || offense[activeScreen.screener]?.coord;
      if (screenPt && activeOnBall) {
        const ballStart = lastAction?.path && lastAction.path.length > 0 ? lastAction.path[0] : ballPos;
        const ballEnd = ballPos;
        const defStart = context.previousDefense?.[activeOnBall] || home[activeOnBall];
        const collision = checkScreenCollision(screenPt, ballStart, ballEnd, defStart, raw[activeOnBall]);
        if (collision.hasCollided) {
          raw[activeOnBall] = collision.blockedPosition;
          states[activeOnBall] = 'SCREENED';
          explanations[activeOnBall] = `⛔ Bị ${activeScreen.screener} cản lại tại Zone - Vỡ thế phòng ngự vòng ngoài!`;
        }
      }
    }

    // 6. Apply team rebalancing modifiers (Height, Width, Compactness, Ball-side Shift)
    const balancedPositions = applyDefensiveModifiers(
      raw,
      ballPos,
      activeOnBall,
      settings
    );

    return {
      positions: balancedPositions,
      states,
      explanations,
    };
  }
}
