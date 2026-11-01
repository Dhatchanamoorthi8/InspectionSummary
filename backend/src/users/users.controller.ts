import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/role.enum';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('inspectors')
  async getInspectors() {
    return this.usersService.findInspectors();
  }

  @Get('permissions')
  async getPermissions() {
    return this.usersService.getAllPermissions();
  }

  @Post('permissions')
  async createPermission(@Body() body: any, @CurrentUser() user: any) {
    if (user.role !== UserRole.ADMIN && (user.role !== UserRole.PRODUCTION_ENGINEER || !user.canManageUsers)) {
      throw new ForbiddenException('Forbidden: User management permission required to add system permissions');
    }
    return this.usersService.createPermission(body, user);
  }

  @Get()
  async getUsers(@CurrentUser() user: any) {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.PRODUCTION_ENGINEER) {
      throw new ForbiddenException('Forbidden: Quality Inspector cannot manage users');
    }
    return this.usersService.findAll();
  }

  @Post()
  async createUser(@Body() body: any, @CurrentUser() user: any) {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.PRODUCTION_ENGINEER) {
      throw new ForbiddenException('Forbidden: Quality Inspector cannot manage users');
    }
    if (user.role !== UserRole.ADMIN && !user.canManageUsers) {
      throw new ForbiddenException('Forbidden: User management permission required');
    }
    return this.usersService.create(body, user);
  }

  @Put(':id/permissions')
  async updateUserPermissions(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    if (user.role !== UserRole.ADMIN && (user.role !== UserRole.PRODUCTION_ENGINEER || !user.canManageUsers)) {
      throw new ForbiddenException('Forbidden: User management permission required to assign permissions');
    }
    return this.usersService.updateUserPermissions(id, body?.permissions, user);
  }

  @Put(':id/signature')
  async updateSignaturePut(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.usersService.updateSignature(id, body?.signatureData, user);
  }

  @Post(':id/signature')
  async updateSignaturePost(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.usersService.updateSignature(id, body?.signatureData, user);
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    if (user.role !== UserRole.ADMIN && (user.role !== UserRole.PRODUCTION_ENGINEER || !user.canManageUsers)) {
      throw new ForbiddenException('Forbidden: User management permission required');
    }
    return this.usersService.update(id, body, user);
  }

  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    if (user.role !== UserRole.ADMIN && (user.role !== UserRole.PRODUCTION_ENGINEER || !user.canManageUsers)) {
      throw new ForbiddenException('Forbidden: User management permission required');
    }
    return this.usersService.deleteUser(id, user);
  }
}
