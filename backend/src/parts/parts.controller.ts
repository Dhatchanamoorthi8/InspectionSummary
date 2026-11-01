import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { PartsService } from './parts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/role.enum';

@Controller('parts')
@UseGuards(JwtAuthGuard)
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  @Get('template')
  getTemplate(@Res() res: Response) {
    const csv = this.partsService.getTemplateCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="part_master_template.csv"');
    return res.status(HttpStatus.OK).send(csv);
  }

  @Get('names')
  async getNames() {
    return this.partsService.getDistinctNames();
  }

  @Get('numbers')
  async getNumbers(@Query('partName') partName?: string) {
    return this.partsService.getNumbers(partName);
  }

  @Post(['import/preview', 'import-preview'])
  @HttpCode(HttpStatus.OK)
  async previewImport(@Body() body: any, @CurrentUser() user: any) {
    if (user.role !== UserRole.PRODUCTION_ENGINEER) {
      throw new ForbiddenException('Forbidden: Quality Inspector cannot import parts');
    }
    return this.partsService.previewImport(body?.rows);
  }

  @Post(['import/commit', 'import-commit'])
  @HttpCode(HttpStatus.OK)
  async commitImport(@Body() body: any, @CurrentUser() user: any) {
    if (user.role !== UserRole.PRODUCTION_ENGINEER) {
      throw new ForbiddenException('Forbidden: Quality Inspector cannot commit parts');
    }
    return this.partsService.commitImport(body?.validRows, user);
  }

  @Get()
  async getParts(@Query('search') search?: string) {
    return this.partsService.findAll(search);
  }

  @Post()
  async createPart(@Body() body: any, @CurrentUser() user: any) {
    if (user.role !== UserRole.PRODUCTION_ENGINEER) {
      throw new ForbiddenException('Forbidden: Quality Inspector cannot manage parts');
    }
    return this.partsService.create(body?.partName, body?.partNumber, user);
  }

  @Post(':id/activate')
  async activatePart(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    if (user.role !== UserRole.PRODUCTION_ENGINEER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Forbidden: Quality Inspector cannot manage parts');
    }
    return this.partsService.activate(id, user);
  }

  @Delete(':id')
  async deletePart(
    @Param('id') id: string,
    @Query('permanent') permanent: string,
    @CurrentUser() user: any,
  ) {
    if (user.role !== UserRole.PRODUCTION_ENGINEER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Forbidden: Quality Inspector cannot manage parts');
    }
    return this.partsService.deactivate(id, user, permanent === 'true');
  }
}
