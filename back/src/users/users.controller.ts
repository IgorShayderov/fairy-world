import { Controller, UseGuards, Get, Request, NotFoundException } from '@nestjs/common';
import { ApiOkResponse, ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { UserView } from './user.view';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Returns the currently authenticated user',
  })
  async getCurrentUser(@Request() req: RequestWithUser) {
    const user = await this.usersService.findById(req.user.sub);

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return UserView.render(user);
  }
}
