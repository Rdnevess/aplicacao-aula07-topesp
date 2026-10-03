import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { ACCEPTED_AUDIO_MIME_TYPES, MAX_AUDIO_BYTES, type AudioFile } from './audio-file.js';
import type { TranscriptionResponse } from './transcription-response.js';
import { TranscriptionsService } from './transcriptions.service.js';

@Controller('transcriptions')
@UseGuards(JwtAuthGuard)
export class TranscriptionsController {
  constructor(private readonly transcriptions: TranscriptionsService) {}

  @Get()
  list(@CurrentUser() user: User): Promise<TranscriptionResponse[]> {
    return this.transcriptions.findAllForOwner(user);
  }

  // Sem destino em disco, o multer guarda o arquivo só em memória; acima do limite, o Nest responde 413.
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_AUDIO_BYTES } }))
  create(
    @CurrentUser() user: User,
    @UploadedFile() file: AudioFile | undefined,
  ): Promise<TranscriptionResponse> {
    if (!file) throw new BadRequestException('Envie um arquivo de áudio no campo "file"');
    if (!ACCEPTED_AUDIO_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo não aceito. Envie mp3, m4a, wav, ogg, webm, flac, mp4 ou mpeg.');
    }
    return this.transcriptions.create(user, file);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TranscriptionResponse> {
    return this.transcriptions.findOneForOwner(user, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.transcriptions.removeForOwner(user, id);
  }
}
