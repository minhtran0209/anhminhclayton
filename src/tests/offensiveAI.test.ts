import { describe, it, expect, beforeEach } from 'vitest';
import { decideNextAIAction, generateTacticalWinAnalysis } from '../engine/simulation/offensiveAI';
import { OFFENSIVE_FORMATIONS } from '../tactics/offense/formations';
import { DEFAULT_DEFENSIVE_SETTINGS } from '../config/constants';
import { Position, Player, TacticalEvent } from '../types/basketball';
import { useGameStore } from '../state/useGameStore';

function createMockPlayers(coords: Record<Position, { x: number; y: number }>, team: 'offense' | 'defense') {
  const players = {} as Record<Position, Player>;
  (Object.keys(coords) as Position[]).forEach((pos) => {
    players[pos] = {
      id: `${team}-${pos}`,
      team,
      position: pos,
      coord: { ...coords[pos] },
    };
  });
  return players;
}

describe('AI Tactical Simulation Engine', () => {
  const offense = createMockPlayers(OFFENSIVE_FORMATIONS['5-Out'], 'offense');
  const defense = createMockPlayers(
    {
      PG: { x: 50, y: 35 },
      SG: { x: 26, y: 36 },
      SF: { x: 74, y: 36 },
      PF: { x: 30, y: 16 },
      C: { x: 50, y: 14 },
    },
    'defense'
  );

  it('decides an intelligent tactical action for the offense', () => {
    const decision = decideNextAIAction(
      offense,
      defense,
      'PG',
      'Man-to-Man',
      DEFAULT_DEFENSIVE_SETTINGS,
      undefined,
      1
    );

    expect(decision).toBeDefined();
    expect(decision.draft).toBeDefined();
    expect(['PG', 'SG', 'SF', 'PF', 'C']).toContain(decision.draft.player);
    expect(decision.thought).toBeTruthy();
    expect(decision.tacticName).toBeTruthy();
    expect(decision.draft.isValid).toBe(true);
  });

  it('generates high rewards and tactical breakdown on successful basket', () => {
    const mockEvents: TacticalEvent[] = [
      {
        id: '1',
        stepNumber: 1,
        action: 'screen',
        player: 'C',
        timestamp: Date.now(),
        description: 'C screens for PG',
      },
      {
        id: '2',
        stepNumber: 2,
        action: 'pass',
        player: 'PG',
        targetPlayer: 'SG',
        timestamp: Date.now(),
        description: 'PG passes to SG',
      },
      {
        id: '3',
        stepNumber: 3,
        action: 'shoot',
        player: 'SG',
        timestamp: Date.now(),
        description: 'SG shoots 3PT',
        shotResult: {
          shotType: 'three',
          distanceToBasket: 26,
          contestDistance: 8.5,
          contestLevel: 'WIDE_OPEN',
          contestDefender: 'SG',
          probability: 50,
          made: true,
          points: 3,
        },
      },
    ];

    const analysis = generateTacticalWinAnalysis(
      mockEvents,
      mockEvents[2],
      '2-3 Zone',
      DEFAULT_DEFENSIVE_SETTINGS,
      1
    );

    expect(analysis.isWin).toBe(true);
    expect(analysis.reward).toBeGreaterThanOrEqual(160); // 120 (3P) + 60 (Wide Open) + 40 (Screen)
    expect(analysis.pointsEarned).toBe(3);
    expect(analysis.defensiveBreakdown).toContain('2-3 Zone');
    expect(analysis.explanation).toBeTruthy();
    expect(analysis.keyTactics.length).toBeGreaterThan(0);
  });

  it('allows starting, pausing, and stopping simulation in store', () => {
    const store = useGameStore.getState();

    store.startSimulation();
    expect(useGameStore.getState().isSimulating).toBe(true);
    expect(useGameStore.getState().isSimulationPaused).toBe(false);

    store.pauseSimulation();
    expect(useGameStore.getState().isSimulationPaused).toBe(true);

    store.stopSimulation();
    expect(useGameStore.getState().isSimulating).toBe(false);
  });

  it('Requirement 2: Adaptive AI switches direction away from 3PT on previous 3PT miss', () => {
    const decision = decideNextAIAction(
      offense,
      defense,
      'PG',
      'Man-to-Man',
      DEFAULT_DEFENSIVE_SETTINGS,
      undefined,
      1,
      {
        lastFailureType: '3PT_MISSED',
        consecutiveFailures: 1,
        favoredTactic: 'pick_and_roll',
      }
    );

    expect(decision.draft.action).not.toBe('shoot');
    expect(decision.thought).toContain('Đợt trước ném 3 hụt');
    expect(decision.tacticName).toContain('Pick & Roll');
  });

  it('Requirement 2: Adaptive AI makes immediate pass to escape pressure after steal turnover', () => {
    // Tight defender on PG
    const tightDef = createMockPlayers(
      {
        PG: { x: 50, y: 76 }, // 2m from PG at (50, 78)
        SG: { x: 30, y: 50 },
        SF: { x: 70, y: 50 },
        PF: { x: 30, y: 20 },
        C: { x: 50, y: 20 },
      },
      'defense'
    );

    const decision = decideNextAIAction(
      offense,
      tightDef,
      'PG',
      'Man-to-Man',
      DEFAULT_DEFENSIVE_SETTINGS,
      undefined,
      1,
      {
        lastFailureType: 'STEAL_TURNOVER',
        consecutiveFailures: 1,
        favoredTactic: 'perimeter_ball_movement',
      }
    );

    expect(decision.draft.action).toBe('pass');
    expect(decision.thought).toContain('Tránh bẫy cướp bóng');
    expect(decision.tacticName).toContain('Chuyền Nhanh Thoát Áp Lực Steal');
  });
});
