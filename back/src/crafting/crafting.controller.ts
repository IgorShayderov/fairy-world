import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { ApplyUpgradeDto } from './dto/apply-upgrade.dto';
import { CraftingService } from './crafting.service';

@Controller('crafting')
@UseGuards(AuthGuard)
export class CraftingController {
  constructor(private readonly craftingService: CraftingService) {}

  @Get()
  getCrafting(@Req() req: RequestWithUser) {
    return this.craftingService.getCrafting(req.user.sub);
  }

  @Post('recipes/:recipeId/craft')
  craft(@Req() req: RequestWithUser, @Param('recipeId', ParseIntPipe) recipeId: number) {
    return this.craftingService.craft(req.user.sub, recipeId);
  }

  @Post('upgrades/apply')
  applyUpgrade(@Req() req: RequestWithUser, @Body() dto: ApplyUpgradeDto) {
    return this.craftingService.applyUpgrade(req.user.sub, dto.upgradeInventoryItemId, dto.inventoryItemId);
  }
}
