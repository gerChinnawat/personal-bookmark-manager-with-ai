import { Module } from '@nestjs/common';
import { PrismaService } from './prisma-service/prisma.service';
import { CollectionRepository } from './collection/collection.repository';

@Module({
  providers: [PrismaService, CollectionRepository],
  exports: [CollectionRepository],
})
export class DatabaseModule {}
