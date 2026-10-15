import { describe, it, expect, beforeEach } from 'vitest';
import {
  OFFENSIVE_PLAYBOOK,
  getPlaybookPlay,
  selectBestPlaybookPlay,
  getPlaybookDecisionForStep,
} from '../tactics/offense/playbook';
import { decideNextAIAction } from '../engine/simulation/offensiveAI';
import { OFFENSIVE_FORMATIONS } from '../tactics/offense/formations';
import { DEFAULT_DEFENSIVE_SETTINGS } from '../config/constants';
import { Position, Player } from '../types/basketball';
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

describe('Offensive Playbook & Tactical Statistics', () => {
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

  beforeEach(() => {
    useGameStore.getState().resetStats();
  });

  describe('10 High-Efficiency Playbook Plays', () => {
    it('contains exactly 10 high-percentage tactical plays', () => {
      expect(OFFENSIVE_PLAYBOOK).toHaveLength(10);
    });

    it('every play has valid metadata, 5 steps, and micro-triggers', () => {
      OFFENSIVE_PLAYBOOK.forEach((play) => {
        expect(play.id).toBeTruthy();
        expect(play.name).toBeTruthy();
        expect(play.vietnameseName).toBeTruthy();
        expect(play.expectedWinRate).toBeGreaterThanOrEqual(80);
        expect(play.expectedWinRate).toBeLessThanOrEqual(95);
        expect(play.steps).toHaveLength(5);
        expect(play.keyTriggers.length).toBeGreaterThan(0);
        expect(play.bestAgainst).toBeTruthy();

        // Check each step
        play.steps.forEach((step, idx) => {
          expect(step.step).toBe(idx + 1);
          expect(['PG', 'SG', 'SF', 'PF', 'C']).toContain(step.player);
          expect(step.action).toBeTruthy();
          expect(step.triggerDescription).toBeTruthy();
        });
      });
    });

    it('fetches specific plays by id via getPlaybookPlay', () => {
      const spain = getPlaybookPlay('spain_pnr');
      expect(spain).toBeDefined();
      expect(spain?.name).toBe('Spain Pick & Roll');

      const hammer = getPlaybookPlay('hammer_action');
      expect(hammer).toBeDefined();
      expect(hammer?.name).toContain('Hammer');

      const nonExistent = getPlaybookPlay('random_non_existent');
      expect(nonExistent).toBeUndefined();
    });

    it('selects intelligent counter-plays against different defensive systems', () => {
      const against23 = selectBestPlaybookPlay('2-3 Zone', DEFAULT_DEFENSIVE_SETTINGS);
      expect(against23.id).toBe('ucla_high_low');

      const against32 = selectBestPlaybookPlay('3-2 Zone', DEFAULT_DEFENSIVE_SETTINGS);
      expect(against32.id).toBe('hammer_action');

      const against131 = selectBestPlaybookPlay('1-3-1 Zone', DEFAULT_DEFENSIVE_SETTINGS);
      expect(against131.id).toBe('corner_ghost');

      const againstMan = selectBestPlaybookPlay('Man-to-Man', DEFAULT_DEFENSIVE_SETTINGS);
      expect(againstMan.id).toBe('spain_pnr');
    });

    it('generates executable decisions for all 5 steps of a play', () => {
      const play = OFFENSIVE_PLAYBOOK[0]; // Spain PnR
      for (let step = 1; step <= 5; step++) {
        const decision = getPlaybookDecisionForStep(play, step, offense, defense, 'PG');
        expect(decision).toBeDefined();
        expect(decision.draft.isValid).toBe(true);
        expect(decision.thought).toContain('PLAYBOOK');
        expect(decision.tacticName).toContain(play.name);
      }
    });

    it('integrates with decideNextAIAction when selectedPlayId is specified', () => {
      const decision = decideNextAIAction(
        offense,
        defense,
        'PG',
        'Man-to-Man',
        DEFAULT_DEFENSIVE_SETTINGS,
        undefined,
        1,
        undefined,
        'spain_pnr'
      );
      expect(decision).toBeDefined();
      expect(decision.thought).toContain('Spain Pick & Roll');
      expect(decision.tacticName).toContain('Spain Pick & Roll');
    });
  });

  describe('GameStore Stats Tracking & Modal State', () => {
    it('manages stats modal open and close states', () => {
      expect(useGameStore.getState().isStatsModalOpen).toBe(false);

      useGameStore.getState().openStatsModal();
      expect(useGameStore.getState().isStatsModalOpen).toBe(true);

      useGameStore.getState().closeStatsModal();
      expect(useGameStore.getState().isStatsModalOpen).toBe(false);
    });

    it('sets and updates selected playbook play', () => {
      expect(useGameStore.getState().aiStats.selectedPlayId).toBe('auto');

      useGameStore.getState().setSelectedPlayId('hammer_action');
      expect(useGameStore.getState().aiStats.selectedPlayId).toBe('hammer_action');

      useGameStore.getState().setSelectedPlayId('auto');
      expect(useGameStore.getState().aiStats.selectedPlayId).toBe('auto');
    });

    it('resets stats accurately', () => {
      useGameStore.setState({
        aiStats: {
          possessionsCount: 10,
          winsCount: 7,
          pointsScored: 18,
          threePointersAttempted: 8,
          threePointersMade: 4,
          twoPointersAttempted: 5,
          twoPointersMade: 3,
          turnoversCount: 2,
          totalReward: 85,
          selectedPlayId: 'elevator_screen',
          latestWinAnalysis: null,
          historyLog: [],
        },
        defenseStats: {
          possessionsDefended: 10,
          stopsCount: 3,
          stealsCount: 2,
          pointsConceded: 18,
          totalDefenseReward: 40,
          latestStopAnalysis: null,
          historyLog: [],
        },
      });

      expect(useGameStore.getState().aiStats.pointsScored).toBe(18);
      expect(useGameStore.getState().defenseStats.stopsCount).toBe(3);

      useGameStore.getState().resetStats();

      const freshState = useGameStore.getState();
      expect(freshState.aiStats.possessionsCount).toBe(0);
      expect(freshState.aiStats.pointsScored).toBe(0);
      expect(freshState.aiStats.threePointersAttempted).toBe(0);
      expect(freshState.defenseStats.possessionsDefended).toBe(0);
      expect(freshState.defenseStats.stopsCount).toBe(0);
      expect(freshState.defenseStats.pointsConceded).toBe(0);
    });
  });
});
