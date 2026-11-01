import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('production')
  async getProductionDashboard(
    @Query('partName') partName?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.dashboardService.getProductionDashboard({ partName, fromDate, toDate });
  }

  @Get('inspector')
  async getInspectorDashboard(
    @CurrentUser() user: any,
    @Query('partName') partName?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.dashboardService.getInspectorDashboard(user, { partName, fromDate, toDate });
  }
}
