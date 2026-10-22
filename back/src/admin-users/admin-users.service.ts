import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AttributeType, EquipmentType, ItemRarity, Prisma, StatType } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { ItemGeneratorService } from '../items/item-generator.service';
import { MonstersService } from '../monsters/monsters.service';
import { MAX_INVENTORY_SLOTS, STARTING_ATTRIBUTE_VALUE, STARTING_PROPERTIES } from '../users/player-defaults';
import { experienceToNextLevel, requiredPlayerLevel } from '../users/level-progression';
import { skillPoints, skillRanks, SKILLS } from '../skills/skills.catalog';
import { ItemView } from '../common/views/item.view';
import {
  AdminChangeDto,
  AdminUsersQueryDto,
  CreateAdminUserDto,
  GrantAdminItemDto,
  UpdateAdminItemDto,
  UpdateAdminUserDto,
} from './admin-users.dto';

const itemInclude = { attributes: { include: { attribute: true } }, stats: { include: { stat: true } } } as const;
// Never load password hashes, refresh tokens or password-reset credentials into admin responses/audits.
const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  gameProfile: {
    select: {
      id: true,
      level: true,
      experience: true,
      gold: true,
      gems: true,
      coinsOfHonour: true,
      freeAttributes: true,
      killedMonsters: true,
      dungeonsCleared: true,
      premiumAccount: true,
      skillTree: true,
      dungeonRun: { select: { id: true } },
      dungeonParty: { select: { partyId: true } },
      profileAttributes: { include: { attribute: true }, orderBy: { attributeId: 'asc' as const } },
      inventory: { include: { item: { include: itemInclude } }, orderBy: { id: 'asc' as const } },
    },
  },
} as const;
type AdminUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;
const stateToken = (user: AdminUser) => createHash('sha256').update(JSON.stringify(user)).digest('hex');
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly items: ItemGeneratorService,
    private readonly monsters: MonstersService,
  ) {}

  private async read(tx: Prisma.TransactionClient, id: number) {
    const user = await tx.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
  private async atomic<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
    try {
      return await this.prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002')
          throw new ConflictException('Email already exists or the inventory changed. Reload and try again.');
        if (error.code === 'P2034') throw new ConflictException('Player data changed. Reload the user before saving.');
      }
      throw error;
    }
  }
  private async editable(tx: Prisma.TransactionClient, id: number, dto: AdminChangeDto) {
    const user = await this.read(tx, id);
    if (!user.gameProfile) throw new BadRequestException('This account has no game profile');
    if (this.monsters.hasActiveBattle(id) || user.gameProfile.dungeonRun || user.gameProfile.dungeonParty)
      throw new ConflictException('The player must finish their battle or leave their dungeon party before editing.');
    if (stateToken(user) !== dto.expectedState)
      throw new ConflictException('Player data changed. Reload the user before saving.');
    return { user, profile: user.gameProfile };
  }
  private async audit(
    tx: Prisma.TransactionClient,
    adminId: number,
    userId: number,
    action: string,
    reason: string,
    before: AdminUser | null,
  ) {
    const after = await this.read(tx, userId);
    await tx.adminUserAudit.create({
      data: { adminId, userId, action, reason, ...(before ? { before: json(before) } : {}), after: json(after) },
    });
  }
  async list(query: AdminUsersQueryDto) {
    const q = query.q?.trim();
    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            ...(/^\d+$/.test(q) && Number(q) <= 2147483647 ? [{ id: Number(q) }] : []),
          ],
        }
      : {};
    const [entries, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (query.page - 1) * 20,
        take: 20,
        orderBy: { id: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          gameProfile: { select: { level: true, gold: true, gems: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { entries, total, page: query.page, pageSize: 20 };
  }
  async get(id: number) {
    const user = await this.read(this.prisma, id);
    const profile = user.gameProfile;
    const audits = await this.prisma.adminUserAudit.findMany({
      where: { userId: id },
      take: 20,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, action: true, reason: true, createdAt: true, admin: { select: { id: true, name: true } } },
    });
    return {
      ...user,
      stateToken: stateToken(user),
      locked: this.monsters.hasActiveBattle(id) || !!profile?.dungeonRun || !!profile?.dungeonParty,
      experienceToNextLevel: profile ? experienceToNextLevel(profile.level) : null,
      skillPoints: profile
        ? skillPoints(profile.level, skillRanks(profile.skillTree?.class, profile.skillTree?.ranks))
        : null,
      gameProfile: profile
        ? { ...profile, inventory: profile.inventory.map((entry) => ({ ...entry, item: ItemView.render(entry.item) })) }
        : null,
      audits,
    };
  }
  async create(adminId: number, dto: CreateAdminUserDto) {
    const password = await bcrypt.hash(dto.password, 10);
    const id = await this.atomic(async (tx) => {
      if (
        await tx.user.findFirst({
          where: { email: { equals: dto.email.trim(), mode: 'insensitive' } },
          select: { id: true },
        })
      )
        throw new ConflictException('A user with this email already exists');
      const inventory: Array<{ itemId: number; quantity: number; isEquiped: boolean; slot: string }> = [];
      for (const starter of [
        { baseItemName: 'Sword', equipmentType: EquipmentType.WEAPON, slot: 'left-hand' },
        { baseItemName: 'Shield', equipmentType: EquipmentType.SHIELD, slot: 'right-hand' },
      ]) {
        const item = await this.items.generate(
          {
            baseItemName: starter.baseItemName,
            equipmentType: starter.equipmentType,
            level: 1,
            rarity: ItemRarity.COMMON,
          },
          tx,
        );
        inventory.push({ itemId: item.id, quantity: 1, isEquiped: true, slot: starter.slot });
      }
      const user = await tx.user.create({
        data: {
          email: dto.email.trim().toLowerCase(),
          name: dto.name,
          password,
          role: 'USER',
          gameProfile: {
            create: {
              inventory: { create: inventory },
              profileAttributes: {
                create: Object.values(AttributeType).map((name) => ({
                  value: STARTING_ATTRIBUTE_VALUE,
                  attribute: { connect: { name } },
                })),
              },
              profileStats: {
                create: Object.values(StatType).map((name) => ({
                  value: STARTING_PROPERTIES[name],
                  stat: { connect: { name } },
                })),
              },
            },
          },
        },
        select: { id: true },
      });
      await this.audit(tx, adminId, user.id, 'CREATE_USER', dto.reason, null);
      return user.id;
    });
    return this.get(id);
  }
  async update(adminId: number, id: number, dto: UpdateAdminUserDto) {
    await this.atomic(async (tx) => {
      const { user, profile } = await this.editable(tx, id, dto);
      const next = experienceToNextLevel(dto.level);
      if (next === null ? dto.experience !== 0 : dto.experience >= next)
        throw new BadRequestException(
          next === null
            ? 'Level 100 must have 0 XP'
            : `XP must be less than ${next} at level ${dto.level}. Set the level explicitly.`,
        );
      const ranks = skillRanks(profile.skillTree?.class, profile.skillTree?.ranks);
      if (
        skillPoints(dto.level, ranks).spent > dto.level ||
        SKILLS.some((skill) => ranks[skill.id] && skill.requiredLevel > dto.level)
      )
        throw new BadRequestException('This level is too low for the learned skills. Reset skills in game first.');
      if (profile.inventory.some((entry) => entry.isEquiped && requiredPlayerLevel(entry.item.level) > dto.level))
        throw new BadRequestException('Unequip higher-level equipment before lowering the level.');
      if (
        await tx.user.findFirst({
          where: { id: { not: id }, email: { equals: dto.email, mode: 'insensitive' } },
          select: { id: true },
        })
      )
        throw new ConflictException('A user with this email already exists');
      await tx.user.update({
        where: { id },
        data: {
          name: dto.name,
          email: dto.email.toLowerCase(),
          ...(user.email !== dto.email.toLowerCase()
            ? { resetPasswordToken: null, resetPasswordExpires: null, hashedRefreshToken: null }
            : {}),
        },
      });
      await tx.gameProfile.update({
        where: { id: profile.id },
        data: {
          level: dto.level,
          experience: dto.experience,
          gold: dto.gold,
          gems: dto.gems,
          coinsOfHonour: dto.coinsOfHonour,
          freeAttributes: dto.freeAttributes,
        },
      });
      for (const attribute of dto.attributes) {
        const definition = await tx.attribute.findUniqueOrThrow({ where: { name: attribute.name } });
        await tx.profileAttribute.upsert({
          where: { gameProfileId_attributeId: { gameProfileId: profile.id, attributeId: definition.id } },
          create: { gameProfileId: profile.id, attributeId: definition.id, value: attribute.value },
          update: { value: attribute.value },
        });
      }
      await this.audit(tx, adminId, id, 'UPDATE_PROFILE', dto.reason, user);
    });
    return this.get(id);
  }
  async catalog(query: AdminUsersQueryDto) {
    const q = query.q?.trim();
    const where: Prisma.ItemWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            ...(/^\d+$/.test(q) && Number(q) <= 2147483647 ? [{ id: Number(q) }] : []),
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.item.findMany({
        where,
        include: itemInclude,
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * 20,
        take: 20,
      }),
      this.prisma.item.count({ where }),
    ]);
    return { entries: items.map((item) => ItemView.render(item)), total, page: query.page, pageSize: 20 };
  }
  async grant(adminId: number, id: number, dto: GrantAdminItemDto) {
    await this.atomic(async (tx) => {
      const { user, profile } = await this.editable(tx, id, dto);
      if (!(await tx.item.findUnique({ where: { id: dto.itemId }, select: { id: true } })))
        throw new NotFoundException('Item not found');
      const stack = profile.inventory.find(
        (entry) =>
          !entry.isEquiped && entry.itemId === dto.itemId && entry.upgradeType === null && entry.upgradeValue === null,
      );
      if (stack) {
        if (stack.quantity + dto.quantity > 9999) throw new BadRequestException('Maximum stack quantity is 9999');
        await tx.inventoryItem.update({ where: { id: stack.id }, data: { quantity: { increment: dto.quantity } } });
      } else {
        if (profile.inventory.filter((entry) => !entry.isEquiped).length >= MAX_INVENTORY_SLOTS)
          throw new BadRequestException('Backpack is full (24 slots)');
        await tx.inventoryItem.create({
          data: { gameProfileId: profile.id, itemId: dto.itemId, quantity: dto.quantity, isEquiped: false },
        });
      }
      await this.audit(tx, adminId, id, 'GRANT_ITEM', dto.reason, user);
    });
    return this.get(id);
  }
  async inventory(adminId: number, id: number, entryId: number, dto: UpdateAdminItemDto) {
    await this.atomic(async (tx) => {
      const { user, profile } = await this.editable(tx, id, dto);
      const entry = profile.inventory.find((item) => item.id === entryId);
      if (!entry) throw new NotFoundException('Inventory entry does not belong to this user');
      if (dto.action === 'remove') await tx.inventoryItem.delete({ where: { id: entry.id } });
      else if (dto.action === 'quantity') {
        if (dto.quantity === undefined || dto.quantity === null || (entry.isEquiped && dto.quantity !== 1))
          throw new BadRequestException('Set a quantity; equipped items must have quantity 1');
        await tx.inventoryItem.update({ where: { id: entry.id }, data: { quantity: dto.quantity } });
      } else {
        if (!entry.isEquiped) throw new BadRequestException('Item is already in the backpack');
        if (profile.inventory.filter((item) => !item.isEquiped).length >= MAX_INVENTORY_SLOTS)
          throw new BadRequestException('Backpack is full (24 slots)');
        await tx.inventoryItem.update({ where: { id: entry.id }, data: { isEquiped: false, slot: null } });
      }
      await this.audit(tx, adminId, id, `ITEM_${dto.action.toUpperCase()}`, dto.reason, user);
    });
    return this.get(id);
  }
}
