import { Router } from 'express';
import authRoutes from '../modules/auth/auth.route';
import adminAuthRoutes from '../modules/adminAuth/adminAuth.route';

const router = Router();

const moduleRoutes: { path: string; route: Router }[] = [
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/admin-auth',
    route: adminAuthRoutes,
  }
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
