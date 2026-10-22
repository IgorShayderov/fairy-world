import { BadRequestException, Injectable, NotFoundException, HttpException } from '@nestjs/common';
import { FeedbackStatus, Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { FeedbackDto, FeedbackQueryDto, ReplyDto } from './feedback.dto';

const PAGE_SIZE = 20;
const overview = {
  id: true,
  category: true,
  rating: true,
  message: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { replies: true } },
} as const;
const detail = {
  ...overview,
  replies: {
    orderBy: { createdAt: 'asc' },
    select: { id: true, message: true, createdAt: true, admin: { select: { name: true } } },
  },
} as const;

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}
  private async atomic<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ['P2034', 'P2002'].includes(error.code) &&
          attempt < 3
        )
          continue;
        throw error;
      }
    }
  }

  async submit(userId: number, dto: FeedbackDto) {
    return this.atomic(async (tx) => {
      const previous = await tx.feedback.findUnique({ where: { id: dto.requestId } });
      if (previous) {
        if (previous.userId !== userId) throw new BadRequestException('Request ID already used');
        return { id: previous.id };
      }
      const count = await tx.feedback.count({ where: { userId, createdAt: { gt: new Date(Date.now() - 86400000) } } });
      if (count >= 5) throw new HttpException('You can send up to five feedback messages in 24 hours.', 429);
      return tx.feedback.create({
        data: { id: dto.requestId, userId, category: dto.category, rating: dto.rating, message: dto.message },
        select: { id: true },
      });
    });
  }

  async list(query: FeedbackQueryDto, userId?: number) {
    const where: Prisma.FeedbackWhereInput = {
      ...(userId !== undefined ? { userId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [entries, total] = await this.prisma.$transaction([
      this.prisma.feedback.findMany({
        where,
        select: { ...overview, ...(userId === undefined ? { user: { select: { name: true } } } : {}) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.feedback.count({ where }),
    ]);
    return { entries, total, page: query.page, pageSize: PAGE_SIZE };
  }

  async get(id: string, userId?: number) {
    const entry = await this.prisma.feedback.findFirst({
      where: { id, ...(userId !== undefined ? { userId } : {}) },
      select: { ...detail, ...(userId === undefined ? { user: { select: { name: true } } } : {}) },
    });
    if (!entry) throw new NotFoundException('Feedback not found');
    return entry;
  }

  async reply(adminId: number, id: string, dto: ReplyDto) {
    return this.atomic(async (tx) => {
      const previous = await tx.feedbackReply.findUnique({ where: { id: dto.requestId } });
      if (previous) {
        if (previous.feedbackId !== id || previous.adminId !== adminId)
          throw new BadRequestException('Request ID already used');
        return { id: previous.id };
      }
      const feedback = await tx.feedback.findUnique({ where: { id } });
      if (!feedback) throw new NotFoundException('Feedback not found');
      if (feedback.status === 'CLOSED') throw new BadRequestException('Reopen this feedback before replying');
      if ((await tx.feedbackReply.count({ where: { feedbackId: id } })) >= 100)
        throw new BadRequestException('This thread has reached its reply limit');
      const reply = await tx.feedbackReply.create({
        data: { id: dto.requestId, feedbackId: id, adminId, message: dto.message },
        select: { id: true },
      });
      await tx.feedback.update({ where: { id }, data: { status: FeedbackStatus.REPLIED } });
      return reply;
    });
  }

  async setStatus(id: string, status: FeedbackStatus) {
    const result = await this.prisma.feedback.updateMany({ where: { id }, data: { status } });
    if (!result.count) throw new NotFoundException('Feedback not found');
    return { success: true };
  }
}
