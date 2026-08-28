import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserModel } from '../../generated/prisma/models';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findOne(email: string): Promise<UserModel | null> {
    return this.prisma.user.findUnique({
      where: {
        email: email,
      },
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
