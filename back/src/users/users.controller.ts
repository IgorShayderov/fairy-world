import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { UserView } from './user.view';
import { EquipItemDto, EQUIPMENT_SLOTS, type EquipmentSlotId } from './dto/equip-item.dto';
import { AllocateAttributeDto } from './dto/allocate-attribute.dto';
import { UpdateMapPositionDto } from './dto/update-map-position.dto';

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

  @Post('me/inventory/:inventoryItemId/consume')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  consumeInventoryItem(
    @Request() req: RequestWithUser,
    @Param('inventoryItemId', ParseIntPipe) inventoryItemId: number,
  ) {
    if (inventoryItemId <= 0) throw new BadRequestException('Inventory item id must be positive');
    return this.usersService.consumeInventoryItem(req.user.sub, inventoryItemId);
  }

  @Put('me/map-position')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  updateMapPosition(@Request() req: RequestWithUser, @Body() dto: UpdateMapPositionDto) {
    return this.usersService.updateMapPosition(req.user.sub, dto);
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
