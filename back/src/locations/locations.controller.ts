import { Controller, Get, Post, UseGuards, Body, Request, Param, ParseIntPipe } from '@nestjs/common';
import { UpdateMapPositionDto } from '../users/dto/update-map-position.dto';
import { ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

import { LocationsService } from './locations.service';
import { AuthGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

export class SetLocationDto {
  @IsInt()
  @Min(1)
  locationId!: number;
}
export class RemoveItemBonusDto {
  @IsInt()
  @Min(0)
  expectedCost!: number;
  @IsInt()
  @Min(0)
  expectedGemCost!: number;
}
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('blacksmith')
  @UseGuards(AuthGuard)
  blacksmith(@Request() req: RequestWithUser) {
    return this.locationsService.blacksmith(req.user.sub);
  }

  @Post('blacksmith/items/:id/remove-bonus')
  @UseGuards(AuthGuard)
  removeBonus(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RemoveItemBonusDto,
  ) {
    return this.locationsService.removeItemBonus(req.user.sub, id, body.expectedCost, body.expectedGemCost);
  }

  @Post('sanctuaries/:id/blessing')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  bless(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() coordinates: UpdateMapPositionDto,
  ) {
    return this.locationsService.bless(req.user.sub, id, coordinates);
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiOkResponse({ description: 'List all locations' })
  findAll() {
    return this.locationsService.findAll();
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Current user's location" })
  getMyLocation(@Request() req: RequestWithUser) {
    return this.locationsService.getUserLocation(req.user.sub);
  }

  @Post('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Set current user location' })
  setMyLocation(@Request() req: RequestWithUser, @Body() body: SetLocationDto) {
    return this.locationsService.setUserLocation(req.user.sub, body.locationId);
  }
}
