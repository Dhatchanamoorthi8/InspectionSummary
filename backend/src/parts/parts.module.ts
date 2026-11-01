import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartMaster } from './entities/part.entity';
import { PartsService } from './parts.service';
import { PartsController } from './parts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PartMaster])],
  controllers: [PartsController],
  providers: [PartsService],
  exports: [PartsService, TypeOrmModule],
})
export class PartsModule {}
