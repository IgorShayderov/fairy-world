import { Injectable } from '@nestjs/common';

// This should be a real class/interface representing a user entity
export interface User {
  id: number;
  email: string;
  password: string;
}

@Injectable()
export class UsersService {
  private readonly users = [
    {
      id: 1,
      email: 'john@mail.ru',
      password: 'Qwerty123!',
    },
    {
      id: 2,
      email: 'maria@mail.ru',
      password: 'Qwerty123!',
    },
  ];

  async findOne(email: string): Promise<User | undefined> {
    return this.users.find((user) => user.email === email);
  }
}
