import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  async getSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('partName') partName?: string,
  ) {
    return this.reportsService.getHeatTreatmentSummary({ startDate, endDate, partName });
  }

  @Post()
  async submitReport(@Body() body: any, @CurrentUser() user: any) {
    return this.reportsService.submitReport(body, user);
  }

  @Get(':id/pdf')
  async getPdf(@Param('id') id: string, @Res() res: Response) {
    const { stream, requestNumber } = await this.reportsService.getPdfStream(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report_${requestNumber}.pdf"`,
    );
    stream.pipe(res);
  }

  @Post([':id/revisions', ':id/revision'])
  @HttpCode(HttpStatus.OK)
  async createRevision(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.reportsService.createRevision(id, body, user);
  }

  @Get(':id')
  async getReportById(@Param('id') id: string) {
    return this.reportsService.findById(id);
  }

  @Delete(':id')
  async deleteReport(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.reportsService.deleteReport(id, user, body?.reason);
  }
}
