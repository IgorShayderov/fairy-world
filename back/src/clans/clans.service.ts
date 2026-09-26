import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ClanRole } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { CLAN_BANNERS } from './clan-banners';
import type { CreateClanDto } from './dto/create-clan.dto';

export const CLAN_MIN_LEVEL = 10;
export const CLAN_MAX_MEMBERS = 20;
export const CLAN_ACTIVITY_REWARDS = {
  monsterKill: 1,
  quest: 5,
  pvpVictory: 8,
  dungeon: 20,
} as const;

@Injectable()
export class ClansService {
  constructor(private readonly prisma: PrismaService) {}

  async listClans(userId: number) {
    const profile = await this.profileForUser(userId);
    const clans = await this.prisma.clan.findMany({
      orderBy: [{ activityPoints: 'desc' }, { createdAt: 'asc' }],
      take: 50,
      include: { _count: { select: { members: true } } },
    });

    return {
      canJoin: profile.level >= CLAN_MIN_LEVEL && !profile.clanMembership,
      minLevel: CLAN_MIN_LEVEL,
      maxMembers: CLAN_MAX_MEMBERS,
      clans: clans.map((clan) => ({
        id: clan.id,
        name: clan.name,
        tag: clan.tag,
        description: clan.description,
        activityPoints: clan.activityPoints,
        activeBannerCode: clan.activeBannerCode,
        memberCount: clan._count.members,
      })),
    };
  }

  async getLeaderboard(userId: number) {
    const profile = await this.profileForUser(userId);
    const clanIds = await this.prisma.clan.findMany({ select: { id: true } });
    for (const { id } of clanIds) await this.syncClanActivity(id);

    const clans = await this.prisma.clan.findMany({
      orderBy: [{ activityPoints: 'desc' }, { createdAt: 'asc' }],
      take: 50,
      include: { _count: { select: { members: true } } },
    });
    return clans.map((clan, index) => ({
      rank: index + 1,
      id: clan.id,
      name: clan.name,
      tag: clan.tag,
      activityPoints: clan.activityPoints,
      activeBannerCode: clan.activeBannerCode,
      memberCount: clan._count.members,
      isCurrent: profile.clanMembership?.clanId === clan.id,
    }));
  }

  async getMyClan(userId: number) {
    const profile = await this.profileForUser(userId);
    if (!profile.clanMembership) {
      return { clan: null, minLevel: CLAN_MIN_LEVEL, eligible: profile.level >= CLAN_MIN_LEVEL };
    }

    await this.syncClanActivity(profile.clanMembership.clanId);
    return {
      clan: await this.renderClan(profile.clanMembership.clanId, profile.id),
      minLevel: CLAN_MIN_LEVEL,
      eligible: true,
    };
  }

  async createClan(userId: number, dto: CreateClanDto) {
    const profile = await this.profileForUser(userId);
    this.assertEligible(profile);

    const duplicate = await this.prisma.clan.findFirst({
      where: { OR: [{ name: { equals: dto.name, mode: 'insensitive' } }, { tag: dto.tag }] },
      select: { id: true },
    });
    if (duplicate) throw new BadRequestException('A clan with this name or tag already exists');

    const clan = await this.prisma.clan.create({
      data: {
        name: dto.name,
        tag: dto.tag,
        description: dto.description,
        members: {
          create: this.memberBaseline(profile, ClanRole.LEADER),
        },
      },
      select: { id: true },
    });

    return this.renderClan(clan.id, profile.id);
  }

  async joinClan(userId: number, clanId: string) {
    const profile = await this.profileForUser(userId);
    this.assertEligible(profile);
    const clan = await this.prisma.clan.findUnique({
      where: { id: clanId },
      include: { _count: { select: { members: true } } },
    });
    if (!clan) throw new NotFoundException('Clan not found');
    if (clan._count.members >= CLAN_MAX_MEMBERS) throw new BadRequestException('This clan is full');

    await this.prisma.clanMember.create({ data: { clanId, ...this.memberBaseline(profile, ClanRole.MEMBER) } });
    return this.renderClan(clanId, profile.id);
  }

  async leaveClan(userId: number) {
    const membership = await this.membershipForUser(userId);
    const memberCount = await this.prisma.clanMember.count({ where: { clanId: membership.clanId } });
    if (membership.role === ClanRole.LEADER) {
      if (memberCount > 1) throw new BadRequestException('Transfer leadership or remove other members before leaving');
      await this.prisma.clan.delete({ where: { id: membership.clanId } });
      return { left: true, clanDisbanded: true };
    }
    await this.prisma.clanMember.delete({ where: { gameProfileId: membership.gameProfileId } });
    return { left: true, clanDisbanded: false };
  }

  async updateMemberRole(userId: number, targetProfileId: number, role: 'OFFICER' | 'MEMBER') {
    const actor = await this.membershipForUser(userId);
    if (actor.role !== ClanRole.LEADER) throw new ForbiddenException('Only the clan leader can change roles');
    if (actor.gameProfileId === targetProfileId)
      throw new BadRequestException('The leader role cannot be changed here');
    const target = await this.prisma.clanMember.findUnique({ where: { gameProfileId: targetProfileId } });
    if (!target || target.clanId !== actor.clanId) throw new NotFoundException('Clan member not found');
    await this.prisma.clanMember.update({ where: { gameProfileId: targetProfileId }, data: { role } });
    return this.renderClan(actor.clanId, actor.gameProfileId);
  }

  async removeMember(userId: number, targetProfileId: number) {
    const actor = await this.membershipForUser(userId);
    const target = await this.prisma.clanMember.findUnique({ where: { gameProfileId: targetProfileId } });
    if (!target || target.clanId !== actor.clanId) throw new NotFoundException('Clan member not found');
    if (target.role === ClanRole.LEADER) throw new BadRequestException('The clan leader cannot be removed');
    const canRemove =
      actor.role === ClanRole.LEADER || (actor.role === ClanRole.OFFICER && target.role === ClanRole.MEMBER);
    if (!canRemove) throw new ForbiddenException('You cannot remove this clan member');
    await this.prisma.clanMember.delete({ where: { gameProfileId: targetProfileId } });
    return this.renderClan(actor.clanId, actor.gameProfileId);
  }

  async getShop(userId: number) {
    const membership = await this.membershipForUser(userId);
    await this.syncClanActivity(membership.clanId);
    const clan = await this.prisma.clan.findUnique({
      where: { id: membership.clanId },
      include: { bannerUnlocks: true },
    });
    if (!clan) throw new NotFoundException('Clan not found');
    const unlocked = new Set(clan.bannerUnlocks.map((entry) => entry.bannerCode));
    return {
      activityPoints: clan.activityPoints,
      activeBannerCode: clan.activeBannerCode,
      canManage: membership.role === ClanRole.LEADER || membership.role === ClanRole.OFFICER,
      banners: CLAN_BANNERS.map((banner) => ({ ...banner, unlocked: unlocked.has(banner.code) })),
    };
  }

  async buyBanner(userId: number, bannerCode: string) {
    const membership = await this.membershipForUser(userId);
    this.assertCanManage(membership.role);
    const banner = CLAN_BANNERS.find((entry) => entry.code === bannerCode);
    if (!banner) throw new NotFoundException('Clan banner not found');
    await this.syncClanActivity(membership.clanId);

    await this.prisma.$transaction(async (tx) => {
      const clan = await tx.clan.findUnique({
        where: { id: membership.clanId },
        include: { bannerUnlocks: { where: { bannerCode } } },
      });
      if (!clan) throw new NotFoundException('Clan not found');
      if (clan.bannerUnlocks.length) throw new BadRequestException('This banner is already unlocked');
      if (clan.activityPoints < banner.cost) throw new BadRequestException('Not enough clan activity');
      await tx.clanBannerUnlock.create({ data: { clanId: clan.id, bannerCode } });
      await tx.clan.update({
        where: { id: clan.id },
        data: { activityPoints: { decrement: banner.cost }, activeBannerCode: bannerCode },
      });
    });
    return this.getShop(userId);
  }

  async equipBanner(userId: number, bannerCode: string) {
    const membership = await this.membershipForUser(userId);
    this.assertCanManage(membership.role);
    const unlocked = await this.prisma.clanBannerUnlock.findUnique({
      where: { clanId_bannerCode: { clanId: membership.clanId, bannerCode } },
    });
    if (!unlocked) throw new BadRequestException('Unlock this banner first');
    await this.prisma.clan.update({ where: { id: membership.clanId }, data: { activeBannerCode: bannerCode } });
    return this.getShop(userId);
  }

  private async syncClanActivity(clanId: string) {
    const members = await this.prisma.clanMember.findMany({
      where: { clanId },
      include: {
        gameProfile: { include: { _count: { select: { quests: { where: { completedAt: { not: null } } } } } } },
      },
    });
    const changes = members.map((member) => {
      const profile = member.gameProfile;
      const quests = profile._count.quests;
      const killsDelta = Math.max(0, profile.killedMonsters - member.trackedKilledMonsters);
      const dungeonsDelta = Math.max(0, profile.dungeonsCleared - member.trackedDungeonsCleared);
      const questsDelta = Math.max(0, quests - member.trackedQuestsCompleted);
      const pvpDelta = Math.max(0, profile.coinsOfHonour - member.trackedPvpVictories);
      const activity =
        killsDelta * CLAN_ACTIVITY_REWARDS.monsterKill +
        dungeonsDelta * CLAN_ACTIVITY_REWARDS.dungeon +
        questsDelta * CLAN_ACTIVITY_REWARDS.quest +
        pvpDelta * CLAN_ACTIVITY_REWARDS.pvpVictory;
      return { member, profile, quests, activity };
    });
    const total = changes.reduce((sum, change) => sum + change.activity, 0);
    if (!total) return;

    await this.prisma.$transaction(async (tx) => {
      for (const { member, profile, quests, activity } of changes) {
        await tx.clanMember.update({
          where: { gameProfileId: member.gameProfileId },
          data: {
            contributedActivity: { increment: activity },
            trackedKilledMonsters: profile.killedMonsters,
            trackedDungeonsCleared: profile.dungeonsCleared,
            trackedQuestsCompleted: quests,
            trackedPvpVictories: Math.max(member.trackedPvpVictories, profile.coinsOfHonour),
          },
        });
      }
      await tx.clan.update({ where: { id: clanId }, data: { activityPoints: { increment: total } } });
    });
  }

  private async renderClan(clanId: string, viewerProfileId: number) {
    const clan = await this.prisma.clan.findUnique({
      where: { id: clanId },
      include: {
        bannerUnlocks: true,
        members: {
          orderBy: [{ role: 'asc' }, { contributedActivity: 'desc' }, { joinedAt: 'asc' }],
          include: { gameProfile: { include: { user: { select: { name: true } } } } },
        },
      },
    });
    if (!clan) throw new NotFoundException('Clan not found');
    const viewer = clan.members.find((member) => member.gameProfileId === viewerProfileId);
    return {
      id: clan.id,
      name: clan.name,
      tag: clan.tag,
      description: clan.description,
      activityPoints: clan.activityPoints,
      activeBannerCode: clan.activeBannerCode,
      unlockedBannerCodes: clan.bannerUnlocks.map((entry) => entry.bannerCode),
      memberCount: clan.members.length,
      maxMembers: CLAN_MAX_MEMBERS,
      viewerRole: viewer?.role ?? null,
      viewerProfileId,
      activityRewards: CLAN_ACTIVITY_REWARDS,
      members: clan.members.map((member) => ({
        profileId: member.gameProfileId,
        name: member.gameProfile.user.name,
        level: member.gameProfile.level,
        role: member.role,
        contributedActivity: member.contributedActivity,
        joinedAt: member.joinedAt,
      })),
    };
  }

  private memberBaseline(profile: Awaited<ReturnType<ClansService['profileForUser']>>, role: ClanRole) {
    return {
      gameProfileId: profile.id,
      role,
      trackedKilledMonsters: profile.killedMonsters,
      trackedDungeonsCleared: profile.dungeonsCleared,
      trackedQuestsCompleted: profile._count.quests,
      trackedPvpVictories: profile.coinsOfHonour,
    };
  }

  private async profileForUser(userId: number) {
    const profile = await this.prisma.gameProfile.findUnique({
      where: { userId },
      include: {
        clanMembership: true,
        _count: { select: { quests: { where: { completedAt: { not: null } } } } },
      },
    });
    if (!profile) throw new NotFoundException('Game profile not found');
    return profile;
  }

  private async membershipForUser(userId: number) {
    const profile = await this.profileForUser(userId);
    if (!profile.clanMembership) throw new BadRequestException('You are not in a clan');
    return profile.clanMembership;
  }

  private assertEligible(profile: Awaited<ReturnType<ClansService['profileForUser']>>) {
    if (profile.level < CLAN_MIN_LEVEL) throw new ForbiddenException(`Clans unlock at level ${CLAN_MIN_LEVEL}`);
    if (profile.clanMembership) throw new BadRequestException('You are already in a clan');
  }

  private assertCanManage(role: ClanRole) {
    if (role !== ClanRole.LEADER && role !== ClanRole.OFFICER) {
      throw new ForbiddenException('Only clan leaders and officers can manage banners');
    }
  }
}
