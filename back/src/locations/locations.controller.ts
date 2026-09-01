import { Controller, Get, Post, UseGuards, Body, Request } from '@nestjs/common';
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
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

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
