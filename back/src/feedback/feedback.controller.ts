import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { AdminAuthGuard, type AdminRequest } from './admin-auth.guard';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto, FeedbackDto, FeedbackQueryDto, FeedbackStatusDto, ReplyDto } from './feedback.dto';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
@UseGuards(AuthGuard)
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}
  @Post()
  submit(@Req() req: RequestWithUser, @Body() dto: FeedbackDto) {
    return this.feedback.submit(req.user.sub, dto);
  }
  @Get()
  list(@Req() req: RequestWithUser, @Query() query: FeedbackQueryDto) {
    return this.feedback.list(query, req.user.sub);
  }
  @Get(':id')
  get(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.feedback.get(id, req.user.sub);
  }
}

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}
  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  login(@Body() dto: AdminLoginDto, @Req() req: Request) {
    return this.auth.login(dto.email, dto.password, req.ip ?? 'unknown');
  }
  @Get('me')
  @UseGuards(AdminAuthGuard)
  @Header('Cache-Control', 'no-store')
  me(@Req() req: AdminRequest) {
    return { id: req.admin.id, name: req.admin.name, email: req.admin.email };
  }
  @Post('logout')
  @UseGuards(AdminAuthGuard)
  logout(@Req() req: AdminRequest) {
    return this.auth.logout(req.admin.sessionId);
  }
}

@Controller('admin/feedback')
@UseGuards(AdminAuthGuard)
export class AdminFeedbackController {
  constructor(private readonly feedback: FeedbackService) {}
  @Get()
  list(@Query() query: FeedbackQueryDto) {
    return this.feedback.list(query);
  }
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.feedback.get(id);
  }
  @Post(':id/replies')
  reply(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReplyDto) {
    return this.feedback.reply(req.admin.id, id, dto);
  }
  @Post(':id/status')
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FeedbackStatusDto) {
    return this.feedback.setStatus(id, dto.status);
  }
}
