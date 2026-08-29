import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User, Prisma } from '../../generated';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findBy(where: Prisma.UserWhereInput): Promise<User | null> {
    return this.prisma.user.findFirst({
      where,
    });
  }

  findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  update(id: number, data: Partial<Omit<User, 'id'>>) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
