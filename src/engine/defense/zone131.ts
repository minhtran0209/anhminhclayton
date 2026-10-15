import { COURT_DIMENSIONS } from '../../config/constants';
import { distance, lerp } from '../geometry/courtGeometry';
import { getCourtZone } from '../geometry/zones';
import { DefenderState, Point, Position } from '../../types/basketball';
import { DefenseContext, DefenseOutput, DefenseStrategy } from './DefenseStrategy';
import { applyDefensiveModifiers } from './rebalance';

export class Zone131Defense implements DefenseStrategy {
  name = '1-3-1 Zone' as const;

  calculate(context: DefenseContext): DefenseOutput {
    const { offense, ballHolder, settings, lastAction } = context;
    const ballPos = offense[ballHolder].coord;
    const ballZone = getCourtZone(ballPos);

    // Baseline Home positions for 1-3-1 Zone (Cross / Diamond formation)
    // 1 Point: PG (top of key)
    // 3 Middle: SF (left wing), C (middle hub/free throw line), SG (right wing)
    // 1 Baseline Runner: PF (baseline / rim runner)
    const home: Record<Position, Point> = {
      PG: { x: 50, y: 76 }, // Point guard on top
      SF: { x: 22, y: 46 }, // Left wing
      C:  { x: 50, y: 44 }, // Center hub / High post
      SG: { x: 78, y: 46 }, // Right wing
      PF: { x: 50, y: 14 }, // Baseline runner
    };

    const raw: Record<Position, Point> = {
      PG: { ...home.PG },
      SF: { ...home.SF },
      C:  { ...home.C },
      SG: { ...home.SG },
      PF: { ...home.PF },
    };

    const states: Record<Position, DefenderState> = {
      PG: 'ZONE_GUARD',
      SF: 'ZONE_GUARD',
      C:  'ZONE_GUARD',
      SG: 'ZONE_GUARD',
      PF: 'ZONE_GUARD',
    };

    const explanations: Record<Position, string> = {
      PG: 'Point chốt đỉnh',
      SF: 'Cánh trái tuyến giữa',
      C:  'Trung tâm kiểm soát High Post',
      SG: 'Cánh phải tuyến giữa',
      PF: 'Quét đường đáy (Baseline runner)',
    };

    let activeOnBall: Position = 'PG';
    const closeoutGap = 11 - (settings.pressure / 100) * 7.5;

    switch (ballZone) {
      case 'TOP': {
        activeOnBall = 'PG';
        raw.PG = lerp(ballPos, COURT_DIMENSIONS.BASKET, closeoutGap / distance(ballPos, COURT_DIMENSIONS.BASKET));
        states.PG = 'ON_BALL';
        explanations.PG = 'Gây áp lực bóng tại đỉnh vạch 3 điểm';

        // Middle line holds diamond
        raw.SF = { x: 24, y: 48 };
        raw.C = { x: 50, y: 40 };
        raw.SG = { x: 76, y: 48 };
        raw.PF = { x: 50, y: 14 }; // protects rim
        break;
      }

      case 'RIGHT_WING': {
        activeOnBall = 'SG';
        raw.SG = lerp(ballPos, COURT_DIMENSIONS.BASKET, closeoutGap / distance(ballPos, COURT_DIMENSIONS.BASKET));
        states.SG = 'ON_BALL';
        explanations.SG = 'Áp sát bóng cánh phải (Trap threat)';

        // Top defender PG shifts to right elbow to deny pass back to top
        raw.PG = { x: 60, y: 65 };
        states.PG = 'DENY';
        explanations.PG = 'Deny đường chuyền ngược lên đỉnh';

        // Center C shades ball-side high post
        raw.C = { x: 54, y: 38 };
        states.C = 'HELP';
        explanations.C = 'Khóa đường xuyên phá trung lộ';

        // Baseline runner PF shades toward right short corner
        raw.PF = { x: 68, y: 16 };
        states.PF = 'ZONE_GUARD';
        explanations.PF = 'Sẵn sàng bắt bóng góc phải';

        // Weak-side wing SF sinks to weak-side block
        raw.SF = { x: 32, y: 28 };
        states.SF = 'ROTATE';
        explanations.SF = 'Thu về Weak-side bọc lót';
        break;
      }

      case 'LEFT_WING': {
        activeOnBall = 'SF';
        raw.SF = lerp(ballPos, COURT_DIMENSIONS.BASKET, closeoutGap / distance(ballPos, COURT_DIMENSIONS.BASKET));
        states.SF = 'ON_BALL';
        explanations.SF = 'Áp sát bóng cánh trái (Trap threat)';

        raw.PG = { x: 40, y: 65 };
        states.PG = 'DENY';
        explanations.PG = 'Deny đường chuyền ngược lên đỉnh';

        raw.C = { x: 46, y: 38 };
        states.C = 'HELP';
        explanations.C = 'Khóa đường xuyên phá trung lộ';

        raw.PF = { x: 32, y: 16 };
        states.PF = 'ZONE_GUARD';
        explanations.PF = 'Sẵn sàng bắt bóng góc trái';

        raw.SG = { x: 68, y: 28 };
        states.SG = 'ROTATE';
        explanations.SG = 'Thu về Weak-side bọc lót';
        break;
      }

      case 'RIGHT_CORNER':
      case 'SHORT_CORNER_RIGHT': {
        // Baseline runner PF sprints to right corner!
        activeOnBall = 'PF';
        raw.PF = lerp(ballPos, COURT_DIMENSIONS.BASKET, closeoutGap / distance(ballPos, COURT_DIMENSIONS.BASKET));
        states.PF = 'ON_BALL';
        explanations.PF = 'Baseline runner quét góc phải cản bóng';

        // Wing SG traps or denies return pass
        raw.SG = { x: 78, y: 34 };
        states.SG = 'DENY';
        explanations.SG = 'Phối hợp trap và chặn chuyền về cánh';

        // Center C drops directly to rim protection!
        raw.C = { x: 54, y: 16 };
        states.C = 'HELP';
        explanations.C = 'Hạ xuống neo rổ bảo vệ vòng trong';

        // SF rotates to weak-side paint
        raw.SF = { x: 36, y: 22 };
        states.SF = 'ROTATE';
        explanations.SF = 'Bọc lót Weak-side và tranh chấp bóng bật';

        // PG drops to foul line
        raw.PG = { x: 54, y: 52 };
        states.PG = 'ROTATE';
        break;
      }

      case 'LEFT_CORNER':
      case 'SHORT_CORNER_LEFT': {
        activeOnBall = 'PF';
        raw.PF = lerp(ballPos, COURT_DIMENSIONS.BASKET, closeoutGap / distance(ballPos, COURT_DIMENSIONS.BASKET));
        states.PF = 'ON_BALL';
        explanations.PF = 'Baseline runner quét góc trái cản bóng';

        raw.SF = { x: 22, y: 34 };
        states.SF = 'DENY';
        explanations.SF = 'Phối hợp trap và chặn chuyền về cánh';

        raw.C = { x: 46, y: 16 };
        states.C = 'HELP';
        explanations.C = 'Hạ xuống neo rổ bảo vệ vòng trong';

        raw.SG = { x: 64, y: 22 };
        states.SG = 'ROTATE';
        explanations.SG = 'Bọc lót Weak-side và tranh chấp bóng bật';

        raw.PG = { x: 46, y: 52 };
        states.PG = 'ROTATE';
        break;
      }

      case 'HIGH_POST':
      case 'PAINT':
      case 'LEFT_LOW_POST':
      case 'RIGHT_LOW_POST': {
        // High post / paint: Center C contests, PG and PF sandwich
        activeOnBall = 'C';
        raw.C = lerp(ballPos, COURT_DIMENSIONS.BASKET, 0.4);
        raw.PG = { x: 50, y: 56 };
        raw.PF = { x: 50, y: 16 };
        states.C = 'ON_BALL';
        states.PG = 'HELP';
        states.PF = 'HELP';
        explanations.C = 'Chặn đứng bóng tại trung tâm 1-3-1';
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
        explanations[trackingDefender] = `1-3-1 Zone handoff: Theo kèm cutter (${cutterPos})`;
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
