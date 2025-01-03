import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RawBodyMiddleware } from './middlewares/raw-body.middleware';
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
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RawBodyMiddleware).forRoutes('api/shl/:id/file');
  }
}
