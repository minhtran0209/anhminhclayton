import { describe, it, expect, beforeEach } from 'vitest';
import {
  analyzeOpponentAndAdaptDefense,
  generateDefenseStopAnalysis,
} from '../engine/simulation/defensiveAI';
import { OFFENSIVE_FORMATIONS } from '../tactics/offense/formations';
import { DEFAULT_DEFENSIVE_SETTINGS } from '../config/constants';
import { Position, Player, TacticalEvent, DefenseAdaptiveMemory } from '../types/basketball';
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

describe('Defensive AI Simulation & Real-time Adaptation Engine', () => {
  const offense = createMockPlayers(OFFENSIVE_FORMATIONS['5-Out'], 'offense');
  const defense = createMockPlayers(
    {
      PG: { x: 50, y: 40 },
      SG: { x: 25, y: 35 },
      SF: { x: 75, y: 35 },
      PF: { x: 30, y: 15 },
      C: { x: 50, y: 15 },
    },
    'defense'
  );

  const initialMemory: DefenseAdaptiveMemory = {
    recentOffenseActions: [],
    consecutiveStops: 0,
    consecutiveConceded: 0,
    activeAdjustments: [],
  };

  it('Requirement: Real-time learning on conceded 3PT -> Adapts to 3-2 / 1-3-1 Zone, raises Height and pushes perimeter bias', () => {
    const conceded3PtEvent: TacticalEvent = {
      id: 'event-1',
      stepNumber: 3,
      player: 'SG',
      action: 'shoot',
      timestamp: Date.now(),
      description: 'SG shoots 3PT',
      shotResult: {
        shotType: 'three',
        distanceToBasket: 26,
        contestDistance: 9,
        contestLevel: 'OPEN',
        contestDefender: 'SG',
        probability: 40,
        made: true, // Offense scored!
        points: 3,
      },
    };

    const decision = analyzeOpponentAndAdaptDefense(
      offense,
      defense,
      'SG',
      'Man-to-Man',
      DEFAULT_DEFENSIVE_SETTINGS,
      initialMemory,
      conceded3PtEvent,
      1
    );

    expect(['3-2 Zone', '1-3-1 Zone']).toContain(decision.adaptedSystem);
    expect(decision.adaptedSettings.height).toBeGreaterThan(DEFAULT_DEFENSIVE_SETTINGS.height);
    expect(decision.adaptedSettings.paintPerimeterBias).toBeGreaterThan(0); // Protect perimeter
    expect(decision.thought).toContain('SỬA SAI THỜI GIAN THỰC');
    expect(decision.thought).toContain('3 điểm');
  });

  it('Requirement: Real-time learning on conceded Layup -> Adapts to 2-3 Zone and locks paint with high compactness', () => {
    const concededLayupEvent: TacticalEvent = {
      id: 'event-2',
      stepNumber: 2,
      player: 'PG',
      action: 'layup',
      timestamp: Date.now(),
      description: 'PG drives and makes layup',
      shotResult: {
        shotType: 'mid',
        distanceToBasket: 8,
        contestDistance: 5,
        contestLevel: 'OPEN',
        contestDefender: 'C',
        probability: 60,
        made: true, // Offense scored!
        points: 2,
      },
    };

    const decision = analyzeOpponentAndAdaptDefense(
      offense,
      defense,
      'PG',
      'Man-to-Man',
      DEFAULT_DEFENSIVE_SETTINGS,
      initialMemory,
      concededLayupEvent,
      1
    );

    expect(decision.adaptedSystem).toBe('2-3 Zone');
    expect(decision.adaptedSettings.compactness).toBeGreaterThan(DEFAULT_DEFENSIVE_SETTINGS.compactness);
    expect(decision.adaptedSettings.paintPerimeterBias).toBeLessThan(0); // Protect paint
    expect(decision.thought).toContain('SỬA SAI THỜI GIAN THỰC');
    expect(decision.thought).toContain('cận thành');
  });

  it('Requirement: Opponent Counter -> Detects Pick & Roll and switches screen policy to Switch', () => {
    const screenMemory: DefenseAdaptiveMemory = {
      ...initialMemory,
      recentOffenseActions: ['screen', 'shoot_off_screen'],
    };

    const screenEvent: TacticalEvent = {
      id: 'event-3',
      stepNumber: 1,
      player: 'C',
      action: 'screen',
      targetPlayer: 'PG',
      timestamp: Date.now(),
      description: 'C screens for PG',
    };

    const decision = analyzeOpponentAndAdaptDefense(
      offense,
      defense,
      'PG',
      'Man-to-Man',
      DEFAULT_DEFENSIVE_SETTINGS,
      screenMemory,
      screenEvent,
      1
    );

    expect(decision.adaptedSystem).toBe('Man-to-Man');
    expect(decision.adaptedSettings.screenPolicy).toBe('Switch');
    expect(decision.thought).toContain('BẮT BÀI PICK & ROLL');
  });

  it('Requirement: Generates detailed Defense Stop tactical analysis with high reward on Steal', () => {
    const stealEvent: TacticalEvent = {
      id: 'steal-event',
      stepNumber: 2,
      player: 'PG',
      action: 'move',
      timestamp: Date.now(),
      description: 'Steal by PG',
      isSteal: true,
      stealer: 'PG',
      stealDistance: 1.8,
    };

    const analysis = generateDefenseStopAnalysis(
      [stealEvent],
      stealEvent,
      'Man-to-Man',
      { ...DEFAULT_DEFENSIVE_SETTINGS, pressure: 80 },
      1
    );

    expect(analysis.isSteal).toBe(true);
    expect(analysis.stealer).toBe('PG');
    expect(analysis.reward).toBeGreaterThanOrEqual(160);
    expect(analysis.title).toContain('CƯỚP BÓNG XUẤT THẦN');
    expect(analysis.explanation).toContain('cướp bóng');
    expect(analysis.keyDefenseMoves.length).toBeGreaterThan(0);
  });

  it('allows starting, pausing, and stopping defense simulation in store', () => {
    const store = useGameStore.getState();

    store.startDefenseSimulation();
    expect(useGameStore.getState().isDefenseSimulating).toBe(true);
    expect(useGameStore.getState().isDefenseSimulationPaused).toBe(false);

    store.pauseDefenseSimulation();
    expect(useGameStore.getState().isDefenseSimulationPaused).toBe(true);

    store.stopDefenseSimulation();
    expect(useGameStore.getState().isDefenseSimulating).toBe(false);
  });
});
