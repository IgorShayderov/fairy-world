import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserModel, UserWhereInput } from '../../generated/prisma/models';

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

  update(id: number, data: Partial<Omit<UserModel, 'id'>>) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
