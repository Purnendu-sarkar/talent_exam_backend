import dotenv from 'dotenv';
import path from 'path';
import prisma from '../src/shared/prisma';
import { ensureSuperAdmin } from '../src/app/utils/manageSuperAdmin';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function main() {
  await ensureSuperAdmin();
}

main()
  .catch((e) => {
    console.error('😈 Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
