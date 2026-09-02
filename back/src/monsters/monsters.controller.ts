import { Controller, Get, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';

import { MonstersService } from './monsters.service';
import { AuthGuard } from '../auth/auth.guard';

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

  @Get(':id')
  @ApiOkResponse({ description: 'Monster by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.monstersService.findOne(id);
  }
}
