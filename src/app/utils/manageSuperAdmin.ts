import { Role } from '@prisma/client';
import prisma from '../../shared/prisma';
import config from '../../config';

export const ensureSuperAdmin = async () => {
  const superAdminEmail = config.super_admin.email;
  const superAdminName = config.super_admin.name;

  // 1. Check if ANY Super Admin already exists
  const existingSuperAdmin = await prisma.user.findFirst({
    where: {
      role: Role.SUPER_ADMIN,
    },
  });

  if (existingSuperAdmin) {
    console.log('✅ Super Admin already exists:', existingSuperAdmin.email);
    return;
  }

  // 2. If no Super Admin exists, check if the configured email belongs to a normal user
  const existingUserWithEmail = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  if (existingUserWithEmail) {
    // We found a user with the super admin email, but they are NOT a SUPER_ADMIN.
    // We must NOT silently promote them. Fail safely.
    throw new Error(`❌ FATAL ERROR: SUPER_ADMIN_EMAIL (${superAdminEmail}) is already registered with a different role (${existingUserWithEmail.role}).`);
  }

  // 3. Email is free, create the Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      name: superAdminName,
      email: superAdminEmail,
      role: Role.SUPER_ADMIN,
    },
  });

  console.log('🚀 Super Admin created successfully:', superAdmin.email);
};
