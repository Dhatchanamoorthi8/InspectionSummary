import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('requests')
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get()
  async getRequests(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('partName') partName?: string,
    @Query('inspectorId') inspectorId?: string,
    @Query('reportResult') reportResult?: string,
  ) {
    return this.requestsService.findAll(user, {
      status,
      partName,
      inspectorId,
      reportResult,
    });
  }

  @Post()
  async createRequest(@Body() body: any, @CurrentUser() user: any) {
    return this.requestsService.create(body, user);
  }

  @Get(':id')
  async getRequestById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.requestsService.findById(id, user);
  }

  @Patch(':id/assign')
  async assignRequestPatch(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.assign(id, body?.inspectorId, body?.reason, user);
  }

  @Put(':id/reassign')
  async reassignRequestPut(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.assign(id, body?.inspectorId, body?.reason, user);
  }

  @Patch(':id/reassign')
  async reassignRequestPatch(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.requestsService.assign(id, body?.inspectorId, body?.reason, user);
  }

  @Patch(':id/start')
  async startInspection(@Param('id') id: string, @CurrentUser() user: any) {
    return this.requestsService.start(id, user);
  }

  @Patch(':id/cancel')
  async cancelInspection(@Param('id') id: string, @CurrentUser() user: any) {
    return this.requestsService.cancel(id, user);
  }

  @Delete(':id')
  async deleteRequest(@Param('id') id: string, @CurrentUser() user: any) {
    return this.requestsService.deleteRequest(id, user);
  }
}
