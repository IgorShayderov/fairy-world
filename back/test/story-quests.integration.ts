/** Uses an isolated temporary player; cleanup only removes that player's fixtures. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/prisma.service';
import { StoryQuestsService } from '../src/quests/story-quests.service';
import { recordStoryVictory } from '../src/quests/story-progress';

async function main() {
  const prisma = new PrismaService();
  const service = new StoryQuestsService(prisma);
  let userId: number | undefined;
  try {
    const user = await prisma.user.create({ data: { email: `story-${randomUUID()}@example.invalid`, name: 'Story test', password: 'disabled-test-login', gameProfile: { create: { level: 5, gold: 0, mapPositionX: 1470, mapPositionY: 960 } } }, include: { gameProfile: true } });
    userId = user.id;
    const profileId = user.gameProfile!.id;
    await Promise.all([service.act(userId, 'silent-quarry', 'accept'), service.act(userId, 'silent-quarry', 'accept')]);
    assert.equal(await prisma.storyQuestProgress.count({ where: { gameProfileId: profileId } }), 1);
    await assert.rejects(() => service.act(user.id, 'silent-quarry', 'investigate'), /Travel to/);
    await prisma.gameProfile.update({ where: { id: profileId }, data: { mapPositionX: 1400, mapPositionY: 1170 } });
    await service.act(user.id, 'silent-quarry', 'investigate');
    const win = async (monster: string, startedAt: Date, noPotion: boolean) => prisma.$transaction(async (tx) => {
      await tx.gameProfile.update({ where: { id: profileId }, data: { gold: { increment: 0 } } });
      await recordStoryVictory(tx, profileId, monster, startedAt, noPotion);
    });
    await win('Goblin Raider', new Date(0), true);
    assert.equal((await service.list(user.id))[0].progress!.progress, 0);
    for (let index = 0; index < 3; index++) await win('Goblin Raider', new Date(), false);
    await win('Stone Golem', new Date(), true);
    assert.ok((await service.list(user.id))[0].progress!.completedAt);
    const claim = () => service.act(user.id, 'silent-quarry', 'claim', 'gold');
    await Promise.all([claim(), claim(), claim()]);
    assert.equal((await prisma.gameProfile.findUniqueOrThrow({ where: { id: profileId } })).gold, 750);
    assert.equal(await prisma.equipmentGem.count({ where: { gameProfileId: profileId } }), 1);
    await prisma.storyQuestProgress.update({ where: { gameProfileId_code: { gameProfileId: profileId, code: 'silent-quarry' } }, data: { claimedAt: null, bonusEarned: false } });
    const castle = await prisma.castle.create({ data: { profileId, name: 'Story test castle', city: 'AURELIA', x: 1100, y: 770, wood: 990, stone: 990, keep: 1 } });
    await assert.rejects(() => service.act(user.id, 'silent-quarry', 'claim', 'resources'), /Not enough castle storage/);
    assert.equal((await service.list(user.id))[0].progress!.claimedAt, null);
    await prisma.castle.update({ where: { id: castle.id }, data: { wood: 0, stone: 0, producedAt: new Date() } });
    await service.act(user.id, 'silent-quarry', 'claim', 'resources');
    const awarded = await prisma.castle.findUniqueOrThrow({ where: { id: castle.id } });
    assert.equal(awarded.wood, 200);
    assert.equal(awarded.stone, 150);
    console.log('PASS: ordered objectives, old-battle rejection, concurrent acceptance/claims, one bonus gem, storage rejection and resource payout.');
  } finally {
    if (userId !== undefined) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  }
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
