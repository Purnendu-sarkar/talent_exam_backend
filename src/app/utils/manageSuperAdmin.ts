import { Role } from '@prisma/client';
import prisma from '../../shared/prisma';
import config from '../../config';
import { normalizeEmail } from './email.utils';

export const ensureSuperAdmin = async () => {
  const superAdminEmail = normalizeEmail(config.super_admin.email);
  const superAdminName = config.super_admin.name;

  // 0. Ensure Database-level unique constraint for SUPER_ADMIN
  try {
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "super_admin_unique" 
      ON "users"("role") 
      WHERE role = 'SUPER_ADMIN';
    `);
  } catch (error) {
    console.warn('⚠️ Could not create partial unique index (may require manual migration):', error);
  }

  // 1. Check if ANY Super Admin already exists
  const existingSuperAdmin = await prisma.user.findFirst({
    where: {
      role: Role.SUPER_ADMIN,
    },
  });

  if (existingSuperAdmin) {
    if (normalizeEmail(existingSuperAdmin.email) !== superAdminEmail) {
      throw new Error(
        `❌ FATAL ERROR: Super Admin integrity violation. Existing Super Admin email (${existingSuperAdmin.email}) does not match SUPER_ADMIN_EMAIL config (${superAdminEmail}).`
      );
    }
    console.log('✅ Super Admin already exists:', existingSuperAdmin.email);
    return;
  }

  // 2. If no Super Admin exists, check if the configured email belongs to a normal user
  const existingUserWithEmail = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  if (existingUserWithEmail) {
    // We found a user with the super admin email, but they are NOT a SUPER_ADMIN.
    throw new Error(`❌ FATAL ERROR: SUPER_ADMIN_EMAIL (${superAdminEmail}) is already registered with a different role (${existingUserWithEmail.role}).`);
  }

  // 3. Email is free, create the Super Admin atomically
  const superAdmin = await prisma.user.create({
    data: {
      name: superAdminName,
      email: superAdminEmail,
      role: Role.SUPER_ADMIN,
    },
  });

  console.log('🚀 Super Admin created successfully:', superAdmin.email);
};
