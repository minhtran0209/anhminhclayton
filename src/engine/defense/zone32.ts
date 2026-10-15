import { COURT_DIMENSIONS } from '../../config/constants';
import { distance, lerp } from '../geometry/courtGeometry';
import { getCourtZone } from '../geometry/zones';
import { DefenderState, Point, Position } from '../../types/basketball';
import { DefenseContext, DefenseOutput, DefenseStrategy } from './DefenseStrategy';
import { applyDefensiveModifiers } from './rebalance';

export class Zone32Defense implements DefenseStrategy {
  name = '3-2 Zone' as const;

  calculate(context: DefenseContext): DefenseOutput {
    const { offense, ballHolder, settings, lastAction } = context;
    const ballPos = offense[ballHolder].coord;
    const ballZone = getCourtZone(ballPos);

    // Baseline Home positions for 3-2 Zone
    // Perimeter Trio: SF (Left Wing), PG (Top Point), SG (Right Wing)
    // Low Post Duo: PF (Left Low Block), C (Right Low Block)
    const home: Record<Position, Point> = {
      SF: { x: 22, y: 58 }, // Left perimeter wing
      PG: { x: 50, y: 70 }, // Top point
      SG: { x: 78, y: 58 }, // Right perimeter wing
      PF: { x: 35, y: 20 }, // Left low paint
      C:  { x: 65, y: 20 }, // Right low paint
    };

    const raw: Record<Position, Point> = {
      SF: { ...home.SF },
      PG: { ...home.PG },
      SG: { ...home.SG },
      PF: { ...home.PF },
      C:  { ...home.C },
    };

    const states: Record<Position, DefenderState> = {
      SF: 'ZONE_GUARD',
      PG: 'ZONE_GUARD',
      SG: 'ZONE_GUARD',
      PF: 'ZONE_GUARD',
      C:  'ZONE_GUARD',
    };

    const explanations: Record<Position, string> = {
      SF: 'Phong tỏa ném 3 cánh trái',
      PG: 'Án ngữ đỉnh 3 điểm',
      SG: 'Phong tỏa ném 3 cánh phải',
      PF: 'Neo giữ cọc sơn trái',
      C:  'Neo giữ cọc sơn phải',
    };

    let activeOnBall: Position = 'PG';
    const closeoutGap = 11 - (settings.pressure / 100) * 7.5;

    switch (ballZone) {
      case 'TOP': {
        activeOnBall = 'PG';
        raw.PG = lerp(ballPos, COURT_DIMENSIONS.BASKET, closeoutGap / distance(ballPos, COURT_DIMENSIONS.BASKET));
        states.PG = 'ON_BALL';
        explanations.PG = 'Áp sát người cầm bóng đỉnh 3 điểm';

        // Wings shade their respective sides
        raw.SF = { x: 26, y: 56 };
        raw.SG = { x: 74, y: 56 };
        // Bottom anchors protect the paint
        raw.PF = { x: 36, y: 19 };
        raw.C = { x: 64, y: 19 };
        break;
      }

      case 'RIGHT_WING': {
        activeOnBall = 'SG';
        raw.SG = lerp(ballPos, COURT_DIMENSIONS.BASKET, closeoutGap / distance(ballPos, COURT_DIMENSIONS.BASKET));
        states.SG = 'ON_BALL';
        explanations.SG = 'Áp sát chặt cánh phải (Perimeter Contest)';

        // PG shades to right elbow
        raw.PG = { x: 58, y: 62 };
        states.PG = 'DENY';
        explanations.PG = 'Shade bọc lót góc ném của PG';

        // Weak-side wing SF sinks
        raw.SF = { x: 34, y: 48 };
        states.SF = 'ROTATE';
        explanations.SF = 'Thu về kiểm soát High Post';

        // Bottom defenders: C shifts ball-side, PF controls middle
        raw.C = { x: 68, y: 22 };
        raw.PF = { x: 44, y: 18 };
        states.C = 'HELP';
        states.PF = 'ROTATE';
        break;
      }

      case 'LEFT_WING': {
        activeOnBall = 'SF';
        raw.SF = lerp(ballPos, COURT_DIMENSIONS.BASKET, closeoutGap / distance(ballPos, COURT_DIMENSIONS.BASKET));
        states.SF = 'ON_BALL';
        explanations.SF = 'Áp sát chặt cánh trái (Perimeter Contest)';

        raw.PG = { x: 42, y: 62 };
        states.PG = 'DENY';
        explanations.PG = 'Shade bọc lót góc ném của PG';

        raw.SG = { x: 66, y: 48 };
        states.SG = 'ROTATE';
        explanations.SG = 'Thu về kiểm soát High Post';

        raw.PF = { x: 32, y: 22 };
        raw.C = { x: 56, y: 18 };
        states.PF = 'HELP';
        states.C = 'ROTATE';
        break;
      }

      case 'RIGHT_CORNER':
      case 'SHORT_CORNER_RIGHT': {
        // In 3-2, bottom defender C must close out to the corner!
        activeOnBall = 'C';
        raw.C = lerp(ballPos, COURT_DIMENSIONS.BASKET, closeoutGap / distance(ballPos, COURT_DIMENSIONS.BASKET));
        states.C = 'ON_BALL';
        explanations.C = 'Kéo ra góc 0 độ cản bóng (Corner Closeout)';

        // Other bottom defender (PF) slides across to cover the rim
        raw.PF = { x: 50, y: 16 };
        states.PF = 'HELP';
        explanations.PF = 'Trượt sang neo giữ rổ thay thế Center';

        // Wing SG sinks down to double or deny return pass
        raw.SG = { x: 74, y: 40 };
        states.SG = 'DENY';
        explanations.SG = 'Sink xuống chặn đường chuyền ngược ra cánh';

        // PG drops to foul line
        raw.PG = { x: 54, y: 50 };
        states.PG = 'ROTATE';

        // SF drops to weak-side block
        raw.SF = { x: 34, y: 22 };
        states.SF = 'ROTATE';
        explanations.SF = 'Thu sâu về Weak-side hỗ trợ rebounding';
        break;
      }

      case 'LEFT_CORNER':
      case 'SHORT_CORNER_LEFT': {
        activeOnBall = 'PF';
        raw.PF = lerp(ballPos, COURT_DIMENSIONS.BASKET, closeoutGap / distance(ballPos, COURT_DIMENSIONS.BASKET));
        states.PF = 'ON_BALL';
        explanations.PF = 'Kéo ra góc 0 độ cản bóng (Corner Closeout)';

        raw.C = { x: 50, y: 16 };
        states.C = 'HELP';
        explanations.C = 'Trượt sang neo giữ rổ thay thế PF';

        raw.SF = { x: 26, y: 40 };
        states.SF = 'DENY';
        explanations.SF = 'Sink xuống chặn đường chuyền ngược ra cánh';

        raw.PG = { x: 46, y: 50 };
        states.PG = 'ROTATE';

        raw.SG = { x: 66, y: 22 };
        states.SG = 'ROTATE';
        explanations.SG = 'Thu sâu về Weak-side hỗ trợ rebounding';
        break;
      }

      case 'HIGH_POST':
      case 'PAINT':
      case 'LEFT_LOW_POST':
      case 'RIGHT_LOW_POST': {
        // High post in 3-2: PG and ball-side bottom collapse
        activeOnBall = ballPos.x < 50 ? 'PF' : 'C';
        raw.PG = { x: 50, y: 52 };
        raw.PF = { x: 40, y: 24 };
        raw.C = { x: 60, y: 24 };
        states[activeOnBall] = 'ON_BALL';
        explanations[activeOnBall] = 'Thu hẹp chặn đột phá trong sơn';
        break;
      }
    }

    // Cutter Handoff
    if (lastAction?.action === 'cut' || lastAction?.action === 'backdoor') {
      const cutterPos = lastAction.player;
      const cutterCoord = offense[cutterPos].coord;
      let minZoneDist = Infinity;
      let trackingDefender: Position | undefined;

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
        explanations[trackingDefender] = `Zone handoff: Theo kèm cutter (${cutterPos})`;
      }
    }

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
