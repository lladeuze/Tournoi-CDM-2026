/* Shared tournament-phase metadata. */

export const phaseLabels: Record<string, string> = {
  group_j1: 'Poules J1',
  group_j2: 'Poules J2',
  group_j3: 'Poules J3',
  round_of_32: '16es de finale',
  round_of_16: '8es de finale',
  quarter: 'Quarts de finale',
  semi: 'Demi-finales',
  final: 'Finale',
};

export function phaseLabel(phase: string): string {
  return phaseLabels[phase] || phase;
}

export const bonusAllowedPhases = [
  'group_j1',
  'group_j2',
  'group_j3',
  'round_of_32',
  'round_of_16',
  'quarter',
];

const positionLabels: Record<string, string> = {
  ATT: 'ATT',
  MID: 'MID',
  DEF: 'DEF',
  GK: 'GK',
};

export function positionLabel(position: string | null): string {
  return position ? positionLabels[position] || '' : '';
}
