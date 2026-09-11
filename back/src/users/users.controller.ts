import { Controller, UseGuards, Get, Request, NotFoundException, Put, Body, Delete, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { UserView } from './user.view';
import { EquipItemDto, EQUIPMENT_SLOTS, type EquipmentSlotId } from './dto/equip-item.dto';
import { AllocateAttributeDto } from './dto/allocate-attribute.dto';

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
    const user = await this.usersService.findCurrentUser(req.user.sub);

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return UserView.renderCurrent(user);
  }

  @Post('me/attributes')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  allocateAttribute(@Request() req: RequestWithUser, @Body() dto: AllocateAttributeDto) {
    return this.usersService.allocateAttribute(req.user.sub, dto);
  }

  @Put('me/equipment')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  equipItem(@Request() req: RequestWithUser, @Body() dto: EquipItemDto) {
    return this.usersService.equipItem(req.user.sub, dto);
  }

  @Delete('me/equipment/:slot')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  unequipItem(@Request() req: RequestWithUser, @Param('slot') slot: EquipmentSlotId) {
    if (!EQUIPMENT_SLOTS.includes(slot)) throw new NotFoundException('Equipment slot not found');
    return this.usersService.unequipItem(req.user.sub, slot);
  }
}
