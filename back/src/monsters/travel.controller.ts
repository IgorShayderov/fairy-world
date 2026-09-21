import { Body, Controller, Put, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { UpdateMapPositionDto } from '../users/dto/update-map-position.dto';
import { MonstersService } from './monsters.service';

@ApiTags('users')
@Controller('users')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class TravelController {
  constructor(private readonly monstersService: MonstersService) {}

  @Put('me/map-position')
  @ApiOkResponse({ description: 'Saves player movement and rolls the server-controlled terrain encounter chance' })
  updateMapPosition(@Request() req: RequestWithUser, @Body() position: UpdateMapPositionDto) {
    return this.monstersService.updateMapPositionAndRollEncounter(req.user.sub, position);
  }
}
