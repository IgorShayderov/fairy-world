import { UserModel } from '../../generated/models';
import type { Prisma } from '../../generated/client';

type CurrentUserModel = Prisma.UserGetPayload<{
  include: { gameProfile: { include: { inventory: { include: { item: true } } } } };
}>;

// 1. Задаем строгий тип для возможных вариантов view.
// Это даст идеальный автокомплит при вызове метода.
export type UserViewType = 'default' | 'extended';

export class UserView {
  static renderCurrent(user: CurrentUserModel) {
    const profile = user.gameProfile;

    return {
      ...this.render(user),
      gold: profile?.gold ?? 0,
      experience: profile?.experience ?? 0,
      level: profile?.level ?? 1,
      inventory: profile?.inventory ?? [],
    };
  }

  static render(user: UserModel, view: UserViewType = 'default'): Partial<UserModel> {
    // 2. Базовые поля, которые отдаются всегда и везде (аналог корневых полей в Blueprinter)
    const base = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // 3. Формируем ответ в зависимости от выбранного view
    switch (view) {
      case 'extended':
        // Расширенный вид (например, для админки или личного кабинета)
        // Включает в себя всё из default + системную информацию
        return {
          ...this.render(user, 'default'),
        };

      case 'default':
      default:
        return base;
    }
  }

  // 4. Поддерживаем передачу view и для коллекций
  static renderCollection(users: UserModel[], view: UserViewType = 'default') {
    return users.map((user) => this.render(user, view));
  }
}
