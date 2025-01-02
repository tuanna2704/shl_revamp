import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ShlController } from './shl.controller';
import { ShlService } from './shl.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
  ],
  controllers: [AppController, ShlController],
  providers: [AppService, ShlService, PrismaService],
})
export class AppModule {}
