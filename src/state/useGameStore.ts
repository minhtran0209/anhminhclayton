import { create } from 'zustand';
import {
  DEFAULT_DEFENSIVE_SETTINGS,
  POSITIONS,
} from '../config/constants';
import {
  ActionDraft,
  DefensiveSettings,
  DefensiveSystem,
  GameSnapshot,
  OffenseFormation,
  OffensiveActionType,
  Player,
  Point,
  Position,
  PremoveStep,
  TacticalEvent,
  UIPreferences,
} from '../types/basketball';
import {
  FORMATION_DESCRIPTIONS,
  OFFENSIVE_FORMATIONS,
  loadSavedCustomFormation,
  saveCustomFormation as persistCustomFormation,
} from '../tactics/offense/formations';
import { getDefenseStrategy } from '../engine/defense';
import { executeOffensiveAction } from '../engine/simulation/tacticalEngine';
import { calculateScreenPosition, clampPoint, distance, lerp } from '../engine/geometry/courtGeometry';

interface GameState {
  // 10 Tactical Pieces
  offense: Record<Position, Player>;
  defense: Record<Position, Player>;

  // Selection & Ball
  ballHolder: Position;
  selectedPlayer: Position | null;

  // Tactics
  currentFormation: OffenseFormation;
  baseFormation: OffenseFormation;
  customFormation: Record<Position, Point>;
  savedCustomFormation: Record<Position, Point>;
  defensiveSystem: DefensiveSystem;
  defensiveSettings: DefensiveSettings;
  activeScreen?: { screener: Position; target: Position; point: Point };

  // Current Action Draft
  actionDraft: ActionDraft | null;

  // Timeline & History
  timeline: TacticalEvent[];
  history: {
    past: GameSnapshot[];
    future: GameSnapshot[];
  };

  // Playback
  isPlaying: boolean;
  playbackStep: number;

  // UI Settings & Toggles
  uiPreferences: UIPreferences;

  // Action Methods
  selectPlayer: (player: Position | null) => void;
  setBallHolder: (player: Position) => void;
  setFormation: (formation: OffenseFormation) => void;
  updateCustomPlayerCoord: (player: Position, coord: Point) => void;
  saveCustomFormation: () => void;
  setDefensiveSystem: (system: DefensiveSystem) => void;
  updateDefensiveSettings: (settings: Partial<DefensiveSettings>) => void;
  startDraft: (
    action: OffensiveActionType,
    targetPlayer?: Position,
    direction?: 'left' | 'right' | 'top' | 'direct' | Point
  ) => void;
  addDraftPoint: (point: Point, append?: boolean) => void;
  cancelDraft: () => void;
  confirmDraft: () => void;
  undo: () => void;
  redo: () => void;
  resetPositions: () => void;
  clearPlay: () => void;
  goToTimelineStep: (index: number) => void;
  togglePlayback: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  setPlaybackSpeed: (speed: number) => void;
  updateUIPreferences: (prefs: Partial<UIPreferences>) => void;
  recalculateDefense: () => void;
  clearActiveScreen: () => void;

  // Premove / Play Designer Mode
  isPremoveMode: boolean;
  premoveQueue: PremoveStep[];
  premoveInitialSnapshot: GameSnapshot | null;
  isExecutingPremove: boolean;
  togglePremoveMode: () => void;
  undoLastPremove: () => void;
  clearPremoveQueue: () => void;
  executePremoveQueue: () => Promise<void>;
}

// Initial Offense from 5-Out
function buildInitialOffense(): Record<Position, Player> {
  const formationCoords = OFFENSIVE_FORMATIONS['5-Out'];
  const offense = {} as Record<Position, Player>;
  POSITIONS.forEach((pos) => {
    offense[pos] = {
      id: `offense-${pos}`,
      team: 'offense',
      position: pos,
      coord: { ...formationCoords[pos] },
    };
  });
  return offense;
}

// Helper to compute initial or refreshed defense
function computeDefense(
  offense: Record<Position, Player>,
  ballHolder: Position,
  system: DefensiveSystem,
  settings: DefensiveSettings,
  activeScreen?: { screener: Position; target: Position; point: Point },
  currentAssignments?: Record<Position, Position>,
  lastAction?: {
    action: string;
    player: Position;
    targetPlayer?: Position;
    path?: Point[];
  },
  previousDefense?: Record<Position, Point>
): Record<Position, Player> {
  const strategy = getDefenseStrategy(system);
  const result = strategy.calculate({
    offense,
    ballHolder,
    settings,
    activeScreen,
    currentAssignments,
    lastAction,
    previousDefense,
  });

  const defense = {} as Record<Position, Player>;
  POSITIONS.forEach((pos) => {
    defense[pos] = {
      id: `defense-${pos}`,
      team: 'defense',
      position: pos,
      coord: result.positions[pos],
      state: result.states[pos],
      assignment: result.assignments ? result.assignments[pos] : undefined,
      explanation: result.explanations[pos],
    };
  });
  return defense;
}

function createSnapshot(state: {
  offense: Record<Position, Player>;
  defense: Record<Position, Player>;
  ballHolder: Position;
  currentFormation: OffenseFormation;
  defensiveSystem: DefensiveSystem;
  defensiveSettings: DefensiveSettings;
  activeScreen?: { screener: Position; target: Position; point: Point };
}): GameSnapshot {
  const offenseCoords = {} as Record<Position, Point>;
  POSITIONS.forEach((p) => {
    offenseCoords[p] = { ...state.offense[p].coord };
  });

  const defenseData = {} as Record<Position, { coord: Point; state?: any; assignment?: Position; explanation?: string }>;
  POSITIONS.forEach((p) => {
    defenseData[p] = {
      coord: { ...state.defense[p].coord },
      state: state.defense[p].state,
      assignment: state.defense[p].assignment,
      explanation: state.defense[p].explanation,
    };
  });

  return {
    offense: offenseCoords,
    defense: defenseData,
    ballHolder: state.ballHolder,
    currentFormation: state.currentFormation,
    defensiveSystem: state.defensiveSystem,
    defensiveSettings: { ...state.defensiveSettings },
    activeScreen: state.activeScreen ? { ...state.activeScreen } : undefined,
  };
}

function restoreStateFromSnapshot(snapshot: GameSnapshot) {
  const restoredOffense = {} as Record<Position, Player>;
  POSITIONS.forEach((pos) => {
    restoredOffense[pos] = {
      id: `offense-${pos}`,
      team: 'offense',
      position: pos,
      coord: { ...snapshot.offense[pos] },
    };
  });

  const restoredDefense = {} as Record<Position, Player>;
  POSITIONS.forEach((pos) => {
    const d = snapshot.defense[pos];
    restoredDefense[pos] = {
      id: `defense-${pos}`,
      team: 'defense',
      position: pos,
      coord: { ...d.coord },
      state: d.state,
      assignment: d.assignment,
      explanation: d.explanation,
    };
  });

  return {
    offense: restoredOffense,
    defense: restoredDefense,
    ballHolder: snapshot.ballHolder,
    currentFormation: snapshot.currentFormation,
    defensiveSystem: snapshot.defensiveSystem,
    defensiveSettings: { ...snapshot.defensiveSettings },
    activeScreen: snapshot.activeScreen ? { ...snapshot.activeScreen } : undefined,
  };
}

const initialOffense = buildInitialOffense();
const initialBallHolder: Position = 'PG';
const initialSystem: DefensiveSystem = 'Man-to-Man';
const initialSettings = { ...DEFAULT_DEFENSIVE_SETTINGS };
const initialDefense = computeDefense(
  initialOffense,
  initialBallHolder,
  initialSystem,
  initialSettings
);

const savedCustom = loadSavedCustomFormation() || { ...OFFENSIVE_FORMATIONS['5-Out'] };

export const useGameStore = create<GameState>((set, get) => ({
  offense: initialOffense,
  defense: initialDefense,
  ballHolder: initialBallHolder,
  selectedPlayer: 'PG',
  currentFormation: '5-Out',
  baseFormation: '5-Out',
  customFormation: { ...savedCustom },
  savedCustomFormation: { ...savedCustom },
  defensiveSystem: initialSystem,
  defensiveSettings: initialSettings,
  activeScreen: undefined,
  actionDraft: null,
  timeline: [],
  history: {
    past: [],
    future: [],
  },
  isPlaying: false,
  playbackStep: -1,
  uiPreferences: {
    showTacticalPaths: true,
    showPassingLanes: true,
    showZoneAreas: false,
    showHelpLines: true,
    showSpacingGuide: true,
    showDefensiveShell: true,
    playbackSpeed: 1,
    showDebugOverlay: false,
  },

  // Premove / Play Designer Mode
  isPremoveMode: false,
  premoveQueue: [],
  premoveInitialSnapshot: null,
  isExecutingPremove: false,

  selectPlayer: (player) => {
    set({ selectedPlayer: player });
  },

  clearActiveScreen: () => {
    set({ activeScreen: undefined });
  },

  setBallHolder: (player) => {
    const { offense, defensiveSystem, defensiveSettings, activeScreen, defense } = get();
    const assignments: Record<Position, Position> = {} as any;
    POSITIONS.forEach((p) => {
      if (defense[p].assignment) assignments[p] = defense[p].assignment!;
    });
    const updatedDefense = computeDefense(
      offense,
      player,
      defensiveSystem,
      defensiveSettings,
      activeScreen,
      Object.keys(assignments).length > 0 ? assignments : undefined
    );
    set({ ballHolder: player, defense: updatedDefense });
  },

  setFormation: (formation) => {
    const { ballHolder, defensiveSystem, defensiveSettings, savedCustomFormation } = get();
    const coords = formation === 'Custom' ? savedCustomFormation : OFFENSIVE_FORMATIONS[formation];

    const updatedOffense = {} as Record<Position, Player>;
    POSITIONS.forEach((pos) => {
      updatedOffense[pos] = {
        id: `offense-${pos}`,
        team: 'offense',
        position: pos,
        coord: { ...coords[pos] },
      };
    });

    const updatedDefense = computeDefense(
      updatedOffense,
      ballHolder,
      defensiveSystem,
      defensiveSettings
    );

    set({
      currentFormation: formation,
      baseFormation: formation,
      customFormation: formation === 'Custom' ? { ...coords } : get().customFormation,
      offense: updatedOffense,
      defense: updatedDefense,
      activeScreen: undefined,
      actionDraft: null,
    });
  },

  updateCustomPlayerCoord: (player, coord) => {
    const { customFormation, baseFormation, ballHolder, defensiveSystem, defensiveSettings, offense, activeScreen, defense } = get();
    const updatedCustom = { ...customFormation, [player]: coord };
    
    // Also update active offense if in custom formation
    const updatedOffense = {
      ...offense,
      [player]: {
        ...offense[player],
        coord,
      },
    };

    const assignments: Record<Position, Position> = {} as any;
    POSITIONS.forEach((p) => {
      if (defense[p].assignment) assignments[p] = defense[p].assignment!;
    });

    const prevDefCoords: Record<Position, Point> = {} as any;
    POSITIONS.forEach((p) => {
      prevDefCoords[p] = defense[p].coord;
    });

    const updatedDefense = computeDefense(
      updatedOffense,
      ballHolder,
      defensiveSystem,
      defensiveSettings,
      activeScreen,
      Object.keys(assignments).length > 0 ? assignments : undefined,
      {
        action: 'move',
        player,
        path: [offense[player].coord, coord],
      },
      prevDefCoords
    );

    set({
      customFormation: updatedCustom,
      currentFormation: 'Custom',
      baseFormation: baseFormation || '5-Out',
      offense: updatedOffense,
      defense: updatedDefense,
      activeScreen,
    });
  },

  saveCustomFormation: () => {
    const { customFormation } = get();
    persistCustomFormation(customFormation);
    set({ savedCustomFormation: { ...customFormation } });
  },

  setDefensiveSystem: (system) => {
    const { offense, ballHolder, defensiveSettings, activeScreen } = get();
    const updatedDefense = computeDefense(
      offense,
      ballHolder,
      system,
      defensiveSettings,
      activeScreen
    );
    set({ defensiveSystem: system, defense: updatedDefense });
  },

  updateDefensiveSettings: (newSettings) => {
    const { offense, ballHolder, defensiveSystem, defensiveSettings, activeScreen, defense } = get();
    const mergedSettings = { ...defensiveSettings, ...newSettings };
    const assignments: Record<Position, Position> = {} as any;
    POSITIONS.forEach((p) => {
      if (defense[p].assignment) assignments[p] = defense[p].assignment!;
    });

    // Immediate Live Preview calculation!
    const updatedDefense = computeDefense(
      offense,
      ballHolder,
      defensiveSystem,
      mergedSettings,
      activeScreen,
      Object.keys(assignments).length > 0 ? assignments : undefined
    );

    set({
      defensiveSettings: mergedSettings,
      defense: updatedDefense,
    });
  },

  recalculateDefense: () => {
    const { offense, ballHolder, defensiveSystem, defensiveSettings, activeScreen, defense } = get();
    const assignments: Record<Position, Position> = {} as any;
    POSITIONS.forEach((p) => {
      if (defense[p].assignment) assignments[p] = defense[p].assignment!;
    });
    const updatedDefense = computeDefense(
      offense,
      ballHolder,
      defensiveSystem,
      defensiveSettings,
      activeScreen,
      Object.keys(assignments).length > 0 ? assignments : undefined
    );
    set({ defense: updatedDefense });
  },

  startDraft: (action, targetPlayer, direction) => {
    const { selectedPlayer, offense, ballHolder } = get();
    if (!selectedPlayer) return;

    const startCoord = offense[selectedPlayer].coord;
    let initialPath: Point[] = [startCoord];
    let resolvedTarget = targetPlayer;

    if (action === 'drive_left') {
      initialPath = [startCoord, { x: Math.max(startCoord.x - 18, 25), y: Math.max(startCoord.y - 32, 20) }];
    } else if (action === 'drive_right') {
      initialPath = [startCoord, { x: Math.min(startCoord.x + 18, 75), y: Math.max(startCoord.y - 32, 20) }];
    } else if (action === 'backdoor') {
      initialPath = [startCoord, { x: startCoord.x < 50 ? 32 : 68, y: 14 }];
    } else if (action === 'roll') {
      initialPath = [startCoord, { x: 50, y: 18 }];
    } else if (action === 'pop') {
      initialPath = [startCoord, { x: startCoord.x < 50 ? 20 : 80, y: 68 }];
    } else if (action === 'relocate') {
      initialPath = [startCoord, { x: startCoord.x < 50 ? 14 : 86, y: 66 }];
    } else if (action === 'screen') {
      resolvedTarget = targetPlayer || (selectedPlayer === 'C' || selectedPlayer === 'PF' ? 'PG' : 'SG');
      const targetCoord = offense[resolvedTarget].coord;

      // Look up defender assigned to resolvedTarget, or closest defender
      const { defense } = get();
      let targetDefenderCoord: Point | undefined;
      (Object.keys(defense) as Position[]).forEach((defPos) => {
        if (defense[defPos].assignment === resolvedTarget) {
          targetDefenderCoord = defense[defPos].coord;
        }
      });
      if (!targetDefenderCoord) {
        let minD = Infinity;
        (Object.keys(defense) as Position[]).forEach((defPos) => {
          const d = distance(targetCoord, defense[defPos].coord);
          if (d < minD) {
            minD = d;
            targetDefenderCoord = defense[defPos].coord;
          }
        });
      }

      const screenDir = direction === 'direct' ? 'top' : direction;
      const targetPoint = calculateScreenPosition(targetCoord, targetDefenderCoord, screenDir);
      initialPath = [startCoord, targetPoint];
    } else if (action === 'handoff') {
      resolvedTarget = targetPlayer || (selectedPlayer === 'PG' ? 'SG' : 'PG');
      const targetCoord = offense[resolvedTarget].coord;
      let targetPoint: Point;
      if (direction === 'left') {
        // Run towards left wing / elbow
        targetPoint = {
          x: Math.max(Math.min(targetCoord.x, startCoord.x) - 10, 16),
          y: Math.max((targetCoord.y + startCoord.y) / 2, 22),
        };
      } else if (direction === 'right') {
        // Run towards right wing / elbow
        targetPoint = {
          x: Math.min(Math.max(targetCoord.x, startCoord.x) + 10, 84),
          y: Math.max((targetCoord.y + startCoord.y) / 2, 22),
        };
      } else if (direction === 'direct') {
        targetPoint = lerp(startCoord, targetCoord, 0.65);
      } else if (direction && typeof direction === 'object') {
        targetPoint = direction;
      } else {
        targetPoint = lerp(startCoord, targetCoord, 0.65);
      }
      initialPath = [startCoord, clampPoint(targetPoint)];
    } else if (action === 'pass') {
      resolvedTarget = targetPlayer || (selectedPlayer === 'PG' ? 'SG' : 'PG');
      initialPath = [startCoord, offense[resolvedTarget].coord];
    } else if (action === 'layup') {
      initialPath = [startCoord, { x: 50, y: 13 }];
    } else if (action === 'shoot') {
      initialPath = [startCoord, { x: 50, y: 8 }];
    } else if (action === 'drive_off_screen') {
      const { activeScreen } = get();
      const screenerPos = activeScreen?.screener || (selectedPlayer === 'PG' ? 'C' : 'PF');
      const screenerCoord = activeScreen?.point || offense[screenerPos]?.coord || { x: startCoord.x - 6.5, y: startCoord.y };
      const isLeft = screenerCoord.x <= startCoord.x;
      // Curved path bypassing screener's shoulder into the paint
      const bypassPoint: Point = {
        x: isLeft ? Math.max(screenerCoord.x - 5, 14) : Math.min(screenerCoord.x + 5, 86),
        y: Math.max(startCoord.y - 12, 24),
      };
      const finishPoint: Point = {
        x: isLeft ? Math.max(screenerCoord.x - 1, 28) : Math.min(screenerCoord.x + 1, 72),
        y: Math.max(startCoord.y - 28, 18),
      };
      initialPath = [startCoord, clampPoint(bypassPoint), clampPoint(finishPoint)];
    } else if (action === 'shoot_off_screen') {
      initialPath = [startCoord, { x: 50, y: 8 }];
    } else if (action === 'move' || action === 'dribble' || action === 'cut') {
      if (direction && typeof direction === 'object') {
        initialPath = [startCoord, clampPoint(direction)];
      } else {
        initialPath = [startCoord, clampPoint({ x: startCoord.x, y: Math.max(startCoord.y - 15, 12) })];
      }
    }

    set({
      actionDraft: {
        player: selectedPlayer,
        action,
        targetPlayer: resolvedTarget,
        path: initialPath,
        isValid: true,
      },
    });
  },

  addDraftPoint: (point, append = false) => {
    const { actionDraft } = get();
    if (!actionDraft) return;
    const startCoord = actionDraft.path[0];
    const newPath = append && actionDraft.path.length < 4
      ? [...actionDraft.path, clampPoint(point)]
      : [startCoord, clampPoint(point)];
    set({
      actionDraft: {
        ...actionDraft,
        path: newPath,
      },
    });
  },

  cancelDraft: () => {
    set({ actionDraft: null });
  },

  confirmDraft: () => {
    const state = get();
    if (!state.actionDraft) return;

    if (state.isPremoveMode) {
      // In Premove mode:
      // Offense moves, ball passes, screen is staged, BUT DEFENSE STAYS 100% FROZEN!
      const stepNumber = state.premoveQueue.length + 1;
      const snapshot = createSnapshot(state);

      const { updatedOffense, updatedBallHolder, event, activeScreen } =
        executeOffensiveAction(state.actionDraft, snapshot, stepNumber);

      const newStep: PremoveStep = {
        id: `premove-${Date.now()}-${stepNumber}`,
        stepNumber,
        draft: { ...state.actionDraft },
        description: event.description,
      };

      set({
        offense: updatedOffense,
        // DEFENSE STAYS FROZEN! Do not touch state.defense!
        defense: state.defense,
        ballHolder: updatedBallHolder,
        activeScreen,
        actionDraft: null,
        premoveQueue: [...state.premoveQueue, newStep],
      });
      return;
    }

    // Normal mode (Defenders react immediately)
    const snapshot = createSnapshot(state);
    const newStepNumber = state.timeline.length + 1;

    const { updatedOffense, updatedDefense, updatedBallHolder, event, activeScreen } =
      executeOffensiveAction(state.actionDraft, snapshot, newStepNumber);

    set({
      offense: updatedOffense,
      defense: updatedDefense,
      ballHolder: updatedBallHolder,
      activeScreen,
      actionDraft: null,
      timeline: [...state.timeline, event],
      history: {
        past: [...state.history.past, snapshot],
        future: [],
      },
      playbackStep: state.timeline.length,
    });
  },

  togglePremoveMode: () => {
    const state = get();
    if (!state.isPremoveMode) {
      // Enter Premove Mode: Save starting snapshot
      const snapshot = createSnapshot(state);
      set({
        isPremoveMode: true,
        premoveInitialSnapshot: snapshot,
        premoveQueue: [],
        actionDraft: null,
      });
    } else {
      // Exit Premove Mode: Restore starting state if actions were queued
      if (state.premoveInitialSnapshot) {
        const restored = restoreStateFromSnapshot(state.premoveInitialSnapshot);
        set({
          ...restored,
          isPremoveMode: false,
          premoveInitialSnapshot: null,
          premoveQueue: [],
          actionDraft: null,
        });
      } else {
        set({
          isPremoveMode: false,
          premoveInitialSnapshot: null,
          premoveQueue: [],
          actionDraft: null,
        });
      }
    }
  },

  undoLastPremove: () => {
    const state = get();
    if (!state.isPremoveMode || state.premoveQueue.length === 0 || !state.premoveInitialSnapshot) return;

    const remainingQueue = state.premoveQueue.slice(0, -1);
    const restored = restoreStateFromSnapshot(state.premoveInitialSnapshot);

    // Replay remaining drafts offense-only
    let currentOffense = restored.offense;
    let currentBallHolder = restored.ballHolder;
    let currentScreen = restored.activeScreen;

    remainingQueue.forEach((step, idx) => {
      const snap: GameSnapshot = {
        ...state.premoveInitialSnapshot!,
        offense: POSITIONS.reduce((acc, p) => ({ ...acc, [p]: currentOffense[p].coord }), {} as any),
        defense: state.premoveInitialSnapshot!.defense,
        ballHolder: currentBallHolder,
        activeScreen: currentScreen,
      };
      const res = executeOffensiveAction(step.draft, snap, idx + 1);
      currentOffense = res.updatedOffense;
      currentBallHolder = res.updatedBallHolder;
      currentScreen = res.activeScreen;
    });

    set({
      offense: currentOffense,
      defense: restored.defense,
      ballHolder: currentBallHolder,
      activeScreen: currentScreen,
      premoveQueue: remainingQueue,
      actionDraft: null,
    });
  },

  clearPremoveQueue: () => {
    const state = get();
    if (state.premoveInitialSnapshot) {
      const restored = restoreStateFromSnapshot(state.premoveInitialSnapshot);
      set({
        ...restored,
        premoveQueue: [],
        actionDraft: null,
      });
    } else {
      set({ premoveQueue: [], actionDraft: null });
    }
  },

  executePremoveQueue: async () => {
    const state = get();
    if (state.premoveQueue.length === 0 || !state.premoveInitialSnapshot || state.isExecutingPremove) return;

    set({ isExecutingPremove: true });

    // 1. Reset to initial snapshot before premoves began
    const restored = restoreStateFromSnapshot(state.premoveInitialSnapshot);
    set({
      ...restored,
      actionDraft: null,
    });

    const queue = [...state.premoveQueue];
    const speed = state.uiPreferences.playbackSpeed || 1;
    const stepDelay = Math.round(1100 / Math.max(speed, 0.25));

    await new Promise((resolve) => setTimeout(resolve, 350));

    // 2. Execute each queued step in sequence with full automated defensive reaction!
    for (let i = 0; i < queue.length; i++) {
      const currentState = get();
      const currentSnapshot = createSnapshot(currentState);
      const stepNumber = currentState.timeline.length + 1;

      const { updatedOffense, updatedDefense, updatedBallHolder, event, activeScreen } =
        executeOffensiveAction(queue[i].draft, currentSnapshot, stepNumber);

      set({
        offense: updatedOffense,
        defense: updatedDefense,
        ballHolder: updatedBallHolder,
        activeScreen,
        timeline: [...currentState.timeline, event],
        history: {
          past: [...currentState.history.past, currentSnapshot],
          future: [],
        },
        playbackStep: currentState.timeline.length,
      });

      if (i < queue.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, stepDelay));
      }
    }

    // 3. Complete execution
    set({
      isPremoveMode: false,
      premoveQueue: [],
      premoveInitialSnapshot: null,
      isExecutingPremove: false,
    });
  },

  undo: () => {
    const { history, timeline, offense, defense, ballHolder, currentFormation, defensiveSystem, defensiveSettings, activeScreen } = get();
    if (history.past.length === 0) return;

    const currentSnapshot = createSnapshot({
      offense,
      defense,
      ballHolder,
      currentFormation,
      defensiveSystem,
      defensiveSettings,
      activeScreen,
    });

    const previousSnapshot = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    const newFuture = [currentSnapshot, ...history.future];
    const newTimeline = timeline.slice(0, -1);

    // Reconstruct state from previousSnapshot
    const restoredOffense = {} as Record<Position, Player>;
    POSITIONS.forEach((pos) => {
      restoredOffense[pos] = {
        id: `offense-${pos}`,
        team: 'offense',
        position: pos,
        coord: previousSnapshot.offense[pos],
      };
    });

    const restoredDefense = {} as Record<Position, Player>;
    POSITIONS.forEach((pos) => {
      const d = previousSnapshot.defense[pos];
      restoredDefense[pos] = {
        id: `defense-${pos}`,
        team: 'defense',
        position: pos,
        coord: d.coord,
        state: d.state,
        assignment: d.assignment,
        explanation: d.explanation,
      };
    });

    set({
      offense: restoredOffense,
      defense: restoredDefense,
      ballHolder: previousSnapshot.ballHolder,
      currentFormation: previousSnapshot.currentFormation,
      defensiveSystem: previousSnapshot.defensiveSystem,
      defensiveSettings: previousSnapshot.defensiveSettings,
      activeScreen: previousSnapshot.activeScreen,
      actionDraft: null,
      timeline: newTimeline,
      history: {
        past: newPast,
        future: newFuture,
      },
      playbackStep: newTimeline.length - 1,
    });
  },

  redo: () => {
    const { history, timeline, offense, defense, ballHolder, currentFormation, defensiveSystem, defensiveSettings, activeScreen } = get();
    if (history.future.length === 0) return;

    const currentSnapshot = createSnapshot({
      offense,
      defense,
      ballHolder,
      currentFormation,
      defensiveSystem,
      defensiveSettings,
      activeScreen,
    });

    const nextSnapshot = history.future[0];
    const newFuture = history.future.slice(1);
    const newPast = [...history.past, currentSnapshot];

    const restoredOffense = {} as Record<Position, Player>;
    POSITIONS.forEach((pos) => {
      restoredOffense[pos] = {
        id: `offense-${pos}`,
        team: 'offense',
        position: pos,
        coord: nextSnapshot.offense[pos],
      };
    });

    const restoredDefense = {} as Record<Position, Player>;
    POSITIONS.forEach((pos) => {
      const d = nextSnapshot.defense[pos];
      restoredDefense[pos] = {
        id: `defense-${pos}`,
        team: 'defense',
        position: pos,
        coord: d.coord,
        state: d.state,
        assignment: d.assignment,
        explanation: d.explanation,
      };
    });

    set({
      offense: restoredOffense,
      defense: restoredDefense,
      ballHolder: nextSnapshot.ballHolder,
      currentFormation: nextSnapshot.currentFormation,
      defensiveSystem: nextSnapshot.defensiveSystem,
      defensiveSettings: nextSnapshot.defensiveSettings,
      activeScreen: nextSnapshot.activeScreen,
      actionDraft: null,
      history: {
        past: newPast,
        future: newFuture,
      },
      playbackStep: timeline.length,
    });
  },

  resetPositions: () => {
    // "Reset vị trí"
    // Restores players to base formation or saved custom formation
    const { baseFormation, savedCustomFormation, defensiveSystem, defensiveSettings } = get();
    const targetFormation = baseFormation || '5-Out';
    const coords = targetFormation === 'Custom'
      ? savedCustomFormation
      : OFFENSIVE_FORMATIONS[targetFormation];

    const freshOffense = {} as Record<Position, Player>;
    POSITIONS.forEach((pos) => {
      freshOffense[pos] = {
        id: `offense-${pos}`,
        team: 'offense',
        position: pos,
        coord: { ...coords[pos] },
      };
    });

    const freshDefense = computeDefense(
      freshOffense,
      'PG',
      defensiveSystem,
      defensiveSettings
    );

    set({
      currentFormation: targetFormation,
      customFormation: { ...coords },
      offense: freshOffense,
      defense: freshDefense,
      ballHolder: 'PG',
      activeScreen: undefined,
      actionDraft: null,
      playbackStep: -1,
      isPlaying: false,
    });
  },

  clearPlay: () => {
    // "Xóa toàn bộ play"
    const { baseFormation, savedCustomFormation, defensiveSystem, defensiveSettings } = get();
    const targetFormation = baseFormation || '5-Out';
    const coords = targetFormation === 'Custom'
      ? savedCustomFormation
      : OFFENSIVE_FORMATIONS[targetFormation];

    const freshOffense = {} as Record<Position, Player>;
    POSITIONS.forEach((pos) => {
      freshOffense[pos] = {
        id: `offense-${pos}`,
        team: 'offense',
        position: pos,
        coord: { ...coords[pos] },
      };
    });

    const freshDefense = computeDefense(
      freshOffense,
      'PG',
      defensiveSystem,
      defensiveSettings
    );

    set({
      currentFormation: targetFormation,
      customFormation: { ...coords },
      offense: freshOffense,
      defense: freshDefense,
      ballHolder: 'PG',
      activeScreen: undefined,
      actionDraft: null,
      timeline: [],
      history: { past: [], future: [] },
      isPlaying: false,
      playbackStep: -1,
    });
  },

  goToTimelineStep: (index) => {
    const { history } = get();
    // If index corresponds to an entry in past, restore that state
    if (index >= 0 && index < history.past.length) {
      const targetSnapshot = history.past[index];
      const restoredOffense = {} as Record<Position, Player>;
      POSITIONS.forEach((pos) => {
        restoredOffense[pos] = {
          id: `offense-${pos}`,
          team: 'offense',
          position: pos,
          coord: targetSnapshot.offense[pos],
        };
      });

      const restoredDefense = {} as Record<Position, Player>;
      POSITIONS.forEach((pos) => {
        const d = targetSnapshot.defense[pos];
        restoredDefense[pos] = {
          id: `defense-${pos}`,
          team: 'defense',
          position: pos,
          coord: d.coord,
          state: d.state,
          assignment: d.assignment,
          explanation: d.explanation,
        };
      });

      set({
        offense: restoredOffense,
        defense: restoredDefense,
        ballHolder: targetSnapshot.ballHolder,
        activeScreen: targetSnapshot.activeScreen,
        playbackStep: index,
      });
    }
  },

  togglePlayback: () => {
    const { isPlaying } = get();
    set({ isPlaying: !isPlaying });
  },

  stepForward: () => {
    const { playbackStep, timeline, history } = get();
    if (playbackStep < timeline.length - 1) {
      get().goToTimelineStep(playbackStep + 1);
    }
  },

  stepBackward: () => {
    const { playbackStep } = get();
    if (playbackStep > 0) {
      get().goToTimelineStep(playbackStep - 1);
    }
  },

  setPlaybackSpeed: (speed) => {
    set((state) => ({
      uiPreferences: { ...state.uiPreferences, playbackSpeed: speed },
    }));
  },

  updateUIPreferences: (prefs) => {
    set((state) => ({
      uiPreferences: { ...state.uiPreferences, ...prefs },
    }));
  },
}));
