import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../prisma.service';

export const CHAT_RETENTION_DAYS = 30;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ChatRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatRetentionService.name);
  private cleanupTimer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.removeStaleMessages();
    this.cleanupTimer = setInterval(() => {
      void this.removeStaleMessages().catch((error: unknown) => {
        this.logger.error('Unable to remove stale chat messages', error);
      });
    }, CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  async removeStaleMessages(now = new Date()) {
    const cutoff = new Date(now.getTime() - CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await this.prisma.message.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (result.count > 0) this.logger.log(`Removed ${result.count} stale chat message(s)`);
    return result.count;
  }
}
