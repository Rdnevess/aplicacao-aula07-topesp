import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transcription } from './entities/transcription.entity.js';
import { GroqClient } from './groq.client.js';
import { TranscriptionsController } from './transcriptions.controller.js';
import { TranscriptionsService } from './transcriptions.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Transcription])],
  controllers: [TranscriptionsController],
  providers: [TranscriptionsService, GroqClient],
})
export class TranscriptionsModule {}
