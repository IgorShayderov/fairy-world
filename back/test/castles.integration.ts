/** Real local-Postgres smoke test. Only creates/deletes explicitly tracked temporary test users. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/prisma.service';
import { CastlesService } from '../src/castles/castles.service';

async function main() {
  const prisma = new PrismaService(),
    service = new CastlesService(prisma);
  const users: number[] = [];
  try {
    for (let i = 0; i < 2; i++) {
      const user = await prisma.user.create({
        data: {
          email: `castle-test-${randomUUID()}@example.invalid`,
          name: `Castle smoke test ${i}`,
          password: 'disabled-test-login',
          gameProfile: { create: { level: 25, gold: 5000 } },
        },
      });
      users.push(user.id);
    }
    const attempts = await Promise.allSettled([
      service.create(users[0], { name: 'Test Keep A', x: 1100, y: 770 }),
      service.create(users[0], { name: 'Duplicate Keep', x: 1100, y: 770 }),
    ]);
    assert.equal(attempts.filter((a) => a.status === 'fulfilled').length, 1);
    let a = (await service.get(users[0])).castle!;
    assert.equal(a.lumberMill, 1);
    assert.equal(a.quarry, 1);
    assert.equal((await service.get(users[0])).gold, 2500);
    await service.create(users[1], { name: 'Test Keep B', x: 1100, y: 770 }); // private plots may overlap
    const b = (await service.get(users[1])).castle!;
    await prisma.castle.update({
      where: { id: a.id },
      data: { sentinels: 20, barracks: 1, wood: 100, stone: 100, protectedUntil: null },
    });
    await prisma.castle.update({ where: { id: b.id }, data: { wood: 1000, stone: 1000, protectedUntil: null } });
    const dispatch = await Promise.allSettled([
      service.raid(users[0], { target: b.id, sentinels: 20, rangers: 0, arcanists: 0 }),
      service.raid(users[0], { target: b.id, sentinels: 20, rangers: 0, arcanists: 0 }),
    ]);
    assert.equal(dispatch.filter((a) => a.status === 'fulfilled').length, 1);
    await prisma.castle.update({ where: { id: a.id }, data: { raidEndsAt: new Date(Date.now() - 1000) } });
    await Promise.all([service.resolveRaid(a.id), service.resolveRaid(a.id)]);
    a = (await service.get(users[0])).castle!;
    assert.equal(a.victories, 1);
    assert.equal(a.wood, 200);
    assert.equal(a.sentinels, 18);
    assert.equal(await prisma.castleReport.count({ where: { castleId: { in: [a.id, b.id] } } }), 2);
    assert.equal((await service.get(users[1])).castle!.wood, 900);
    const board = await service.leaderboard(users[0]);
    assert(!board.some((entry) => 'x' in entry || 'wood' in entry));
    console.log(
      'Castle integration passed: duplicate foundation/departure/resolution, private overlapping plots, conserved loot, reports.',
    );
  } finally {
    for (const id of users) await prisma.user.delete({ where: { id } });
    await prisma.$disconnect();
    console.log(`Removed ${users.length} temporary test accounts and their castle data.`);
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
