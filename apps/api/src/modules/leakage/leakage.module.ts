import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LeakageController } from './leakage.controller';
import { LeakageService } from './leakage.service';

@Module({
  imports: [PrismaModule],
  controllers: [LeakageController],
  providers: [LeakageService],
  exports: [LeakageService],
})
export class LeakageModule {}
