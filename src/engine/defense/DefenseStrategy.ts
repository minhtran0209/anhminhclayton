import {
  DefenderState,
  DefensiveSettings,
  DefensiveSystem,
  Player,
  Point,
  Position,
} from '../../types/basketball';

export interface DefenseContext {
  offense: Record<Position, Player>;
  ballHolder: Position;
  settings: DefensiveSettings;
  activeScreen?: {
    screener: Position;
    target: Position;
    point: Point;
  };
  lastAction?: {
    action: string;
    player: Position;
    targetPlayer?: Position;
    path?: Point[];
  };
  currentAssignments?: Record<Position, Position>; // For Man-to-Man assignments/switches
  previousDefense?: Record<Position, Point>;
}

export interface DefenseOutput {
  positions: Record<Position, Point>;
  states: Record<Position, DefenderState>;
  assignments?: Record<Position, Position>;
  explanations: Record<Position, string>;
}

export interface DefenseStrategy {
  name: DefensiveSystem;
  calculate(context: DefenseContext): DefenseOutput;
}
