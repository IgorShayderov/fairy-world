import { Body, Controller, Get, Header, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard, type AdminRequest } from '../feedback/admin-auth.guard';
import { AdminUsersService } from './admin-users.service';
import {
  AdminUsersQueryDto,
  CreateAdminUserDto,
  GrantAdminItemDto,
  UpdateAdminItemDto,
  UpdateAdminUserDto,
} from './admin-users.dto';

@Controller('admin/users')
@UseGuards(AdminAuthGuard)
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Query() query: AdminUsersQueryDto) {
    return this.users.list(query);
  }
  @Get('items')
  @Header('Cache-Control', 'no-store')
  items(@Query() query: AdminUsersQueryDto) {
    return this.users.catalog(query);
  }
  @Get(':id')
  @Header('Cache-Control', 'no-store')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.users.get(id);
  }
  @Post()
  create(@Req() req: AdminRequest, @Body() dto: CreateAdminUserDto) {
    return this.users.create(req.admin.id, dto);
  }
  @Post(':id')
  update(@Req() req: AdminRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdminUserDto) {
    return this.users.update(req.admin.id, id, dto);
  }
  @Post(':id/inventory/add')
  grant(@Req() req: AdminRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: GrantAdminItemDto) {
    return this.users.grant(req.admin.id, id, dto);
  }
  @Post(':id/inventory/:entryId')
  inventory(
    @Req() req: AdminRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('entryId', ParseIntPipe) entryId: number,
    @Body() dto: UpdateAdminItemDto,
  ) {
    return this.users.inventory(req.admin.id, id, entryId, dto);
  }
}
