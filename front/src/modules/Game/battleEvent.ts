import type { BattleState } from '@/modules/Monsters/api';

type BattleEvent = BattleState['events'][number];

export const getBattleEventSubject = (event: BattleEvent): 'you' | 'enemy' => {
  if (event.dodged) return event.actor === 'PLAYER' ? 'enemy' : 'you';
  return event.actor === 'PLAYER' ? 'you' : 'enemy';
};
