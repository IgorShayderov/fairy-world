import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ItemRarity, PlayerBuffType, Prisma, StatType } from '../../generated/client';
import { ItemView } from '../common/views/item.view';
import { CRAFTING_MIN_LEVEL, pickCraftMaterialCode } from '../crafting/crafting.catalog';
import { ItemGeneratorService } from '../items/item-generator.service';
import { getPotionEffect, getPotionRequiredLevel } from '../items/potion-effects';
import { requireLandmark } from '../locations/landmarks';
import { PrismaService } from '../prisma.service';
import { progressionAfterExperience, requiredPlayerLevel } from '../users/level-progression';
import { UserView } from '../users/user.view';
import { UsersService } from '../users/users.service';
import { rollDeathCurse } from './death-curse';
import type { GeneratedMonster } from './monster-generator.service';
import { MonsterGeneratorService } from './monster-generator.service';
import { rollDungeonLootRarity } from './monster-loot';

type Combatant = {
  name: string;
  health: number;
  maxHealth: number;
  damage: number;
  defense: number;
  dodge: number;
  criticalChance: number;
  criticalDamage: number;
};

type DungeonEvent = {
  actor: 'PLAYER' | 'MONSTER';
  damage: number;
  critical: boolean;
  dodged: boolean;
  targetName?: string;
  actorName?: string;
};
type DungeonBattleResult = { winner: 'PLAYER' | 'MONSTER'; winnerName: string };
type DungeonOpponent = {
  id: string;
  monsterType: string;
  image: string;
  isBoss: boolean;
  status: 'AVAILABLE' | 'LOCKED' | 'DEFEATED';
  monster: Combatant & { level: number; rewardGold: number; rewardExperience: number };
};
type DungeonRewardItem = ReturnType<typeof ItemView.render> & {
  quantity: 1;
  inventoryItemId?: number;
  addedToInventory: boolean;
  inventoryFull: boolean;
};
type DungeonCraftReward = {
  id: number;
  name: string;
  description: string;
  icon: string;
  rarity: ItemRarity;
  quantity: number;
};
type DungeonRewards = {
  gold: number;
  experience: number;
  items: DungeonRewardItem[];
  craftItems: DungeonCraftReward[];
};
type DungeonPartyLootItem = DungeonRewardItem & {
  claimantProfileIds: number[];
  winnerProfileId?: number;
  winnerName?: string;
};
type DungeonPartyLoot = {
  status: 'CHOOSING' | 'RESOLVED';
  items: DungeonPartyLootItem[];
  submittedProfileIds: number[];
  deadlineAt?: string;
};
export type DungeonPartyMemberView = {
  profileId: number;
  userId: number;
  name: string;
  level: number;
  leader: boolean;
  health?: number;
  maxHealth?: number;
  mana?: number;
  maxMana?: number;
  damage?: number;
  defense?: number;
  dodge?: number;
  criticalChance?: number;
  criticalDamage?: number;
};
export type DungeonPartyView = {
  id: string;
  dungeon: string;
  status: string;
  members: DungeonPartyMemberView[];
  isLeader: boolean;
};
export type DungeonPartyLobby = { currentParty: DungeonPartyView | null; openParties: DungeonPartyView[] };
type PartyWithMembers = Prisma.DungeonPartyGetPayload<{
  include: { members: { include: { gameProfile: { include: { user: true } } } } };
}>;
export type DungeonRunState = {
  id: string;
  dungeon: string;
  status: 'ACTIVE' | 'VICTORY' | 'DEFEAT';
  startedAt: string;
  player: Combatant;
  opponents: DungeonOpponent[];
  latestEvents: DungeonEvent[];
  lastBattleResult: DungeonBattleResult | null;
  lastExperience: number;
  totalExperience: number;
  experienceBonusPercent: number;
  goldBonusPercent: number;
  rewards: null | DungeonRewards;
  party?: { id: string; members: DungeonPartyMemberView[] };
  partyRewards?: Record<string, DungeonRewards>;
  partyLoot?: DungeonPartyLoot;
  partyTurn?: number;
};

const DUNGEON_GOLD_MULTIPLIER = 2;
const BONUS_RARE_ITEM_CHANCE = 0.1;

type DungeonRole = {
  name: string;
  image: string;
  health: number;
  damage: number;
  boss: boolean;
};

export const DUNGEON_ROSTERS: Record<string, readonly DungeonRole[]> = {
  EMBERDEEP: [
    {
      name: 'Flamebound Stalker',
      image: '/images/dungeons/shadow-stalker.webp',
      health: 1.35,
      damage: 1.2,
      boss: false,
    },
    { name: 'Cinder Stone Brute', image: '/images/dungeons/stone-brute.webp', health: 1.55, damage: 1.3, boss: false },
    { name: 'Ember Wraith', image: '/images/dungeons/arcane-wraith.webp', health: 1.3, damage: 1.4, boss: false },
    {
      name: 'Warden of the First Flame',
      image: '/images/dungeons/ancient-warden.webp',
      health: 2.3,
      damage: 1.65,
      boss: true,
    },
  ],
  HOLLOWGATE: [
    {
      name: 'Hollowfang Stalker',
      image: '/images/dungeons/hollowfang-stalker.webp',
      health: 1.25,
      damage: 1.35,
      boss: false,
    },
    {
      name: 'Ossuary Colossus',
      image: '/images/dungeons/ossuary-colossus.webp',
      health: 1.8,
      damage: 1.15,
      boss: false,
    },
    { name: 'Veilbound Hexer', image: '/images/dungeons/veilbound-hexer.webp', health: 1.2, damage: 1.55, boss: false },
    { name: 'The Hollow King', image: '/images/dungeons/hollow-king.webp', health: 2.45, damage: 1.7, boss: true },
  ],
  ICEVAULT: [
    { name: 'Rimeclaw Hunter', image: '/images/dungeons/rimeclaw-hunter.webp', health: 1.3, damage: 1.4, boss: false },
    { name: 'Glacier Troll', image: '/images/dungeons/glacier-troll.webp', health: 1.85, damage: 1.15, boss: false },
    { name: 'Frost Wraith', image: '/images/dungeons/frost-wraith.webp', health: 1.25, damage: 1.5, boss: false },
    {
      name: 'Icebound Sovereign',
      image: '/images/dungeons/icebound-sovereign.webp',
      health: 2.6,
      damage: 1.6,
      boss: true,
    },
  ],
  RAVENCRYPT: [
    {
      name: 'Gravewing Stalker',
      image: '/images/dungeons/gravewing-stalker.webp',
      health: 1.3,
      damage: 1.4,
      boss: false,
    },
    {
      name: 'Bonebound Knight',
      image: '/images/dungeons/bonebound-knight.webp',
      health: 1.65,
      damage: 1.25,
      boss: false,
    },
    { name: 'Plague Seer', image: '/images/dungeons/plague-seer.webp', health: 1.2, damage: 1.55, boss: false },
    { name: 'The Raven Lich', image: '/images/dungeons/raven-lich.webp', health: 2.35, damage: 1.75, boss: true },
  ],
};

@Injectable()
export class DungeonRunsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly monsterGenerator: MonsterGeneratorService,
    private readonly usersService: UsersService,
    private readonly itemGenerator: ItemGeneratorService,
  ) {}

  async partyLobby(userId: number, dungeon: string): Promise<DungeonPartyLobby> {
    const profile = await this.prisma.gameProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) throw new NotFoundException('Game profile not found');
    const parties = await this.prisma.dungeonParty.findMany({
      where: { OR: [{ dungeon, status: 'WAITING' }, { members: { some: { gameProfileId: profile.id } } }] },
      include: { members: { include: { gameProfile: { include: { user: true } } }, orderBy: { joinedAt: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
    const views = parties.map((party) => this.renderParty(party, profile.id));
    return {
      currentParty: views.find((party) => party.members.some(({ profileId }) => profileId === profile.id)) ?? null,
      openParties: views.filter((party) => party.status === 'WAITING' && party.members.length < 3),
    };
  }

  async createParty(userId: number, dungeon: string): Promise<DungeonPartyView> {
    const user = await this.usersService.findCurrentUser(userId);
    if (!user?.gameProfile) throw new NotFoundException('Game profile not found');
    requireLandmark(dungeon, 'dungeon', user.gameProfile);
    await this.assertCanJoinParty(user.gameProfile.id, dungeon);
    const party = await this.prisma.dungeonParty.create({
      data: {
        dungeon,
        leaderProfileId: user.gameProfile.id,
        members: { create: { gameProfileId: user.gameProfile.id } },
      },
      include: { members: { include: { gameProfile: { include: { user: true } } }, orderBy: { joinedAt: 'asc' } } },
    });
    return this.renderParty(party, user.gameProfile.id);
  }

  async joinParty(userId: number, partyId: string): Promise<DungeonPartyView> {
    const user = await this.usersService.findCurrentUser(userId);
    if (!user?.gameProfile) throw new NotFoundException('Game profile not found');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${partyId}))`;
      const party = await tx.dungeonParty.findUnique({
        where: { id: partyId },
        include: { members: { include: { gameProfile: { include: { user: true } } }, orderBy: { joinedAt: 'asc' } } },
      });
      if (!party || party.status !== 'WAITING') throw new NotFoundException('Dungeon party is no longer available');
      if (party.members.length >= 3) throw new BadRequestException('Dungeon party is full');
      requireLandmark(party.dungeon, 'dungeon', user.gameProfile!);
      await this.assertCanJoinParty(user.gameProfile!.id, party.dungeon, tx);
      await tx.dungeonPartyMember.create({ data: { partyId, gameProfileId: user.gameProfile!.id } });
      const updated = await tx.dungeonParty.findUniqueOrThrow({
        where: { id: partyId },
        include: { members: { include: { gameProfile: { include: { user: true } } }, orderBy: { joinedAt: 'asc' } } },
      });
      return this.renderParty(updated, user.gameProfile!.id);
    });
  }

  async leaveParty(userId: number, partyId: string) {
    const profile = await this.prisma.gameProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) throw new NotFoundException('Game profile not found');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${partyId}))`;
      const party = await tx.dungeonParty.findUnique({ where: { id: partyId }, include: { members: true } });
      if (!party || !party.members.some(({ gameProfileId }) => gameProfileId === profile.id)) {
        throw new NotFoundException('Dungeon party not found');
      }
      const activeRun = await tx.dungeonRun.findUnique({ where: { id: partyId } });
      if (activeRun) {
        const activeState = this.parseState(activeRun.state);
        if (activeState.partyLoot?.status === 'CHOOSING') {
          throw new BadRequestException('Submit your loot choices before leaving the dungeon');
        }
      }
      await tx.dungeonPartyMember.delete({ where: { partyId_gameProfileId: { partyId, gameProfileId: profile.id } } });
      const remaining = party.members.filter(({ gameProfileId }) => gameProfileId !== profile.id);
      if (!remaining.length) {
        await tx.dungeonRun.deleteMany({ where: { id: partyId } });
        await tx.dungeonParty.delete({ where: { id: partyId } });
      } else {
        const nextLeaderId = party.leaderProfileId === profile.id ? remaining[0].gameProfileId : party.leaderProfileId;
        if (nextLeaderId !== party.leaderProfileId) {
          await tx.dungeonParty.update({ where: { id: partyId }, data: { leaderProfileId: nextLeaderId } });
        }
        const run = await tx.dungeonRun.findUnique({ where: { id: partyId } });
        if (run) {
          const state = this.parseState(run.state);
          if (state.party) {
            state.party.members = state.party.members
              .filter(({ profileId }) => profileId !== profile.id)
              .map((member) => ({ ...member, leader: member.profileId === nextLeaderId }));
            state.partyTurn = (state.partyTurn ?? 0) % state.party.members.length;
            this.ensurePartyCombatState(state);
            await tx.dungeonRun.update({ where: { id: partyId }, data: { state: this.json(state) } });
          }
        }
      }
      return { success: true };
    });
  }

  async startParty(userId: number, partyId: string): Promise<DungeonRunState> {
    const profile = await this.prisma.gameProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) throw new NotFoundException('Game profile not found');
    const snapshot = await this.prisma.dungeonParty.findUnique({
      where: { id: partyId },
      include: { members: { include: { gameProfile: { include: { user: true } } }, orderBy: { joinedAt: 'asc' } } },
    });
    if (!snapshot || snapshot.status !== 'WAITING') throw new NotFoundException('Dungeon party is no longer available');
    if (snapshot.leaderProfileId !== profile.id) throw new BadRequestException('Only the party leader can start');
    if (snapshot.members.length < 2) throw new BadRequestException('At least two players are required');

    const users = await Promise.all(
      snapshot.members.map(({ gameProfile }) => this.usersService.findCurrentUser(gameProfile.userId)),
    );
    if (users.some((member) => !member?.gameProfile)) throw new NotFoundException('Party member profile not found');
    for (const member of users) requireLandmark(snapshot.dungeon, 'dungeon', member!.gameProfile!);
    const rendered = users.map((member) => UserView.renderCurrent(member!));
    const state = this.createPartyRun(
      snapshot.id,
      snapshot.dungeon,
      rendered,
      snapshot.members.map(({ gameProfile }) => gameProfile),
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${partyId}))`;
      const party = await tx.dungeonParty.findUnique({ where: { id: partyId }, include: { members: true } });
      if (!party || party.status !== 'WAITING' || party.leaderProfileId !== profile.id) {
        throw new BadRequestException('Dungeon party changed; refresh the lobby');
      }
      for (const member of party.members) {
        const activeRun = await tx.dungeonRun.findUnique({ where: { gameProfileId: member.gameProfileId } });
        if (activeRun) throw new BadRequestException('A party member already has an active dungeon');
        const where = { gameProfileId_dungeon: { gameProfileId: member.gameProfileId, dungeon: party.dungeon } };
        const visit = await tx.dungeonVisit.findUnique({ where });
        if (visit && visit.nextEntryAt > new Date())
          throw new BadRequestException('A party member has a dungeon cooldown');
        await tx.dungeonVisit.upsert({
          where,
          create: {
            gameProfileId: member.gameProfileId,
            dungeon: party.dungeon,
            nextEntryAt: new Date(Date.now() + 3_600_000),
          },
          update: { nextEntryAt: new Date(Date.now() + 3_600_000) },
        });
      }
      await tx.dungeonRun.create({
        data: { id: partyId, gameProfileId: party.leaderProfileId, dungeon: party.dungeon, state: this.json(state) },
      });
      await tx.dungeonParty.update({ where: { id: partyId }, data: { status: 'ACTIVE' } });
      return this.renderPartyRun(state, profile.id);
    });
  }

  async active(userId: number): Promise<DungeonRunState | null> {
    const profile = await this.prisma.gameProfile.findUnique({
      where: { userId },
      include: { dungeonRun: true, dungeonParty: { include: { party: true } } },
    });
    if (!profile) throw new NotFoundException('Game profile not found');
    const ownRun = profile.dungeonRun;
    if (ownRun) {
      return this.refreshActiveRun(ownRun.id, profile.id);
    }
    const membership = profile.dungeonParty;
    if (!membership || membership.party.status === 'WAITING') return null;
    const partyId = membership.party.id;
    const run = await this.prisma.dungeonRun.findUnique({ where: { id: partyId } });
    if (!run) return null;
    return this.refreshActiveRun(run.id, profile.id);
  }

  async enter(userId: number, name: string): Promise<DungeonRunState> {
    const user = await this.usersService.findCurrentUser(userId);
    if (!user?.gameProfile) throw new NotFoundException('Game profile not found');
    requireLandmark(name, 'dungeon', user.gameProfile);
    const renderedPlayer = UserView.renderCurrent(user);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;
      const activeRun = await tx.dungeonRun.findUnique({ where: { gameProfileId: user.gameProfile!.id } });
      if (activeRun) return this.parseState(activeRun.state);
      const partyMembership = await tx.dungeonPartyMember.findUnique({
        where: { gameProfileId: user.gameProfile!.id },
      });
      if (partyMembership) throw new BadRequestException('Leave the current dungeon party first');

      const where = { gameProfileId_dungeon: { gameProfileId: user.gameProfile!.id, dungeon: name } };
      const visit = await tx.dungeonVisit.findUnique({ where });
      if (visit && visit.nextEntryAt > new Date()) {
        throw new BadRequestException('Dungeon is resting. You can enter once per hour.');
      }
      await tx.dungeonVisit.upsert({
        where,
        create: { gameProfileId: user.gameProfile!.id, dungeon: name, nextEntryAt: new Date(Date.now() + 3_600_000) },
        update: { nextEntryAt: new Date(Date.now() + 3_600_000) },
      });

      const state = this.createRun(userId, name, renderedPlayer);
      await tx.dungeonRun.create({
        data: {
          id: state.id,
          gameProfileId: user.gameProfile!.id,
          dungeon: name,
          state: this.json(state),
        },
      });
      return state;
    });
  }

  async attack(userId: number, runId: string, opponentId: string): Promise<DungeonRunState> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${runId}))`;
      const profile = await tx.gameProfile.findUnique({ where: { userId }, include: { dungeonRun: true } });
      const party = await tx.dungeonParty.findUnique({ where: { id: runId }, include: { members: true } });
      if (party) {
        if (!profile || !party.members.some(({ gameProfileId }) => gameProfileId === profile.id)) {
          throw new NotFoundException('Active dungeon run not found');
        }
        const partyRun = await tx.dungeonRun.findUnique({ where: { id: runId } });
        if (!partyRun) throw new NotFoundException('Active dungeon run not found');
        return this.attackParty(tx, profile.id, party, this.parseState(partyRun.state), opponentId);
      }
      if (!profile?.dungeonRun || profile.dungeonRun.id !== runId) {
        throw new NotFoundException('Active dungeon run not found');
      }
      const state = this.parseState(profile.dungeonRun.state);
      if (state.status !== 'ACTIVE') throw new BadRequestException('Dungeon run has already ended');
      const opponent = state.opponents.find(({ id }) => id === opponentId);
      if (!opponent) throw new NotFoundException('Dungeon opponent not found');
      if (opponent.status === 'LOCKED') throw new BadRequestException('Defeat the three guardians before the boss');
      if (opponent.status === 'DEFEATED') throw new BadRequestException('This opponent is already defeated');
      if (opponent.isBoss) {
        const backpackCount = await tx.inventoryItem.count({
          where: { gameProfileId: profile.id, isEquiped: false },
        });
        if (backpackCount >= 23) {
          throw new BadRequestException('Make room for up to two dungeon reward items before fighting the boss.');
        }
      }

      state.lastBattleResult = null;
      state.lastExperience = 0;
      this.strike(state.player, opponent.monster, 'PLAYER', state.latestEvents);
      if (opponent.monster.health > 0) {
        this.strike(opponent.monster, state.player, 'MONSTER', state.latestEvents);
      }
      state.latestEvents = state.latestEvents.slice(-200);

      if (state.player.health <= 0) {
        state.lastBattleResult = { winner: 'MONSTER', winnerName: opponent.monster.name };
        state.status = 'DEFEAT';
        await tx.dungeonRun.delete({ where: { id: runId } });
        const defeatedProfile = await tx.gameProfile.update({
          where: { id: profile.id },
          data: { mapPositionX: 1470, mapPositionY: 960 },
        });
        await tx.gameProfileBuff.deleteMany({ where: { gameProfileId: profile.id } });
        const curse = rollDeathCurse(defeatedProfile.level);
        if (curse) {
          await tx.gameProfileBuff.create({
            data: {
              gameProfileId: profile.id,
              type: curse.type,
              value: curse.value,
              expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
            },
          });
        }
        return state;
      }

      if (opponent.monster.health > 0) {
        await tx.dungeonRun.update({ where: { id: runId }, data: { state: this.json(state) } });
        return state;
      }

      opponent.status = 'DEFEATED';
      state.lastBattleResult = { winner: 'PLAYER', winnerName: state.player.name };
      state.lastExperience = Math.round(opponent.monster.rewardExperience * (1 + state.experienceBonusPercent / 100));
      state.totalExperience += state.lastExperience;
      const updatedProfile = await tx.gameProfile.update({
        where: { id: profile.id },
        data: { experience: { increment: state.lastExperience }, killedMonsters: { increment: 1 } },
        select: { id: true, level: true, experience: true },
      });
      const progression = progressionAfterExperience(updatedProfile.level, updatedProfile.experience);
      if (progression.level !== updatedProfile.level || progression.experience !== updatedProfile.experience) {
        await tx.gameProfile.update({
          where: { id: profile.id },
          data: {
            level: progression.level,
            experience: progression.experience,
            freeAttributes: { increment: progression.freeAttributes },
          },
        });
      }

      const guardiansDefeated = state.opponents
        .filter(({ isBoss }) => !isBoss)
        .every(({ status }) => status === 'DEFEATED');
      const boss = state.opponents.find(({ isBoss }) => isBoss);
      if (guardiansDefeated && boss?.status === 'LOCKED') boss.status = 'AVAILABLE';

      if (opponent.isBoss) {
        const gold = Math.round(
          state.opponents.reduce((sum, entry) => sum + entry.monster.rewardGold, 0) *
            DUNGEON_GOLD_MULTIPLIER *
            (1 + state.goldBonusPercent / 100),
        );
        const rarity = rollDungeonLootRarity();
        const rewardLevel = this.equippableDungeonRewardLevel(opponent.monster.level, profile.level);
        const item = await this.itemGenerator.generate(
          { level: rewardLevel, rarity, minimumRarity: ItemRarity.RARE },
          tx,
        );
        const rewardItems = [item];
        if (Math.random() < BONUS_RARE_ITEM_CHANCE) {
          rewardItems.push(
            await this.itemGenerator.generate(
              { level: rewardLevel, rarity: ItemRarity.RARE, minimumRarity: ItemRarity.RARE },
              tx,
            ),
          );
        }
        const inventoryEntries: Array<{ id: number }> = [];
        for (const rewardItem of rewardItems) {
          inventoryEntries.push(
            await tx.inventoryItem.create({
              data: { gameProfileId: profile.id, itemId: rewardItem.id, quantity: 1, slot: null, isEquiped: false },
            }),
          );
        }
        const craftItems = profile.level >= CRAFTING_MIN_LEVEL ? await this.awardCraftMaterials(tx, profile.id) : [];
        await tx.gameProfile.update({
          where: { id: profile.id },
          data: { gold: { increment: gold }, dungeonsCleared: { increment: 1 } },
        });
        state.status = 'VICTORY';
        state.rewards = {
          gold,
          experience: state.totalExperience,
          items: rewardItems.map((rewardItem, index) => ({
            ...ItemView.render(rewardItem),
            quantity: 1,
            inventoryItemId: inventoryEntries[index]?.id,
            addedToInventory: true,
            inventoryFull: false,
          })),
          craftItems,
        };
        await tx.dungeonRun.delete({ where: { id: runId } });
        return state;
      }

      await tx.dungeonRun.update({ where: { id: runId }, data: { state: this.json(state) } });
      return state;
    });
  }

  async leave(userId: number, runId: string) {
    const membership = await this.prisma.dungeonPartyMember.findFirst({
      where: { partyId: runId, gameProfile: { userId } },
    });
    if (membership) return this.leaveParty(userId, runId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;
      const profile = await tx.gameProfile.findUnique({
        where: { userId },
        include: { dungeonRun: true },
      });
      if (!profile?.dungeonRun || profile.dungeonRun.id !== runId) {
        throw new NotFoundException('Active dungeon run not found');
      }
      await tx.dungeonRun.delete({ where: { id: runId } });
      return { success: true };
    });
  }

  async useHealthPotion(userId: number, runId: string, inventoryItemId: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${runId}))`;
      const profile = await tx.gameProfile.findUnique({
        where: { userId },
        include: { dungeonRun: true, dungeonParty: true },
      });
      const partyRun =
        profile?.dungeonParty?.partyId === runId ? await tx.dungeonRun.findUnique({ where: { id: runId } }) : null;
      const run = profile?.dungeonRun?.id === runId ? profile.dungeonRun : partyRun;
      if (!profile || !run) {
        throw new NotFoundException('Active dungeon run not found');
      }
      const state = this.parseState(run.state);
      if (state.status !== 'ACTIVE') throw new BadRequestException('Dungeon run has already ended');
      this.ensurePartyCombatState(state);
      const partyMember = state.party?.members.find(({ profileId }) => profileId === profile.id);
      const currentHealth = partyMember?.health ?? state.player.health;
      const maxHealth = partyMember?.maxHealth ?? state.player.maxHealth;
      if (currentHealth >= maxHealth) {
        throw new BadRequestException('Health is already full');
      }

      const inventoryEntry = await tx.inventoryItem.findFirst({
        where: { id: inventoryItemId, gameProfileId: profile.id, isEquiped: false },
        include: { item: true },
      });
      if (!inventoryEntry) throw new NotFoundException('Health potion not found');
      const effect = getPotionEffect(inventoryEntry.item.name);
      if (!inventoryEntry.item.isConsumable || effect?.kind !== 'HEALTH') {
        throw new BadRequestException('This item is not a health potion');
      }
      const requiredLevel = getPotionRequiredLevel(inventoryEntry.item.name);
      if (profile.level < requiredLevel) {
        throw new BadRequestException(`This potion requires player level ${requiredLevel}`);
      }

      const healed = Math.min(effect.restore, maxHealth - currentHealth);
      if (partyMember) {
        partyMember.health = currentHealth + healed;
        this.syncPartySummary(state);
      } else {
        state.player.health += healed;
      }
      if (inventoryEntry.quantity > 1) {
        await tx.inventoryItem.update({
          where: { id: inventoryEntry.id },
          data: { quantity: { decrement: 1 } },
        });
      } else {
        await tx.inventoryItem.delete({ where: { id: inventoryEntry.id } });
      }
      await tx.dungeonRun.update({ where: { id: runId }, data: { state: this.json(state) } });
      return { run: this.renderPartyRun(state, profile.id), healed };
    });
  }

  async submitPartyLoot(userId: number, runId: string, itemIds: unknown): Promise<DungeonRunState> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${runId}))`;
      const profile = await tx.gameProfile.findUnique({ where: { userId }, select: { id: true } });
      const party = await tx.dungeonParty.findUnique({ where: { id: runId }, include: { members: true } });
      const run = await tx.dungeonRun.findUnique({ where: { id: runId } });
      if (!profile || !party || !run || !party.members.some(({ gameProfileId }) => gameProfileId === profile.id)) {
        throw new NotFoundException('Active dungeon party not found');
      }
      const state = this.parseState(run.state);
      if (state.status !== 'VICTORY' || !state.partyLoot) {
        throw new BadRequestException('Party loot is not available');
      }
      if (state.partyLoot.status === 'RESOLVED') return this.renderPartyRun(state, profile.id);
      if (this.partyLootExpired(state)) {
        await this.resolvePartyLoot(
          tx,
          state,
          party.members.map(({ gameProfileId }) => gameProfileId),
        );
        await tx.dungeonRun.update({ where: { id: runId }, data: { state: this.json(state) } });
        return this.renderPartyRun(state, profile.id);
      }
      if (state.partyLoot.submittedProfileIds.includes(profile.id)) {
        throw new BadRequestException('Loot choices have already been submitted');
      }
      if (!Array.isArray(itemIds) || itemIds.some((id) => !Number.isInteger(id))) {
        throw new BadRequestException('Item ids must be an array of integers');
      }
      const availableIds = new Set(state.partyLoot.items.map(({ id }) => id));
      const selectedIds = [...new Set(itemIds as number[])];
      if (selectedIds.some((id) => !availableIds.has(id))) {
        throw new BadRequestException('Invalid dungeon loot selection');
      }
      for (const item of state.partyLoot.items) {
        if (selectedIds.includes(item.id)) item.claimantProfileIds.push(profile.id);
      }
      state.partyLoot.submittedProfileIds.push(profile.id);

      const memberIds = party.members.map(({ gameProfileId }) => gameProfileId);
      if (memberIds.every((id) => state.partyLoot!.submittedProfileIds.includes(id))) {
        await this.resolvePartyLoot(tx, state, memberIds);
      }
      await tx.dungeonRun.update({ where: { id: runId }, data: { state: this.json(state) } });
      return this.renderPartyRun(state, profile.id);
    });
  }

  async reset(userId: number, name: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;
      const profile = await tx.gameProfile.findUnique({
        where: { userId },
        include: { dungeonRun: true },
      });
      if (!profile) throw new NotFoundException('Game profile not found');
      requireLandmark(name, 'dungeon', profile);
      if (profile.dungeonRun) throw new BadRequestException('Finish the active dungeon first');
      const partyMembership = await tx.dungeonPartyMember.findUnique({ where: { gameProfileId: profile.id } });
      if (partyMembership) throw new BadRequestException('Leave the current dungeon party first');
      const where = { gameProfileId_dungeon: { gameProfileId: profile.id, dungeon: name } };
      const visit = await tx.dungeonVisit.findUnique({ where });
      if (!visit || visit.nextEntryAt <= new Date()) throw new BadRequestException('Dungeon is already available');
      const paid = await tx.gameProfile.updateMany({
        where: { id: profile.id, gems: { gte: 10 } },
        data: { gems: { decrement: 10 } },
      });
      if (paid.count !== 1) throw new BadRequestException('Not enough gems');
      await tx.dungeonVisit.delete({ where });
      return { success: true, cost: 10 };
    });
  }

  private async attackParty(
    tx: Prisma.TransactionClient,
    currentProfileId: number,
    party: { id: string; members: Array<{ gameProfileId: number }> },
    state: DungeonRunState,
    opponentId: string,
  ): Promise<DungeonRunState> {
    if (state.status !== 'ACTIVE') throw new BadRequestException('Dungeon run has already ended');
    const opponent = state.opponents.find(({ id }) => id === opponentId);
    if (!opponent) throw new NotFoundException('Dungeon opponent not found');
    if (opponent.status === 'LOCKED') throw new BadRequestException('Defeat the three guardians before the boss');
    if (opponent.status === 'DEFEATED') throw new BadRequestException('This opponent is already defeated');
    if (opponent.isBoss) {
      for (const member of party.members) {
        const count = await tx.inventoryItem.count({
          where: { gameProfileId: member.gameProfileId, isEquiped: false },
        });
        if (count >= 23) throw new BadRequestException('Every party member needs room for up to two reward items.');
      }
    }

    this.ensurePartyCombatState(state);
    const actingMember = state.party?.members.find(({ profileId }) => profileId === currentProfileId);
    if (!actingMember || !this.partyMemberIsAlive(actingMember)) {
      throw new BadRequestException('You have no Health and cannot attack');
    }
    state.lastBattleResult = null;
    const attacker = this.partyMemberCombatant(actingMember);
    this.strike(attacker, opponent.monster, 'PLAYER', state.latestEvents, actingMember.name);

    if (opponent.monster.health > 0) {
      const members = state.party!.members;
      let targetIndex = state.partyTurn ?? 0;
      let target = members[targetIndex % members.length];
      for (let checked = 0; checked < members.length && !this.partyMemberIsAlive(target); checked += 1) {
        targetIndex = (targetIndex + 1) % members.length;
        target = members[targetIndex];
      }
      if (this.partyMemberIsAlive(target)) {
        const defender = this.partyMemberCombatant(target);
        this.strike(opponent.monster, defender, 'MONSTER', state.latestEvents, opponent.monster.name, target.name);
        target.health = defender.health;
        state.partyTurn = (targetIndex + 1) % members.length;
      }
    }
    state.latestEvents = state.latestEvents.slice(-200);
    this.syncPartySummary(state);

    if (!state.party!.members.some((member) => this.partyMemberIsAlive(member))) {
      state.lastBattleResult = { winner: 'MONSTER', winnerName: opponent.monster.name };
      state.status = 'DEFEAT';
      for (const member of party.members) await this.applyDungeonDefeat(tx, member.gameProfileId);
      await tx.dungeonRun.update({ where: { id: party.id }, data: { state: this.json(state) } });
      await tx.dungeonParty.update({ where: { id: party.id }, data: { status: 'DEFEAT' } });
      return this.renderPartyRun(state, currentProfileId);
    }

    if (opponent.monster.health > 0) {
      await tx.dungeonRun.update({ where: { id: party.id }, data: { state: this.json(state) } });
      return this.renderPartyRun(state, currentProfileId);
    }

    opponent.status = 'DEFEATED';
    state.lastBattleResult = { winner: 'PLAYER', winnerName: actingMember.name };
    const totalExperience = Math.round(opponent.monster.rewardExperience * (1 + state.experienceBonusPercent / 100));
    state.lastExperience = Math.floor(totalExperience / party.members.length);
    state.totalExperience += state.lastExperience;
    for (const member of party.members) {
      await this.awardDungeonExperience(tx, member.gameProfileId, state.lastExperience);
    }
    const guardiansDefeated = state.opponents
      .filter(({ isBoss }) => !isBoss)
      .every(({ status }) => status === 'DEFEATED');
    const boss = state.opponents.find(({ isBoss }) => isBoss);
    if (guardiansDefeated && boss?.status === 'LOCKED') boss.status = 'AVAILABLE';

    if (opponent.isBoss) {
      state.status = 'VICTORY';
      state.partyRewards = {};
      const totalGold = Math.round(
        state.opponents.reduce((sum, entry) => sum + entry.monster.rewardGold, 0) *
          DUNGEON_GOLD_MULTIPLIER *
          (1 + state.goldBonusPercent / 100),
      );
      const goldPerPlayer = Math.floor(totalGold / party.members.length);
      for (const member of party.members) {
        state.partyRewards[String(member.gameProfileId)] = await this.awardPartyMemberRewards(
          tx,
          member.gameProfileId,
          goldPerPlayer,
          state.totalExperience,
        );
      }
      state.partyLoot = {
        status: 'CHOOSING',
        items: (
          await this.generateDungeonRewardItems(
            tx,
            opponent.monster.level,
            Math.min(...state.party!.members.map(({ level }) => level)),
          )
        ).map((item) => ({
          ...ItemView.render(item),
          quantity: 1,
          addedToInventory: false,
          inventoryFull: false,
          claimantProfileIds: [],
        })),
        submittedProfileIds: [],
        deadlineAt: new Date(Date.now() + 60_000).toISOString(),
      };
      await tx.dungeonParty.update({ where: { id: party.id }, data: { status: 'VICTORY' } });
    }
    await tx.dungeonRun.update({ where: { id: party.id }, data: { state: this.json(state) } });
    return this.renderPartyRun(state, currentProfileId);
  }

  private async awardDungeonExperience(tx: Prisma.TransactionClient, gameProfileId: number, experience: number) {
    const updated = await tx.gameProfile.update({
      where: { id: gameProfileId },
      data: { experience: { increment: experience }, killedMonsters: { increment: 1 } },
      select: { level: true, experience: true },
    });
    const progression = progressionAfterExperience(updated.level, updated.experience);
    if (progression.level !== updated.level || progression.experience !== updated.experience) {
      await tx.gameProfile.update({
        where: { id: gameProfileId },
        data: {
          level: progression.level,
          experience: progression.experience,
          freeAttributes: { increment: progression.freeAttributes },
        },
      });
    }
  }

  private async applyDungeonDefeat(tx: Prisma.TransactionClient, gameProfileId: number) {
    const profile = await tx.gameProfile.update({
      where: { id: gameProfileId },
      data: { mapPositionX: 1470, mapPositionY: 960 },
      select: { level: true },
    });
    await tx.gameProfileBuff.deleteMany({ where: { gameProfileId } });
    const curse = rollDeathCurse(profile.level);
    if (curse) {
      await tx.gameProfileBuff.create({
        data: {
          gameProfileId,
          type: curse.type,
          value: curse.value,
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        },
      });
    }
  }

  private async awardPartyMemberRewards(
    tx: Prisma.TransactionClient,
    gameProfileId: number,
    gold: number,
    experience: number,
  ): Promise<DungeonRewards> {
    const profile = await tx.gameProfile.findUniqueOrThrow({ where: { id: gameProfileId }, select: { level: true } });
    const craftItems = profile.level >= CRAFTING_MIN_LEVEL ? await this.awardCraftMaterials(tx, gameProfileId) : [];
    await tx.gameProfile.update({
      where: { id: gameProfileId },
      data: { gold: { increment: gold }, dungeonsCleared: { increment: 1 } },
    });
    return { gold, experience, items: [], craftItems };
  }

  private equippableDungeonRewardLevel(monsterLevel: number, playerLevel: number) {
    let rewardLevel = Math.max(1, monsterLevel);
    while (rewardLevel > 1 && requiredPlayerLevel(rewardLevel) > playerLevel) rewardLevel -= 1;
    return rewardLevel;
  }

  private async generateDungeonRewardItems(tx: Prisma.TransactionClient, monsterLevel: number, playerLevel: number) {
    const rewardLevel = this.equippableDungeonRewardLevel(monsterLevel, playerLevel);
    const first = await this.itemGenerator.generate(
      { level: rewardLevel, rarity: rollDungeonLootRarity(), minimumRarity: ItemRarity.RARE },
      tx,
    );
    const rewardItems = [first];
    if (Math.random() < BONUS_RARE_ITEM_CHANCE) {
      rewardItems.push(
        await this.itemGenerator.generate(
          { level: rewardLevel, rarity: ItemRarity.RARE, minimumRarity: ItemRarity.RARE },
          tx,
        ),
      );
    }
    return rewardItems;
  }

  private async resolvePartyLoot(tx: Prisma.TransactionClient, state: DungeonRunState, memberIds: number[]) {
    if (!state.partyLoot || !state.party || !state.partyRewards) return;
    for (const item of state.partyLoot.items) {
      const candidates = item.claimantProfileIds.length ? item.claimantProfileIds : memberIds;
      const winnerProfileId = candidates[Math.floor(Math.random() * candidates.length)];
      const winner = state.party.members.find(({ profileId }) => profileId === winnerProfileId);
      if (!winnerProfileId || !winner) continue;
      const inventoryEntry = await tx.inventoryItem.create({
        data: { gameProfileId: winnerProfileId, itemId: item.id, quantity: 1, slot: null, isEquiped: false },
      });
      item.winnerProfileId = winnerProfileId;
      item.winnerName = winner.name;
      item.inventoryItemId = inventoryEntry.id;
      item.addedToInventory = true;
      state.partyRewards[String(winnerProfileId)]?.items.push({ ...item });
    }
    state.partyLoot.status = 'RESOLVED';
  }

  private partyLootExpired(state: DungeonRunState) {
    return (
      state.partyLoot?.status === 'CHOOSING' &&
      !!state.partyLoot.deadlineAt &&
      new Date(state.partyLoot.deadlineAt).getTime() <= Date.now()
    );
  }

  private async refreshActiveRun(runId: string, profileId: number): Promise<DungeonRunState | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${runId}))`;
      const run = await tx.dungeonRun.findUnique({ where: { id: runId } });
      if (!run) return null;
      const state = this.parseState(run.state);
      let changed = await this.hydratePartyCombatState(state);
      if (state.partyLoot?.status === 'CHOOSING' && !state.partyLoot.deadlineAt) {
        state.partyLoot.deadlineAt = new Date(Date.now() + 60_000).toISOString();
        changed = true;
      }
      if (this.partyLootExpired(state) && state.party) {
        await this.resolvePartyLoot(
          tx,
          state,
          state.party.members.map(({ profileId: memberProfileId }) => memberProfileId),
        );
        changed = true;
      }
      if (changed) await tx.dungeonRun.update({ where: { id: runId }, data: { state: this.json(state) } });
      return this.renderPartyRun(state, profileId);
    });
  }

  private createRun(
    userId: number,
    dungeon: string,
    player: ReturnType<typeof UserView.renderCurrent>,
  ): DungeonRunState {
    const property = (name: StatType) => player.properties.find((entry) => entry.name === name)?.value ?? 0;
    const health = Math.max(1, property(StatType.HEALTH));
    const roles = DUNGEON_ROSTERS[dungeon] ?? DUNGEON_ROSTERS.EMBERDEEP;
    const opponents = roles.map((role, index) => {
      const generated = this.monsterGenerator.generate(player.level + (role.boss ? 4 : 2));
      return this.createOpponent(generated, role.name, role.image, role.health, role.damage, role.boss, index);
    });
    return {
      id: randomUUID(),
      dungeon,
      status: 'ACTIVE',
      startedAt: new Date().toISOString(),
      latestEvents: [],
      lastBattleResult: null,
      lastExperience: 0,
      totalExperience: 0,
      rewards: null,
      experienceBonusPercent:
        (player.activeBuffs.find(({ type }) => type === PlayerBuffType.EXPERIENCE)?.value ?? 0) +
        player.rewardBonuses.experiencePercent,
      goldBonusPercent: player.rewardBonuses.goldPercent,
      player: {
        name: player.name ?? `Player ${userId}`,
        health,
        maxHealth: health,
        damage: Math.max(1, property(StatType.DAMAGE)),
        defense: property(StatType.DEFENSE),
        dodge: property(StatType.DODGE),
        criticalChance: property(StatType.CRIT),
        criticalDamage: property(StatType.CRIT_DAMAGE),
      },
      opponents,
    };
  }

  private createOpponent(
    generated: GeneratedMonster,
    name: string,
    image: string,
    healthMultiplier: number,
    damageMultiplier: number,
    isBoss: boolean,
    index: number,
  ): DungeonOpponent {
    const attribute = (attributeName: string) =>
      generated.attributes.find((entry) => entry.attribute.name === attributeName)?.value ?? 0;
    const health = Math.round((40 + generated.level * 15 + attribute('ENDURANCE') * 10) * healthMultiplier);
    return {
      id: randomUUID(),
      monsterType: generated.monsterType ?? name,
      image,
      isBoss,
      status: isBoss ? 'LOCKED' : 'AVAILABLE',
      monster: {
        name,
        level: generated.level,
        health,
        maxHealth: health,
        damage: Math.ceil((3 + generated.level * 2 + attribute('STRENGTH')) * damageMultiplier),
        defense: Math.min(60, generated.level * 0.8 + attribute('ENDURANCE') + (isBoss ? 8 : 4)),
        dodge: Math.min(30, generated.level * 0.3 + attribute('AGILITY')),
        criticalChance: Math.min(30, 4 + generated.level * 0.25 + index),
        criticalDamage: isBoss ? 175 : 150,
        rewardGold: Math.max(1, Math.round(generated.rewardGold * (isBoss ? 2.5 : 1.25))),
        rewardExperience: Math.max(1, Math.round(generated.rewardExperience * (isBoss ? 2.5 : 1.5))),
      },
    };
  }

  private createPartyRun(
    id: string,
    dungeon: string,
    players: Array<ReturnType<typeof UserView.renderCurrent>>,
    profiles: Array<{ id: number; userId: number; level: number; user: { name: string } }>,
  ): DungeonRunState {
    const property = (player: ReturnType<typeof UserView.renderCurrent>, name: StatType) =>
      player.properties.find((entry) => entry.name === name)?.value ?? 0;
    const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    const totalHealth = players.reduce((sum, player) => sum + Math.max(1, property(player, StatType.HEALTH)), 0);
    const members = profiles.map((profile, index) => {
      const player = players[index];
      const health = Math.max(1, property(player, StatType.HEALTH));
      const mana = Math.max(0, property(player, StatType.MANA));
      return {
        profileId: profile.id,
        userId: profile.userId,
        name: profile.user.name,
        level: profile.level,
        leader: index === 0,
        health,
        maxHealth: health,
        mana,
        maxMana: mana,
        damage: Math.max(1, property(player, StatType.DAMAGE)),
        defense: property(player, StatType.DEFENSE),
        dodge: property(player, StatType.DODGE),
        criticalChance: property(player, StatType.CRIT),
        criticalDamage: property(player, StatType.CRIT_DAMAGE),
      };
    });
    const level = Math.max(...profiles.map((profile) => profile.level));
    const roles = DUNGEON_ROSTERS[dungeon] ?? DUNGEON_ROSTERS.EMBERDEEP;
    const opponents = roles.map((role, index) => {
      const generated = this.monsterGenerator.generate(level + (role.boss ? 4 : 2));
      return this.createOpponent(generated, role.name, role.image, role.health, role.damage, role.boss, index);
    });
    return {
      id,
      dungeon,
      status: 'ACTIVE',
      startedAt: new Date().toISOString(),
      player: {
        name: 'Dungeon party',
        health: totalHealth,
        maxHealth: totalHealth,
        damage: players.reduce((sum, player) => sum + property(player, StatType.DAMAGE), 0),
        defense: average(players.map((player) => property(player, StatType.DEFENSE))),
        dodge: average(players.map((player) => property(player, StatType.DODGE))),
        criticalChance: average(players.map((player) => property(player, StatType.CRIT))),
        criticalDamage: average(players.map((player) => property(player, StatType.CRIT_DAMAGE))),
      },
      opponents,
      latestEvents: [],
      lastBattleResult: null,
      lastExperience: 0,
      totalExperience: 0,
      experienceBonusPercent: average(players.map((player) => player.rewardBonuses.experiencePercent)),
      goldBonusPercent: average(players.map((player) => player.rewardBonuses.goldPercent)),
      rewards: null,
      party: {
        id,
        members,
      },
      partyRewards: {},
      partyTurn: 0,
    };
  }

  private renderParty(party: PartyWithMembers, currentProfileId: number): DungeonPartyView {
    return {
      id: party.id,
      dungeon: party.dungeon,
      status: party.status,
      isLeader: party.leaderProfileId === currentProfileId,
      members: party.members.map(({ gameProfile }) => ({
        profileId: gameProfile.id,
        userId: gameProfile.userId,
        name: gameProfile.user.name,
        level: gameProfile.level,
        leader: party.leaderProfileId === gameProfile.id,
      })),
    };
  }

  private ensurePartyCombatState(state: DungeonRunState) {
    if (!state.party?.members.length) return;
    const count = state.party.members.length;
    const healthRatio = state.player.maxHealth > 0 ? state.player.health / state.player.maxHealth : 1;
    for (const member of state.party.members) {
      member.maxHealth ??= Math.max(1, Math.round(state.player.maxHealth / count));
      member.health ??= Math.max(0, Math.round(member.maxHealth * healthRatio));
      member.maxMana ??= 0;
      member.mana ??= member.maxMana;
      member.damage ??= Math.max(1, Math.round(state.player.damage / count));
      member.defense ??= state.player.defense;
      member.dodge ??= state.player.dodge;
      member.criticalChance ??= state.player.criticalChance;
      member.criticalDamage ??= state.player.criticalDamage;
    }
    this.syncPartySummary(state);
  }

  private async hydratePartyCombatState(state: DungeonRunState) {
    if (
      !state.party ||
      state.party.members.every((member) => member.maxHealth !== undefined && member.maxMana !== undefined)
    ) {
      return false;
    }
    const healthRatio = state.player.maxHealth > 0 ? state.player.health / state.player.maxHealth : 1;
    for (const member of state.party.members) {
      const user = await this.usersService.findCurrentUser(member.userId);
      if (!user?.gameProfile) continue;
      const rendered = UserView.renderCurrent(user);
      const property = (name: StatType) => rendered.properties.find((entry) => entry.name === name)?.value ?? 0;
      const maxHealth = Math.max(1, property(StatType.HEALTH));
      const maxMana = Math.max(0, property(StatType.MANA));
      member.maxHealth = maxHealth;
      member.health = Math.max(0, Math.round(maxHealth * healthRatio));
      member.maxMana = maxMana;
      member.mana = maxMana;
      member.damage = Math.max(1, property(StatType.DAMAGE));
      member.defense = property(StatType.DEFENSE);
      member.dodge = property(StatType.DODGE);
      member.criticalChance = property(StatType.CRIT);
      member.criticalDamage = property(StatType.CRIT_DAMAGE);
    }
    this.ensurePartyCombatState(state);
    return true;
  }

  private partyMemberIsAlive(member: DungeonPartyMemberView | undefined) {
    return !!member && (member.health ?? 0) > 0;
  }

  private partyMemberCombatant(member: DungeonPartyMemberView): Combatant {
    return {
      name: member.name,
      health: member.health ?? 0,
      maxHealth: member.maxHealth ?? 1,
      damage: member.damage ?? 1,
      defense: member.defense ?? 0,
      dodge: member.dodge ?? 0,
      criticalChance: member.criticalChance ?? 0,
      criticalDamage: member.criticalDamage ?? 150,
    };
  }

  private syncPartySummary(state: DungeonRunState) {
    if (!state.party) return;
    state.player.health = state.party.members.reduce((sum, member) => sum + (member.health ?? 0), 0);
    state.player.maxHealth = state.party.members.reduce((sum, member) => sum + (member.maxHealth ?? 0), 0);
    state.player.damage = state.party.members
      .filter((member) => this.partyMemberIsAlive(member))
      .reduce((sum, member) => sum + (member.damage ?? 0), 0);
  }

  private renderPartyRun(state: DungeonRunState, profileId: number): DungeonRunState {
    if (!state.party) return state;
    return { ...state, rewards: state.partyRewards?.[String(profileId)] ?? null };
  }

  private async assertCanJoinParty(
    gameProfileId: number,
    dungeon: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const [membership, activeRun, visit] = await Promise.all([
      client.dungeonPartyMember.findUnique({ where: { gameProfileId } }),
      client.dungeonRun.findUnique({ where: { gameProfileId } }),
      client.dungeonVisit.findUnique({ where: { gameProfileId_dungeon: { gameProfileId, dungeon } } }),
    ]);
    if (membership) throw new BadRequestException('Leave the current dungeon party first');
    if (activeRun) throw new BadRequestException('Finish the active dungeon first');
    if (visit && visit.nextEntryAt > new Date()) {
      throw new BadRequestException('Dungeon is resting. You can enter once per hour.');
    }
  }

  private strike(
    attacker: Combatant,
    defender: Combatant,
    actor: DungeonEvent['actor'],
    events: DungeonEvent[],
    actorName?: string,
    targetName?: string,
  ) {
    if (Math.random() * 100 < defender.dodge) {
      events.push({ actor, damage: 0, critical: false, dodged: true, actorName, targetName });
      return;
    }
    const critical = Math.random() * 100 < attacker.criticalChance;
    const rawDamage = attacker.damage * (critical ? attacker.criticalDamage / 100 : 1);
    const damage = Math.max(1, Math.round(rawDamage * (1 - defender.defense / 100)));
    defender.health = Math.max(0, defender.health - damage);
    events.push({ actor, damage, critical, dodged: false, actorName, targetName });
  }

  private async awardCraftMaterials(
    tx: Prisma.TransactionClient,
    gameProfileId: number,
  ): Promise<DungeonCraftReward[]> {
    const dropCount = 1 + Math.floor(Math.random() * 3);
    const quantities = new Map<string, number>();
    for (let index = 0; index < dropCount; index++) {
      const code = pickCraftMaterialCode();
      quantities.set(code, (quantities.get(code) ?? 0) + 1);
    }

    const rewards: DungeonCraftReward[] = [];
    for (const [code, quantity] of quantities) {
      const material = await tx.craftItem.findUnique({ where: { code } });
      if (!material) continue;
      await tx.playerCraftItem.upsert({
        where: { gameProfileId_craftItemId: { gameProfileId, craftItemId: material.id } },
        create: { gameProfileId, craftItemId: material.id, quantity },
        update: { quantity: { increment: quantity } },
      });
      rewards.push({
        id: material.id,
        name: material.name,
        description: material.description,
        icon: material.icon,
        rarity: material.rarity,
        quantity,
      });
    }
    return rewards;
  }

  private parseState(state: Prisma.JsonValue): DungeonRunState {
    const parsed = state as unknown as DungeonRunState;
    const roster = DUNGEON_ROSTERS[parsed.dungeon];
    const memberCount = parsed.party?.members.length ?? 1;
    const calculatedTotalExperience = parsed.opponents
      .filter(({ status }) => status === 'DEFEATED')
      .reduce((sum, opponent) => {
        const total = Math.round(opponent.monster.rewardExperience * (1 + parsed.experienceBonusPercent / 100));
        return sum + (parsed.party ? Math.floor(total / memberCount) : total);
      }, 0);
    const totalExperience = parsed.totalExperience ?? calculatedTotalExperience;
    return {
      ...parsed,
      lastBattleResult: parsed.lastBattleResult ?? null,
      totalExperience,
      rewards: parsed.rewards ? { ...parsed.rewards, experience: parsed.rewards.experience ?? totalExperience } : null,
      partyRewards: parsed.partyRewards
        ? Object.fromEntries(
            Object.entries(parsed.partyRewards).map(([profileId, rewards]) => [
              profileId,
              { ...rewards, experience: rewards.experience ?? totalExperience },
            ]),
          )
        : parsed.partyRewards,
      opponents: parsed.opponents.map((opponent, index) => {
        const role = roster?.[index];
        if (!role || (opponent.image === role.image && opponent.monster.name === role.name)) {
          return opponent;
        }
        return {
          ...opponent,
          image: role.image,
          monster: { ...opponent.monster, name: role.name },
        };
      }),
    };
  }

  private json(state: DungeonRunState): Prisma.InputJsonValue {
    return state;
  }
}
