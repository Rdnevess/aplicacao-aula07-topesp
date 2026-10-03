import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { User } from '../users/entities/user.entity.js';
import { toUserResponse, type UserResponse } from '../users/user-response.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash: await hash(dto.password, 10),
    });
    return this.buildResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByEmailWithPassword(dto.email);
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    if (!user.active) {
      throw new ForbiddenException('Conta desativada');
    }
    return this.buildResponse(user);
  }

  private async buildResponse(user: User): Promise<AuthResponse> {
    const payload: JwtPayload = { sub: user.id };
    return { user: toUserResponse(user), accessToken: await this.jwt.signAsync(payload) };
  }
}
