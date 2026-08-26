// Example Prisma schema extension for User model with registration profile fields

model User {
  id         Int       @id @default(autoincrement())
  email      String    @unique
  password   String
  name       String
  country    String?   // optional
  city       String?   // optional
  gender     Gender?   // optional enum
  language   String?   // optional locale code

  @@index([email])
}

enum Gender {
  MALE
  FEMALE
  OTHER
}