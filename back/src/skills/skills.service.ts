import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MonstersService } from '../monsters/monsters.service';
import { PLAYER_CLASSES, SKILLS, skillPoints, skillRanks, upgradeError } from './skills.catalog';

export const SKILL_RESET_GEMS = 500;

@Injectable()
export class SkillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly monsters: MonstersService,
  ) {}

  async get(userId: number) {
    const profile = await this.prisma.gameProfile.findUnique({ where: { userId }, include: { skillTree: true } });
    if (!profile) throw new NotFoundException('Game profile not found');
    const ranks = skillRanks(profile.skillTree?.class, profile.skillTree?.ranks);
    return {
      class: profile.skillTree?.class ?? null,
      ranks,
      points: skillPoints(profile.level, ranks),
      level: profile.level,
      gems: profile.gems,
      resetCost: SKILL_RESET_GEMS,
      classes: PLAYER_CLASSES,
      catalog: SKILLS,
      locked: this.monsters.hasActiveBattle(userId) || !!(await this.monsters.activeDungeon(userId)),
    };
  }

  async change(userId: number, command: { class?: string; skillId?: string; reset?: boolean }) {
    if (this.monsters.hasActiveBattle(userId) || (await this.monsters.activeDungeon(userId))) {
      throw new BadRequestException('Finish or leave your battle or dungeon before changing skills');
    }
    await this.prisma.$transaction(async (tx) => {
      const profile = await tx.gameProfile.findUnique({ where: { userId }, include: { skillTree: true } });
      if (!profile) throw new NotFoundException('Game profile not found');
      const tree = profile.skillTree;
      if (command.class !== undefined || command.reset) {
        const targetClass = command.reset ? tree?.class : command.class;
        if (!targetClass || !(PLAYER_CLASSES as readonly string[]).includes(targetClass))
          throw new BadRequestException('Unknown class');
        if (tree) {
          if (
            tree.class === targetClass &&
            skillPoints(profile.level, skillRanks(tree.class, tree.ranks)).spent === 0
          ) {
            throw new BadRequestException('No allocated skills to reset');
          }
          const paid = await tx.gameProfile.updateMany({
            where: { id: profile.id, gems: { gte: SKILL_RESET_GEMS } },
            data: { gems: { decrement: SKILL_RESET_GEMS } },
          });
          if (!paid.count) throw new BadRequestException(`Resetting skills costs ${SKILL_RESET_GEMS} gems`);
          const changed = await tx.gameProfileSkillTree.updateMany({
            where: { profileId: profile.id, version: tree.version },
            data: { class: targetClass, ranks: {}, version: { increment: 1 } },
          });
          if (!changed.count) throw new BadRequestException('Skills changed; refresh and try again');
        } else {
          await tx.gameProfileSkillTree.create({ data: { profileId: profile.id, class: targetClass } });
        }
      } else {
        if (!tree) throw new BadRequestException('Choose a class first');
        const ranks = skillRanks(tree.class, tree.ranks);
        const skill = SKILLS.find((entry) => entry.id === command.skillId);
        const error = upgradeError(skill, tree.class, profile.level, ranks);
        if (error || !skill) throw new BadRequestException(error ?? 'Unknown skill');
        const changed = await tx.gameProfileSkillTree.updateMany({
          where: { profileId: profile.id, version: tree.version },
          data: { ranks: { ...ranks, [skill.id]: (ranks[skill.id] ?? 0) + 1 }, version: { increment: 1 } },
        });
        if (!changed.count) throw new BadRequestException('Skills changed; refresh and try again');
      }
    });
    return this.get(userId);
  }
}
