import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../state/useGameStore';

describe('Tactical Lab State & History (Undo / Redo / Reset)', () => {
  beforeEach(() => {
    // Reset state before each test
    useGameStore.getState().clearPlay();
  });

  it('initial state has 5 offense and 5 defense players with default 5-Out and Man-to-Man', () => {
    const state = useGameStore.getState();
    expect(Object.keys(state.offense)).toHaveLength(5);
    expect(Object.keys(state.defense)).toHaveLength(5);
    expect(state.ballHolder).toBe('PG');
    expect(state.currentFormation).toBe('5-Out');
    expect(state.defensiveSystem).toBe('Man-to-Man');
  });

  it('Undo and Redo restore exact tactical snapshot history', () => {
    const store = useGameStore.getState();

    // 1. Initial position of PG
    const initialPGCoord = { ...store.offense.PG.coord };

    // 2. Draft and confirm a move for PG
    store.selectPlayer('PG');
    store.startDraft('move');
    store.addDraftPoint({ x: 50, y: 65 });
    useGameStore.getState().confirmDraft();

    // Verify move committed
    const stateAfterMove = useGameStore.getState();
    expect(stateAfterMove.offense.PG.coord.y).toBe(65);
    expect(stateAfterMove.timeline).toHaveLength(1);
    expect(stateAfterMove.history.past).toHaveLength(1);

    // 3. Perform Undo
    useGameStore.getState().undo();
    const stateAfterUndo = useGameStore.getState();
    expect(stateAfterUndo.offense.PG.coord.y).toBe(initialPGCoord.y);
    expect(stateAfterUndo.timeline).toHaveLength(0);
    expect(stateAfterUndo.history.future).toHaveLength(1);

    // 4. Perform Redo
    useGameStore.getState().redo();
    const stateAfterRedo = useGameStore.getState();
    expect(stateAfterRedo.offense.PG.coord.y).toBe(65);
    expect(stateAfterRedo.history.past).toHaveLength(1);
  });

  it('Reset Positions restores initial player coordinates without erasing timeline', () => {
    const store = useGameStore.getState();

    store.selectPlayer('PG');
    store.startDraft('move');
    store.addDraftPoint({ x: 50, y: 60 });
    useGameStore.getState().confirmDraft();

    expect(useGameStore.getState().timeline).toHaveLength(1);

    // Click Reset vị trí
    useGameStore.getState().resetPositions();

    const state = useGameStore.getState();
    // PG returned to 5-Out top coordinate (y=78)
    expect(state.offense.PG.coord.y).toBe(78);
    // Timeline is preserved
    expect(state.timeline).toHaveLength(1);
  });

  it('Clear Play resets both positions and timeline', () => {
    const store = useGameStore.getState();

    store.selectPlayer('PG');
    store.startDraft('move');
    store.addDraftPoint({ x: 50, y: 60 });
    useGameStore.getState().confirmDraft();

    expect(useGameStore.getState().timeline).toHaveLength(1);

    // Click Xóa toàn bộ play
    useGameStore.getState().clearPlay();

    const state = useGameStore.getState();
    expect(state.offense.PG.coord.y).toBe(78);
    expect(state.timeline).toHaveLength(0);
    expect(state.history.past).toHaveLength(0);
  });

  it('Reset Positions after dragging a player resets back to base formation', () => {
    const store = useGameStore.getState();
    expect(store.offense.PG.coord.y).toBe(78);

    // User drags PG to y=20
    store.updateCustomPlayerCoord('PG', { x: 50, y: 20 });
    expect(useGameStore.getState().offense.PG.coord.y).toBe(20);

    // User clicks Reset vị trí
    useGameStore.getState().resetPositions();

    expect(useGameStore.getState().offense.PG.coord.y).toBe(78);
  });
});
