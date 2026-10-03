import { ConflictException, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { QueryFailedError, Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum.js';
import { User } from './entities/user.entity.js';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureAdmin();
  }

  /** Cria o administrador do .env se ainda não existir. Nunca altera um usuário existente. */
  async ensureAdmin(): Promise<void> {
    const email = this.config.getOrThrow<string>('ADMIN_EMAIL').trim().toLowerCase();
    if (await this.users.existsBy({ email })) return;
    await this.users.save(
      this.users.create({
        name: this.config.getOrThrow<string>('ADMIN_NAME'),
        email,
        passwordHash: await hash(this.config.getOrThrow<string>('ADMIN_PASSWORD'), 10),
        role: Role.Admin,
      }),
    );
    this.logger.log(`Administrador criado: ${email}`);
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async create(data: { name: string; email: string; passwordHash: string }): Promise<User> {
    try {
      return await this.users.save(this.users.create(data));
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException('E-mail já cadastrado');
      }
      throw error;
    }
  }
}
