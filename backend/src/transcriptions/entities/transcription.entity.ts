import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity('transcriptions')
export class Transcription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  user: User;

  @Column()
  originalFilename: string;

  @Column()
  mimeType: string;

  @Column('int')
  sizeBytes: number;

  @Column({ type: 'float', nullable: true })
  durationSeconds: number | null;

  @Column()
  language: string;

  @Column()
  model: string;

  @Column('text')
  text: string;

  @CreateDateColumn()
  createdAt: Date;
}
