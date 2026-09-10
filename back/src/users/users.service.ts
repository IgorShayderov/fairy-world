import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserModel, UserWhereInput } from '../../generated/models';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findBy(where: UserWhereInput): Promise<UserModel | null> {
    return this.prisma.user.findFirst({
      where,
    });
  }

  findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findCurrentUser(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        gameProfile: {
          include: {
            inventory: {
              include: { item: true },
              orderBy: { id: 'asc' },
            },
          },
        },
      },
    });
  }

  update(id: number, data: Partial<Omit<UserModel, 'id'>>) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
