import { Controller, UseGuards, Get, Request } from '@nestjs/common';
import { ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Returns the currently authenticated user' })
  async getCurrentUser(@Request() req: RequestWithUser) {
    return this.usersService.findById(req.user.sub);
  }
}
