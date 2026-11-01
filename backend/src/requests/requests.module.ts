import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectionRequest } from './entities/request.entity';
import { AssignmentHistory } from './entities/reassignment-history.entity';
import { PartMaster } from '../parts/entities/part.entity';
import { User } from '../users/entities/user.entity';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InspectionRequest,
      AssignmentHistory,
      PartMaster,
      User,
    ]),
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService, TypeOrmModule],
})
export class RequestsModule {}
