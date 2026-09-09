import 'reflect-metadata';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../../typeorm.config';
import { User } from './entities/user.entity';

async function main() {
  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);
  const hashedPassword = await bcrypt.hash('123456', 10);

  const result = await userRepo.update(
    { email: 'user@nextmail.com' },
    { password: hashedPassword },
  );

  console.log('Rows updated:', result.affected);
  console.log('New hash:', hashedPassword);

  await AppDataSource.destroy();
}

main().catch((error) => {
  console.error('Reset failed:', error);
  process.exit(1);
});