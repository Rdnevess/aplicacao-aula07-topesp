import { Role } from '../common/enums/role.enum.js';
import { User } from './entities/user.entity.js';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: Date;
}

/** Única forma em que um usuário sai da API: nunca com passwordHash. */
export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
  };
}
