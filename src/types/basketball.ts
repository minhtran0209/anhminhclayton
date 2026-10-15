export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export type Team = 'offense' | 'defense';

export interface Point {
  x: number;
  y: number;
}

export type DefenderState =
  | 'HOME'
  | 'ON_BALL'
  | 'MARK'
  | 'DENY'
  | 'HELP'
  | 'ROTATE'
  | 'CLOSEOUT'
  | 'SWITCH'
  | 'RECOVER'
  | 'ZONE_GUARD'
  | 'TRACK_CUTTER'
  | 'SCREENED'
  | 'PRESSURE';

export interface Player {
  id: string; // e.g. "offense-PG", "defense-C"
  team: Team;
  position: Position;
  coord: Point;
  targetCoord?: Point;
  state?: DefenderState;
  assignment?: Position; // For Man-to-Man assigned offense player
  explanation?: string; // Short Vietnamese explanation for why defender is here
}

export type OffenseFormation =
  | '5-Out'
  | '4-Out 1-In'
  | '3-Out 2-In'
  | 'Horns'
  | 'Box'
  | 'Stack'
  | 'Custom';

export type DefensiveSystem =
  | 'Man-to-Man'
  | '2-3 Zone'
  | '3-2 Zone'
  | '1-3-1 Zone';

export type ScreenPolicy = 'Stay' | 'Switch' | 'Auto';

export interface DefensiveSettings {
  height: number;        // 0 - 100
  width: number;         // 0 - 100
  compactness: number;   // 0 - 100
  pressure: number;      // 0 - 100
  helpDefense: number;   // 0 - 100
  ballSideShift: number; // 0 - 100
  paintPerimeterBias: number; // -100 (Paint) to +100 (Perimeter)
  screenPolicy: ScreenPolicy;
}

export type CourtZone =
  | 'TOP'
  | 'LEFT_WING'
  | 'RIGHT_WING'
  | 'LEFT_CORNER'
  | 'RIGHT_CORNER'
  | 'HIGH_POST'
  | 'LEFT_LOW_POST'
  | 'RIGHT_LOW_POST'
  | 'PAINT'
  | 'SHORT_CORNER_LEFT'
  | 'SHORT_CORNER_RIGHT';

export type OffensiveActionType =
  | 'move'
  | 'dribble'
  | 'drive_left'
  | 'drive_right'
  | 'drive_off_screen'
  | 'pass'
  | 'shoot'
  | 'shoot_off_screen'
  | 'layup'
  | 'screen'
  | 'roll'
  | 'pop'
  | 'cut'
  | 'backdoor'
  | 'handoff'
  | 'relocate'
  | 'spot_up';

export interface ShotResult {
  shotType: 'three' | 'mid' | 'layup';
  distanceToBasket: number;
  contestDistance: number;
  contestLevel: 'WIDE_OPEN' | 'OPEN' | 'CONTESTED' | 'HEAVILY_CONTESTED';
  contestDefender: Position;
  probability: number; // Percentage 0 - 100
  made: boolean;
  points: number; // 2 or 3
}

export interface ActionDraft {
  player: Position;
  action: OffensiveActionType;
  targetPlayer?: Position; // For pass, screen, handoff
  path?: Point[];          // Waypoints start -> intermediate -> target
  isValid: boolean;
}

export interface PremoveStep {
  id: string;
  stepNumber: number;
  draft: ActionDraft;
  description: string;
}

export interface TacticalEvent {
  id: string;
  stepNumber: number;
  player: Position;
  action: OffensiveActionType;
  targetPlayer?: Position;
  path?: Point[];
  description: string;
  timestamp: number;
  explanations?: Partial<Record<Position, string>>;
  shotResult?: ShotResult;
  isSteal?: boolean;
  stealer?: Position;
  stealDistance?: number;
}

export interface GameSnapshot {
  offense: Record<Position, Point>;
  defense: Record<Position, { coord: Point; state?: DefenderState; assignment?: Position; explanation?: string }>;
  ballHolder: Position;
  currentFormation: OffenseFormation;
  defensiveSystem: DefensiveSystem;
  defensiveSettings: DefensiveSettings;
  activeScreen?: { screener: Position; target: Position; point: Point };
}

export interface UIPreferences {
  showTacticalPaths: boolean;
  showPassingLanes: boolean;
  showZoneAreas: boolean;
  showHelpLines: boolean;
  showSpacingGuide: boolean;
  showDefensiveShell: boolean;
  playbackSpeed: number; // 0.25, 0.5, 1, 1.5, 2
  showDebugOverlay: boolean;
}

export type PassingLaneStatus = 'Open' | 'Contested' | 'Blocked';

export interface PassingLane {
  target: Position;
  status: PassingLaneStatus;
  defenderDistance: number;
  interceptor?: Position;
}

export interface SpacingWarning {
  playerA: Position;
  playerB: Position;
  distance: number;
}

export interface AIPossessionAnalysis {
  id: string;
  timestamp: number;
  isWin: boolean;
  isSteal?: boolean;
  stealer?: Position;
  title: string;
  summary: string;
  explanation: string;
  keyTactics: string[];
  contestDistance: number;
  pointsEarned: number;
  reward: number;
  possessionSteps: number;
  defensiveSystem: DefensiveSystem;
  defensiveBreakdown: string;
}

export interface AIStats {
  possessionsCount: number;
  winsCount: number;
  turnoversCount?: number;
  totalReward: number;
  latestWinAnalysis: AIPossessionAnalysis | null;
  historyLog: Array<{ id: string; isWin: boolean; isSteal?: boolean; reward: number; summary: string }>;
}

export interface AIAdaptiveMemory {
  lastFailureType?: '3PT_MISSED' | 'MID_MISSED' | 'STEAL_TURNOVER' | 'TIMEOUT';
  lastFailedPlayer?: Position;
  consecutiveFailures: number;
  favoredTactic?: 'inside_attack' | 'pick_and_roll' | 'drive_and_kick' | 'perimeter_ball_movement' | 'backdoor_cuts';
}

export interface DefenseStopAnalysis {
  id: string;
  title: string;
  systemUsed: DefensiveSystem;
  settingsAdjusted: Partial<DefensiveSettings>;
  opponentTacticDetected: string;
  counterStrategy: string;
  reward: number;
  explanation: string;
  keyDefenseMoves: string[];
  isSteal?: boolean;
  stealer?: Position;
  contestLevel?: ShotResult['contestLevel'];
}

export interface DefenseStats {
  possessionsDefended: number;
  stopsCount: number;
  stealsCount: number;
  pointsConceded: number;
  totalDefenseReward: number;
  latestStopAnalysis: DefenseStopAnalysis | null;
  historyLog: Array<{
    id: string;
    isStop: boolean;
    isSteal: boolean;
    reward: number;
    summary: string;
    systemUsed: DefensiveSystem;
  }>;
}

export interface DefenseAdaptiveMemory {
  opponentTendency?: 'paint_attack' | 'perimeter_threes' | 'pick_and_roll' | 'ball_movement' | 'isolation';
  recentOffenseActions: string[];
  consecutiveStops: number;
  consecutiveConceded: number;
  lastStopReason?: string;
  lastConcededReason?: string;
  activeAdjustments: string[];
  favoredCounterSystem?: DefensiveSystem;
}


