import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'flashmob123@gmail.com' },
    update: {},
    create: {
      email: 'flashmob123@gmail.com',
      password: 'Warcraft3exrg', // В реальном проекте пароль нужно хэшировать
    },
  });

  console.log('Сиды успешно выполнены:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
