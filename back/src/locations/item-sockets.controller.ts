import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { ItemSocketsService } from './item-sockets';

export class SocketChangeDto {
  @IsIn(['add', 'remove', 'insert']) action!: 'add' | 'remove' | 'insert';
  @IsInt() @Min(0) expectedCost!: number;
  @IsInt() @Min(0) expectedGemCost!: number;
  @IsOptional() @IsString() @MaxLength(40) gemId?: string;
}
@Controller('locations/blacksmith/sockets')
@UseGuards(AuthGuard)
export class ItemSocketsController {
  constructor(private readonly sockets: ItemSocketsService) {}
  @Get() offer(@Req() req: RequestWithUser) {
    return this.sockets.offer(req.user.sub);
  }
  @Post(':id') change(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SocketChangeDto,
  ) {
    return this.sockets.change(req.user.sub, id, dto.action, dto);
  }
}
