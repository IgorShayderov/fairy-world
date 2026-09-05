import { Controller, Get, Param, UseGuards, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { ApiOkResponse, ApiBearerAuth, ApiNotFoundResponse } from '@nestjs/swagger';

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
  @ApiNotFoundResponse({ description: 'Monster not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    if (id <= 0) {
      throw new BadRequestException('Monster id must be a positive integer');
    }
    return this.monstersService.findOne(id);
  }
}
