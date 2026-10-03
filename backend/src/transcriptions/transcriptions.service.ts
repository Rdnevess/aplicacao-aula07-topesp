import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import type { AudioFile } from './audio-file.js';
import { Transcription } from './entities/transcription.entity.js';
import { GroqClient } from './groq.client.js';
import { toTranscriptionResponse, type TranscriptionResponse } from './transcription-response.js';

@Injectable()
export class TranscriptionsService {
  constructor(
    @InjectRepository(Transcription) private readonly transcriptions: Repository<Transcription>,
    private readonly groq: GroqClient,
  ) {}

  async create(owner: User, file: AudioFile): Promise<TranscriptionResponse> {
    const result = await this.groq.transcribe(file);
    const saved = await this.transcriptions.save(
      this.transcriptions.create({
        user: owner,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        durationSeconds: result.durationSeconds,
        language: 'pt',
        model: result.model,
        text: result.text,
      }),
    );
    return toTranscriptionResponse(saved);
  }

  async findAllForOwner(owner: User): Promise<TranscriptionResponse[]> {
    const list = await this.transcriptions.find({
      where: { user: { id: owner.id } },
      order: { createdAt: 'DESC' },
    });
    return list.map(toTranscriptionResponse);
  }

  async findOneForOwner(owner: User, id: string): Promise<TranscriptionResponse> {
    return toTranscriptionResponse(await this.getOwned(owner, id));
  }

  async removeForOwner(owner: User, id: string): Promise<void> {
    await this.transcriptions.remove(await this.getOwned(owner, id));
  }

  // O filtro por dono fica na própria consulta: a de outro usuário é indistinguível de uma inexistente.
  private async getOwned(owner: User, id: string): Promise<Transcription> {
    const transcription = await this.transcriptions.findOne({ where: { id, user: { id: owner.id } } });
    if (!transcription) throw new NotFoundException('Transcrição não encontrada');
    return transcription;
  }
}
