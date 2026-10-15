import { DefensiveSystem } from '../../types/basketball';
import { DefenseStrategy } from './DefenseStrategy';
import { ManToManDefense } from './manToMan';
import { Zone23Defense } from './zone23';
import { Zone32Defense } from './zone32';
import { Zone131Defense } from './zone131';

const strategies: Record<DefensiveSystem, DefenseStrategy> = {
  'Man-to-Man': new ManToManDefense(),
  '2-3 Zone': new Zone23Defense(),
  '3-2 Zone': new Zone32Defense(),
  '1-3-1 Zone': new Zone131Defense(),
};

export function getDefenseStrategy(system: DefensiveSystem): DefenseStrategy {
  const strategy = strategies[system];
  if (!strategy) {
    return strategies['Man-to-Man'];
  }
  return strategy;
}

export * from './DefenseStrategy';
export * from './rebalance';
