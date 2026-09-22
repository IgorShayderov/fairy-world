import {
  Body,
  Controller,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
  Post,
  Request,
} from '@nestjs/common';
import { ApiOkResponse, ApiBearerAuth, ApiNotFoundResponse } from '@nestjs/swagger';

import { MonstersService } from './monsters.service';
import { AuthGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@Controller('monsters')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class MonstersController {
  constructor(private readonly monstersService: MonstersService) {}

  @Get()
  @ApiOkResponse({ description: 'List all monsters' })
  findAll() {
    return this.monstersService.findAll();
  }

  @Get('dungeon/parties/:name')
  dungeonParties(@Param('name') name: string, @Request() req: RequestWithUser) {
    return this.monstersService.dungeonParties(req.user.sub, name);
  }

  @Post('dungeon/parties/:name')
  createDungeonParty(@Param('name') name: string, @Request() req: RequestWithUser) {
    return this.monstersService.createDungeonParty(req.user.sub, name);
  }

  @Post('dungeon/parties/:partyId/join')
  joinDungeonParty(@Param('partyId') partyId: string, @Request() req: RequestWithUser) {
    return this.monstersService.joinDungeonParty(req.user.sub, partyId);
  }

  @Post('dungeon/parties/:partyId/leave')
  leaveDungeonParty(@Param('partyId') partyId: string, @Request() req: RequestWithUser) {
    return this.monstersService.leaveDungeonParty(req.user.sub, partyId);
  }

  @Post('dungeon/parties/:partyId/start')
  startDungeonParty(@Param('partyId') partyId: string, @Request() req: RequestWithUser) {
    return this.monstersService.startDungeonParty(req.user.sub, partyId);
  }

  @Post('dungeon/:name')
  enterDungeon(@Param('name') name: string, @Request() req: RequestWithUser) {
    return this.monstersService.enterDungeon(req.user.sub, name);
  }

  @Post('dungeon/:name/reset')
  resetDungeon(@Param('name') name: string, @Request() req: RequestWithUser) {
    return this.monstersService.resetDungeon(req.user.sub, name);
  }

  @Get('dungeon/active')
  activeDungeon(@Request() req: RequestWithUser) {
    return this.monstersService.activeDungeon(req.user.sub);
  }

  @Post('dungeon/run/:runId/opponents/:opponentId/attack')
  attackDungeonOpponent(
    @Param('runId') runId: string,
    @Param('opponentId') opponentId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.monstersService.attackDungeonOpponent(req.user.sub, runId, opponentId);
  }

  @Post('dungeon/run/:runId/leave')
  leaveDungeon(@Param('runId') runId: string, @Request() req: RequestWithUser) {
    return this.monstersService.leaveDungeon(req.user.sub, runId);
  }

  @Post('dungeon/run/:runId/potions/:inventoryItemId/use')
  useDungeonHealthPotion(
    @Param('runId') runId: string,
    @Param('inventoryItemId', ParseIntPipe) inventoryItemId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.monstersService.useDungeonHealthPotion(req.user.sub, runId, inventoryItemId);
  }

  @Post('dungeon/run/:runId/loot/submit')
  submitDungeonPartyLoot(
    @Param('runId') runId: string,
    @Body('itemIds') itemIds: unknown,
    @Request() req: RequestWithUser,
  ) {
    return this.monstersService.submitDungeonPartyLoot(req.user.sub, runId, itemIds);
  }

  @Post('battle/:battleId/attack')
  attack(@Param('battleId') battleId: string, @Request() req: RequestWithUser) {
    return this.monstersService.attack(req.user.sub, battleId);
  }

  @Post('battle/:battleId/retreat')
  retreat(@Param('battleId') battleId: string, @Request() req: RequestWithUser) {
    return this.monstersService.retreat(req.user.sub, battleId);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Monster by id' })
  @ApiNotFoundResponse({ description: 'Monster not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    if (id <= 0) {
      throw new BadRequestException('Monster id must be a positive integer');
    }
    return this.monstersService.findOne(id);
  }
}
