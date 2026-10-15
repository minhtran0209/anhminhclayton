import { describe, it, expect } from 'vitest';
import { OFFENSIVE_FORMATIONS } from '../tactics/offense/formations';
import { POSITIONS } from '../config/constants';
import { getDefenseStrategy } from '../engine/defense';
import { ManToManDefense } from '../engine/defense/manToMan';
import { Zone23Defense } from '../engine/defense/zone23';
import { Zone32Defense } from '../engine/defense/zone32';
import { Zone131Defense } from '../engine/defense/zone131';
import { DEFAULT_DEFENSIVE_SETTINGS } from '../config/constants';
import { Player, Position } from '../types/basketball';
import { distance, clampPoint, calculateScreenPosition, checkScreenCollision } from '../engine/geometry/courtGeometry';
import { getCourtZone } from '../engine/geometry/zones';
import { executeOffensiveAction } from '../engine/simulation/tacticalEngine';

function createMockOffense(formation: keyof typeof OFFENSIVE_FORMATIONS): Record<Position, Player> {
  const coords = OFFENSIVE_FORMATIONS[formation];
  const offense = {} as Record<Position, Player>;
  POSITIONS.forEach((pos) => {
    offense[pos] = {
      id: `offense-${pos}`,
      team: 'offense',
      position: pos,
      coord: { ...coords[pos] },
    };
  });
  return offense;
}

describe('1. Offensive Formations', () => {
  it('5-Out returns exactly 5 valid unique positions within court bounds', () => {
    const formation = OFFENSIVE_FORMATIONS['5-Out'];
    expect(Object.keys(formation)).toHaveLength(5);

    POSITIONS.forEach((pos) => {
      const coord = formation[pos];
      expect(coord.x).toBeGreaterThanOrEqual(0);
      expect(coord.x).toBeLessThanOrEqual(100);
      expect(coord.y).toBeGreaterThanOrEqual(0);
      expect(coord.y).toBeLessThanOrEqual(100);
    });

    // Check uniqueness (no two players on exact same point)
    for (let i = 0; i < POSITIONS.length; i++) {
      for (let j = i + 1; j < POSITIONS.length; j++) {
        const d = distance(formation[POSITIONS[i]], formation[POSITIONS[j]]);
        expect(d).toBeGreaterThan(10);
      }
    }
  });

  it('Horns places two bigs (PF, C) near elbows (high post)', () => {
    const horns = OFFENSIVE_FORMATIONS['Horns'];
    expect(horns.PF.y).toBeGreaterThan(35);
    expect(horns.PF.y).toBeLessThan(50);
    expect(horns.C.y).toBeGreaterThan(35);
    expect(horns.C.y).toBeLessThan(50);
  });
});

describe('2. Defensive Tactical Sliders & Transformations', () => {
  it('Defensive Width: increasing width increases horizontal spread', () => {
    const offense = createMockOffense('5-Out');
    const strategy = new Zone23Defense();

    const lowWidthSettings = { ...DEFAULT_DEFENSIVE_SETTINGS, width: 10 };
    const highWidthSettings = { ...DEFAULT_DEFENSIVE_SETTINGS, width: 95 };

    const lowResult = strategy.calculate({
      offense,
      ballHolder: 'PG',
      settings: lowWidthSettings,
    });

    const highResult = strategy.calculate({
      offense,
      ballHolder: 'PG',
      settings: highWidthSettings,
    });

    // Horizontal spread of lower defenders SF (left) and PF (right)
    const lowSpread = lowResult.positions.PF.x - lowResult.positions.SF.x;
    const highSpread = highResult.positions.PF.x - highResult.positions.SF.x;

    expect(highSpread).toBeGreaterThan(lowSpread);
  });

  it('Defensive Height: increasing height raises pickup positioning', () => {
    const offense = createMockOffense('5-Out');
    const strategy = new ManToManDefense();

    const lowHeightSettings = { ...DEFAULT_DEFENSIVE_SETTINGS, height: 10 };
    const highHeightSettings = { ...DEFAULT_DEFENSIVE_SETTINGS, height: 95 };

    const lowResult = strategy.calculate({
      offense,
      ballHolder: 'PG',
      settings: lowHeightSettings,
    });

    const highResult = strategy.calculate({
      offense,
      ballHolder: 'PG',
      settings: highHeightSettings,
    });

    // In normalized coords, higher height means larger Y (towards half-court line at y=100)
    expect(highResult.positions.PG.y).toBeGreaterThan(lowResult.positions.PG.y);
  });

  it('Ball-side Shift: ball on right wing shifts zone shell to the right', () => {
    const offense = createMockOffense('5-Out');
    const strategy = new Zone23Defense();

    // Center ball
    const centerResult = strategy.calculate({
      offense,
      ballHolder: 'PG', // at x=50
      settings: { ...DEFAULT_DEFENSIVE_SETTINGS, ballSideShift: 80 },
    });

    // Pass to right wing (SG is at x=84)
    const rightWingResult = strategy.calculate({
      offense,
      ballHolder: 'SG',
      settings: { ...DEFAULT_DEFENSIVE_SETTINGS, ballSideShift: 80 },
    });

    // Average X of all defenders should shift to the right (larger X)
    const centerAvgX = POSITIONS.reduce((acc, p) => acc + centerResult.positions[p].x, 0) / 5;
    const rightAvgX = POSITIONS.reduce((acc, p) => acc + rightWingResult.positions[p].x, 0) / 5;

    expect(rightAvgX).toBeGreaterThan(centerAvgX);
  });
});

describe('3. Man-to-Man Defense & Screen Policy', () => {
  it('assigns each defender to their respective position by default', () => {
    const offense = createMockOffense('5-Out');
    const strategy = new ManToManDefense();

    const result = strategy.calculate({
      offense,
      ballHolder: 'PG',
      settings: DEFAULT_DEFENSIVE_SETTINGS,
    });

    expect(result.assignments?.PG).toBe('PG');
    expect(result.assignments?.SG).toBe('SG');
    expect(result.assignments?.SF).toBe('SF');
    expect(result.assignments?.PF).toBe('PF');
    expect(result.assignments?.C).toBe('C');
  });

  it('Screen Switch: exchanges two assignments when screen policy is Switch', () => {
    const offense = createMockOffense('5-Out');
    const strategy = new ManToManDefense();

    const result = strategy.calculate({
      offense,
      ballHolder: 'PG',
      settings: { ...DEFAULT_DEFENSIVE_SETTINGS, screenPolicy: 'Switch' },
      activeScreen: {
        screener: 'C',
        target: 'PG',
        point: { x: 48, y: 75 },
      },
    });

    // C's defender and PG's defender swap assignments!
    expect(result.assignments?.C).toBe('PG');
    expect(result.assignments?.PG).toBe('C');
    expect(result.states.C).toBe('SWITCH');
    expect(result.states.PG).toBe('SWITCH');
  });
});

describe('4. Zone Defenses (2-3, 3-2, 1-3-1)', () => {
  it('2-3 Zone: right corner ball pulls PF to corner, C to ball-side block, SF weak-side', () => {
    const offense = createMockOffense('5-Out');
    // Place PF in corner
    offense.PF.coord = { x: 88, y: 14 };
    const strategy = new Zone23Defense();

    const result = strategy.calculate({
      offense,
      ballHolder: 'PF',
      settings: DEFAULT_DEFENSIVE_SETTINGS,
    });

    expect(result.states.PF).toBe('ON_BALL');
    expect(result.positions.PF.x).toBeGreaterThan(70);
    expect(result.states.C).toBe('HELP');
    expect(result.states.SF).toBe('ROTATE');
  });

  it('1-3-1 Zone: forms distinct cross / diamond shape with Point, Middle line, and Baseline runner', () => {
    const offense = createMockOffense('5-Out');
    const strategy = new Zone131Defense();

    const result = strategy.calculate({
      offense,
      ballHolder: 'PG',
      settings: DEFAULT_DEFENSIVE_SETTINGS,
    });

    // PG is highest point (y > 65)
    expect(result.positions.PG.y).toBeGreaterThan(65);
    // PF is baseline runner (lowest y < 25)
    expect(result.positions.PF.y).toBeLessThan(25);
    // C is middle hub
    expect(result.positions.C.y).toBeGreaterThan(30);
    expect(result.positions.C.y).toBeLessThan(55);
  });
});

describe('5. Court Boundaries & Safety', () => {
  it('no calculated player position escapes allowed court bounds', () => {
    const offense = createMockOffense('5-Out');
    const strategies = ['Man-to-Man', '2-3 Zone', '3-2 Zone', '1-3-1 Zone'] as const;

    strategies.forEach((sys) => {
      const strategy = getDefenseStrategy(sys);
      const result = strategy.calculate({
        offense,
        ballHolder: 'PG',
        settings: {
          height: 100,
          width: 100,
          compactness: 100,
          pressure: 100,
          helpDefense: 100,
          ballSideShift: 100,
          paintPerimeterBias: 100,
          screenPolicy: 'Auto',
        },
      });

      POSITIONS.forEach((pos) => {
        const coord = result.positions[pos];
        expect(coord.x).toBeGreaterThanOrEqual(4);
        expect(coord.x).toBeLessThanOrEqual(96);
        expect(coord.y).toBeGreaterThanOrEqual(4);
        expect(coord.y).toBeLessThanOrEqual(96);
        expect(isNaN(coord.x)).toBe(false);
        expect(isNaN(coord.y)).toBe(false);
      });
    });
  });
});

describe('6. Simulation & Action Execution', () => {
  it('Pass action transfers ball holder and updates defense', () => {
    const offense = createMockOffense('5-Out');
    const offenseCoords = {} as Record<Position, { x: number; y: number }>;
    POSITIONS.forEach((p) => {
      offenseCoords[p] = offense[p].coord;
    });

    const snapshot = {
      offense: offenseCoords,
      defense: {} as any,
      ballHolder: 'PG' as Position,
      currentFormation: '5-Out' as const,
      defensiveSystem: 'Man-to-Man' as const,
      defensiveSettings: DEFAULT_DEFENSIVE_SETTINGS,
    };

    const result = executeOffensiveAction(
      {
        player: 'PG',
        action: 'pass',
        targetPlayer: 'SG',
        path: [offense.PG.coord, offense.SG.coord],
        isValid: true,
      },
      snapshot,
      1
    );

    expect(result.updatedBallHolder).toBe('SG');
    expect(result.event.action).toBe('pass');
    expect(result.event.targetPlayer).toBe('SG');
  });

  it('Zone Cutter Handoff: cutter moving through zone causes zone defender to track cutter', () => {
    const offense = createMockOffense('5-Out');
    // SG cuts into left paint zone
    offense.SG.coord = { x: 30, y: 22 };
    const strategy = new Zone23Defense();

    const result = strategy.calculate({
      offense,
      ballHolder: 'PG',
      settings: DEFAULT_DEFENSIVE_SETTINGS,
      lastAction: {
        action: 'cut',
        player: 'SG',
        path: [{ x: 84, y: 62 }, { x: 30, y: 22 }],
      },
    });

    // SF (responsible for left bottom zone) should track cutter
    expect(result.states.SF).toBe('TRACK_CUTTER');
    expect(result.explanations.SF).toContain('cutter');
  });

  it('3-2 Zone: corner ball pulls bottom defender to corner and opposite bottom to rim', () => {
    const offense = createMockOffense('5-Out');
    offense.PF.coord = { x: 88, y: 14 }; // Right corner
    const strategy = new Zone32Defense();

    const result = strategy.calculate({
      offense,
      ballHolder: 'PF',
      settings: DEFAULT_DEFENSIVE_SETTINGS,
    });

    expect(result.states.C).toBe('ON_BALL');
    expect(result.positions.C.x).toBeGreaterThan(70);
    expect(result.states.PF).toBe('HELP');
  });

  it('Screen direction selection: respects custom direction/clicked path destination', () => {
    const offense = createMockOffense('5-Out');
    const offenseCoords = {} as Record<Position, { x: number; y: number }>;
    POSITIONS.forEach((p) => {
      offenseCoords[p] = offense[p].coord;
    });

    const snapshot = {
      offense: offenseCoords,
      defense: {} as any,
      ballHolder: 'PG' as Position,
      currentFormation: '5-Out' as const,
      defensiveSystem: 'Man-to-Man' as const,
      defensiveSettings: DEFAULT_DEFENSIVE_SETTINGS,
    };

    // C screens for PG on the left side (x=43.5, y=79.5)
    const customLeftScreenPoint = { x: 43.5, y: 79.5 };
    const screenLeftResult = executeOffensiveAction(
      {
        player: 'C',
        action: 'screen',
        targetPlayer: 'PG',
        path: [offense.C.coord, customLeftScreenPoint],
        isValid: true,
      },
      snapshot,
      1
    );

    expect(screenLeftResult.updatedOffense.C.coord.x).toBeCloseTo(43.5);
    expect(screenLeftResult.updatedOffense.C.coord.y).toBeCloseTo(79.5);
    expect(screenLeftResult.activeScreen?.point.x).toBeCloseTo(43.5);
    expect(screenLeftResult.event.description).toContain('bên Trái');

    // C screens for PG on the right side (x=56.5, y=79.5)
    const customRightScreenPoint = { x: 56.5, y: 79.5 };
    const screenRightResult = executeOffensiveAction(
      {
        player: 'C',
        action: 'screen',
        targetPlayer: 'PG',
        path: [offense.C.coord, customRightScreenPoint],
        isValid: true,
      },
      snapshot,
      2
    );

    expect(screenRightResult.updatedOffense.C.coord.x).toBeCloseTo(56.5);
    expect(screenRightResult.activeScreen?.point.x).toBeCloseTo(56.5);
    expect(screenRightResult.event.description).toContain('bên Phải');
  });

  it('Hand-off direction selection: moves ball handler along path, moves receiver to meet, transfers ball', () => {
    const offense = createMockOffense('5-Out');
    const offenseCoords = {} as Record<Position, { x: number; y: number }>;
    POSITIONS.forEach((p) => {
      offenseCoords[p] = offense[p].coord;
    });

    const snapshot = {
      offense: offenseCoords,
      defense: {} as any,
      ballHolder: 'PG' as Position,
      currentFormation: '5-Out' as const,
      defensiveSystem: 'Man-to-Man' as const,
      defensiveSettings: DEFAULT_DEFENSIVE_SETTINGS,
    };

    // PG runs hand-off to left wing meeting point (x=30, y=55)
    const customHandoffPoint = { x: 30, y: 55 };
    const result = executeOffensiveAction(
      {
        player: 'PG',
        action: 'handoff',
        targetPlayer: 'SG',
        path: [offense.PG.coord, customHandoffPoint],
        isValid: true,
      },
      snapshot,
      1
    );

    // Ball transferred to receiver
    expect(result.updatedBallHolder).toBe('SG');
    // Ball handler reaches the custom handoff spot
    expect(result.updatedOffense.PG.coord.x).toBeCloseTo(30);
    expect(result.updatedOffense.PG.coord.y).toBeCloseTo(55);
    // Receiver is positioned adjacent to the handoff spot to take the ball
    expect(Math.abs(result.updatedOffense.SG.coord.x - 30)).toBeLessThan(6);
    expect(result.updatedOffense.SG.coord.y).toBeCloseTo(55);
    expect(result.event.description).toContain('Hand-off');
  });
});

describe('8. Shot & Layup Contest Calculations', () => {
  it('Shoot: calculates contest distance, contest level, and assigns appropriate probability for 3PT', () => {
    const offense = createMockOffense('5-Out');
    const offenseCoords = {} as Record<Position, { x: number; y: number }>;
    POSITIONS.forEach((p) => {
      offenseCoords[p] = offense[p].coord;
    });

    // Case 1: Wide Open 3PT (defenders pushed back into paint)
    const deepPaintDefense = {} as Record<Position, { coord: { x: number; y: number } }>;
    POSITIONS.forEach((p) => {
      deepPaintDefense[p] = { coord: { x: 50, y: 15 } };
    });

    const wideOpenSnapshot = {
      offense: offenseCoords,
      defense: deepPaintDefense as any,
      ballHolder: 'PG' as Position, // at (50, 80), basket is at (50, 8) -> dist is 72, defenders at y=15 -> dist is 65
      currentFormation: '5-Out' as const,
      defensiveSystem: 'Man-to-Man' as const,
      defensiveSettings: DEFAULT_DEFENSIVE_SETTINGS,
    };

    const wideOpenResult = executeOffensiveAction(
      {
        player: 'PG',
        action: 'shoot',
        isValid: true,
      },
      wideOpenSnapshot,
      1
    );

    expect(wideOpenResult.event.shotResult).toBeDefined();
    const shot = wideOpenResult.event.shotResult!;
    expect(shot.shotType).toBe('three');
    expect(shot.points).toBe(3);
    expect(shot.contestLevel).toBe('WIDE_OPEN');
    expect(shot.probability).toBe(46);
    expect(shot.contestDistance).toBeGreaterThan(11);

    // Case 2: Heavily Contested (defender right in PG face, e.g. dist 1.5)
    const tightDefense = { ...deepPaintDefense };
    tightDefense.PG = { coord: { x: 50, y: 78.5 } }; // 1.5 units from PG (50, 80)

    const smotheredSnapshot = {
      ...wideOpenSnapshot,
      defense: tightDefense as any,
    };

    const smotheredResult = executeOffensiveAction(
      {
        player: 'PG',
        action: 'shoot',
        isValid: true,
      },
      smotheredSnapshot,
      2
    );

    expect(smotheredResult.event.shotResult).toBeDefined();
    const smotheredShot = smotheredResult.event.shotResult!;
    expect(smotheredShot.contestLevel).toBe('HEAVILY_CONTESTED');
    expect(smotheredShot.probability).toBe(14);
    expect(smotheredShot.contestDefender).toBe('PG');
    expect(smotheredShot.contestDistance).toBeLessThan(3.8);
  });

  it('Layup: cuts directly to rim, evaluates rim protection contest, awards 2 points if made', () => {
    const offense = createMockOffense('5-Out');
    const offenseCoords = {} as Record<Position, { x: number; y: number }>;
    POSITIONS.forEach((p) => {
      offenseCoords[p] = offense[p].coord;
    });

    // Case 1: Driving from 3PT line (PG at 50, 80) with on-ball defender right in front (50, 75) without screen
    // Must be contested (NOT wide open 84%!)
    const perimeterDefense = {} as Record<Position, { coord: { x: number; y: number } }>;
    POSITIONS.forEach((p) => {
      perimeterDefense[p] = { coord: { x: 50, y: 75 } };
    });

    const contestedPerimeterDriveSnapshot = {
      offense: offenseCoords,
      defense: perimeterDefense as any,
      ballHolder: 'PG' as Position,
      currentFormation: '5-Out' as const,
      defensiveSystem: 'Man-to-Man' as const,
      defensiveSettings: DEFAULT_DEFENSIVE_SETTINGS,
    };

    const contestedDriveResult = executeOffensiveAction(
      {
        player: 'PG',
        action: 'layup',
        isValid: true,
      },
      contestedPerimeterDriveSnapshot,
      1
    );

    // Player cuts to rim (50, 13)
    expect(contestedDriveResult.updatedOffense.PG.coord.x).toBeCloseTo(50);
    expect(contestedDriveResult.updatedOffense.PG.coord.y).toBeCloseTo(13);

    expect(contestedDriveResult.event.shotResult).toBeDefined();
    const driveShot = contestedDriveResult.event.shotResult!;
    expect(driveShot.shotType).toBe('layup');
    expect(driveShot.points).toBe(2);
    // Crucial fix: Driving from 3PT line against an on-ball defender cannot be WIDE_OPEN 84%!
    expect(driveShot.contestLevel).not.toBe('WIDE_OPEN');
    expect(driveShot.probability).toBeLessThanOrEqual(44);

    // Case 2: True Wide Open Layup (player already close to basket, e.g. after backdoor cut)
    const closeOffenseCoords = { ...offenseCoords };
    closeOffenseCoords.PG = { x: 50, y: 18 }; // 10 units from basket (in the paint)

    const distantDefense = {} as Record<Position, { coord: { x: number; y: number } }>;
    POSITIONS.forEach((p) => {
      distantDefense[p] = { coord: { x: 80, y: 70 } };
    });

    const wideOpenCutSnapshot = {
      offense: closeOffenseCoords,
      defense: distantDefense as any,
      ballHolder: 'PG' as Position,
      currentFormation: '5-Out' as const,
      defensiveSystem: 'Man-to-Man' as const,
      defensiveSettings: { ...DEFAULT_DEFENSIVE_SETTINGS, pressure: 20 },
    };

    const wideOpenResult = executeOffensiveAction(
      {
        player: 'PG',
        action: 'layup',
        isValid: true,
      },
      wideOpenCutSnapshot,
      2
    );

    expect(wideOpenResult.event.shotResult).toBeDefined();
    const openLayup = wideOpenResult.event.shotResult!;
    expect(openLayup.shotType).toBe('layup');
    expect(openLayup.contestLevel).toBe('WIDE_OPEN');
    expect(openLayup.probability).toBe(84);

    // Case 3: Rim protector present (2-3 Zone with Center at rim)
    const zoneDefense = {} as Record<Position, { coord: { x: number; y: number } }>;
    POSITIONS.forEach((p) => {
      zoneDefense[p] = { coord: { x: 50, y: 50 } };
    });
    zoneDefense.C = { coord: { x: 50, y: 13 } }; // C right at rim

    const protectedRimSnapshot = {
      offense: offenseCoords,
      defense: zoneDefense as any,
      ballHolder: 'PG' as Position,
      currentFormation: '5-Out' as const,
      defensiveSystem: '2-3 Zone' as const,
      defensiveSettings: DEFAULT_DEFENSIVE_SETTINGS,
    };

    const contestedLayupResult = executeOffensiveAction(
      {
        player: 'PG',
        action: 'layup',
        isValid: true,
      },
      protectedRimSnapshot,
      3
    );

    expect(contestedLayupResult.event.shotResult).toBeDefined();
    const contestedLayup = contestedLayupResult.event.shotResult!;
    expect(contestedLayup.shotType).toBe('layup');
    expect(contestedLayup.contestLevel).toBe('HEAVILY_CONTESTED');
    expect(contestedLayup.probability).toBe(28);
    expect(contestedLayup.contestDistance).toBeLessThan(3.2);
  });
});

describe('9. Pick & Roll Screen Exploitation', () => {
  it('drive_off_screen: curves around screener and penetrates into paint', () => {
    const offense = createMockOffense('5-Out');
    const offenseCoords = {} as Record<Position, { x: number; y: number }>;
    POSITIONS.forEach((p) => {
      offenseCoords[p] = offense[p].coord;
    });

    const activeScreen = {
      screener: 'C' as Position,
      target: 'PG' as Position,
      point: { x: 44, y: 81 },
    };

    const snapshot = {
      offense: offenseCoords,
      defense: {} as any,
      ballHolder: 'PG' as Position,
      currentFormation: '5-Out' as const,
      defensiveSystem: 'Man-to-Man' as const,
      defensiveSettings: DEFAULT_DEFENSIVE_SETTINGS,
      activeScreen,
    };

    const result = executeOffensiveAction(
      {
        player: 'PG',
        action: 'drive_off_screen',
        isValid: true,
      },
      snapshot,
      1
    );

    // PG successfully drives to the left side and penetrates forward
    expect(result.updatedOffense.PG.coord.x).toBeLessThan(45);
    expect(result.updatedOffense.PG.coord.y).toBeLessThan(60);
    expect(result.event.description).toContain('Đột phá lướt qua Screen');
  });

  it('shoot_off_screen: screener blocks primary defender, providing separation and open shot', () => {
    const offense = createMockOffense('5-Out');
    const offenseCoords = {} as Record<Position, { x: number; y: number }>;
    POSITIONS.forEach((p) => {
      offenseCoords[p] = offense[p].coord;
    });

    const activeScreen = {
      screener: 'C' as Position,
      target: 'PG' as Position,
      point: { x: 44, y: 81 },
    };

    // Man to man with def-PG tight on PG (50, 78) and def-C dropping
    const defense = {
      PG: { coord: { x: 50, y: 78 } },
      SG: { coord: { x: 20, y: 60 } },
      SF: { coord: { x: 80, y: 60 } },
      PF: { coord: { x: 30, y: 70 } },
      C: { coord: { x: 50, y: 50 } }, // dropping big
    };

    const snapshot = {
      offense: offenseCoords,
      defense: defense as any,
      ballHolder: 'PG' as Position,
      currentFormation: '5-Out' as const,
      defensiveSystem: 'Man-to-Man' as const,
      defensiveSettings: DEFAULT_DEFENSIVE_SETTINGS,
      activeScreen,
    };

    const result = executeOffensiveAction(
      {
        player: 'PG',
        action: 'shoot_off_screen',
        isValid: true,
      },
      snapshot,
      1
    );

    expect(result.event.shotResult).toBeDefined();
    const shot = result.event.shotResult!;
    // Primary defender PG is screened, so contest is shielded
    expect(shot.contestLevel).not.toBe('HEAVILY_CONTESTED');
    expect(shot.probability).toBeGreaterThanOrEqual(44);
    expect(result.event.description).toContain('Ném rổ sau Screen');
    // Active screen is consumed after shot
    expect(result.activeScreen).toBeUndefined();
  });

  it('calculateScreenPosition: plants screen directly on the DEFENDER, not behind offensive teammate', () => {
    // Offensive PG at top of the key
    const offensivePG = { x: 50, y: 78 };
    // Defender guarding PG between PG and the basket (at 50, 8)
    const defensivePG = { x: 48, y: 65 };

    // Right screen (picks right hip of defender)
    const rightScreen = calculateScreenPosition(offensivePG, defensivePG, 'right');
    // Screen must be adjacent to defender (distance <= 5 court units)
    expect(distance(rightScreen, defensivePG)).toBeLessThanOrEqual(5);
    // Screen must be to the right of defender (x > 48)
    expect(rightScreen.x).toBeGreaterThan(defensivePG.x);
    // Screen must NOT be behind the offensive player (y must be closer to basket than offensivePG.y)
    expect(rightScreen.y).toBeLessThan(offensivePG.y);

    // Left screen (picks left hip of defender)
    const leftScreen = calculateScreenPosition(offensivePG, defensivePG, 'left');
    expect(distance(leftScreen, defensivePG)).toBeLessThanOrEqual(5);
    expect(leftScreen.x).toBeLessThan(defensivePG.x);
    expect(leftScreen.y).toBeLessThan(offensivePG.y);

    // Top / High screen (directly on defender's back)
    const topScreen = calculateScreenPosition(offensivePG, defensivePG, 'top');
    expect(distance(topScreen, defensivePG)).toBeLessThanOrEqual(5);
    expect(topScreen.y).toBeLessThan(offensivePG.y);
  });

  it('executeOffensiveAction: sets screen on defender and records screened defender in description', () => {
    const offense = createMockOffense('5-Out');
    const offenseCoords = {} as Record<Position, { x: number; y: number }>;
    POSITIONS.forEach((p) => {
      offenseCoords[p] = offense[p].coord;
    });

    const defense = {
      PG: { coord: { x: 50, y: 66 }, assignment: 'PG' as Position },
      SG: { coord: { x: 20, y: 50 }, assignment: 'SG' as Position },
      SF: { coord: { x: 80, y: 50 }, assignment: 'SF' as Position },
      PF: { coord: { x: 30, y: 40 }, assignment: 'PF' as Position },
      C: { coord: { x: 50, y: 30 }, assignment: 'C' as Position },
    };

    const snapshot = {
      offense: offenseCoords,
      defense: defense as any,
      ballHolder: 'PG' as Position,
      currentFormation: '5-Out' as const,
      defensiveSystem: 'Man-to-Man' as const,
      defensiveSettings: DEFAULT_DEFENSIVE_SETTINGS,
    };

    const result = executeOffensiveAction(
      {
        player: 'C',
        action: 'screen',
        targetPlayer: 'PG',
        isValid: true,
      },
      snapshot,
      1
    );

    expect(result.activeScreen).toBeDefined();
    expect(result.activeScreen?.screener).toBe('C');
    expect(result.activeScreen?.target).toBe('PG');
    // Screen point is adjacent to defensive PG (50, 66), NOT behind offensive PG (50, 78)
    expect(distance(result.activeScreen!.point, defense.PG.coord)).toBeLessThanOrEqual(6);
    expect(result.activeScreen!.point.y).toBeLessThan(78);
    expect(result.event.description).toContain('cản PG');
  });

  it('checkScreenCollision: stops pursuing defender at screen and creates open space', () => {
    const screenPoint = { x: 52, y: 66 };
    const ballStart = { x: 50, y: 78 };
    const ballEnd = { x: 55, y: 45 }; // ball handler drove past screen into paint
    const defStart = { x: 48, y: 65 };
    const defIdeal = { x: 55, y: 38 }; // defender attempting to chase ball handler

    const collision = checkScreenCollision(screenPoint, ballStart, ballEnd, defStart, defIdeal);

    expect(collision.hasCollided).toBe(true);
    // Defender is blocked near the screen
    expect(distance(collision.blockedPosition, screenPoint)).toBeLessThanOrEqual(4.5);
    // Huge separation created between ball handler and blocked defender
    expect(collision.separationDistance).toBeGreaterThan(15);
  });

  it('ManToManDefense: blocks defender with SCREENED state when ball handler drives past screen under Stay policy', () => {
    const offense = createMockOffense('5-Out');
    // Ball handler PG has driven past screen to (55, 48)
    offense.PG.coord = { x: 55, y: 48 };

    const activeScreen = {
      screener: 'C' as Position,
      target: 'PG' as Position,
      point: { x: 52, y: 66 },
    };

    const strategy = new ManToManDefense();
    const result = strategy.calculate({
      offense,
      ballHolder: 'PG',
      settings: { ...DEFAULT_DEFENSIVE_SETTINGS, screenPolicy: 'Stay' },
      activeScreen,
      lastAction: {
        action: 'dribble',
        player: 'PG',
        path: [{ x: 50, y: 78 }, { x: 55, y: 48 }],
      },
      previousDefense: {
        PG: { x: 48, y: 65 },
        SG: { x: 20, y: 55 },
        SF: { x: 80, y: 55 },
        PF: { x: 30, y: 45 },
        C: { x: 50, y: 30 },
      },
    });

    // PG's defender was blocked at the screen
    expect(result.states.PG).toBe('SCREENED');
    expect(result.explanations.PG).toContain('Bị C cản lại');
    // Defender stayed back near the screen (y >= 64), while PG is down at y = 48
    expect(result.positions.PG.y).toBeGreaterThan(60);
    // Separation is wide open (> 12 court units)
    expect(distance(offense.PG.coord, result.positions.PG)).toBeGreaterThan(12);
  });
});


