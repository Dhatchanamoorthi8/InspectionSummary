import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  @Public()
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body?.username, body?.password);
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    return { success: true, message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('auth/me')
  async getProfile(@CurrentUser() user: any) {
    return { user };
  }
}
