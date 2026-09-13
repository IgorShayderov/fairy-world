export default {
  title: 'Quest journal', intro: 'Help the townsfolk and make the roads safer.',
  active: 'Current quests', completed: 'Finished quests', board: 'Town quest board',
  noActive: 'No current quests. Visit a town to find your next adventure.',
  noCompleted: 'Your completed quests will appear here.',
  visitTown: 'Visit a town and choose Quests to accept a new quest.',
  optional: 'Quests are optional. Only victories after accepting a quest count. Rewards are granted automatically on completion.',
  noOffers: 'No more quests to show right now.', showOffers: 'Show declined offers again',
  accept: 'Accept quest', decline: 'Not now', progress: 'Progress',
  reward: 'Reward: {{gold}} gold', rewardPaid: '{{gold}} gold awarded',
  retry: 'Retry', error: 'Could not load quests. Please try again.',
  acceptError: 'Could not accept this quest. Make sure you are still in town and try again.',
  definitions: {
    wolf_hunt: { title: 'Wolves at the gates', description: 'Defeat {{count}} wolves of any rank to protect the travelers.' },
    goblin_raiders: { title: 'Stop the raiders', description: 'Defeat {{count}} goblin raiders threatening the trade routes.' },
    safe_roads: { title: 'Safer roads', description: 'Defeat {{count}} monsters of any type.' },
  },
};
