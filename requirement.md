# Software Requirements Specification (SRS) & Technical Architecture Document
## Project: Talent Exam — Backend System

---

## 1. Project Overview & System Scope
**Talent Exam** is a scalable, lightweight, maintainable, and production-ready backend system designed for an India-based Course Mobile Application ecosystem with full compatibility for Next.js web clients and admin portals.

- **Application Name:** Talent Exam
- **Domain:** EdTech / Course & Examination Platform (India Region Focus)
- **Target Platforms:** Mobile Applications (iOS / Android) & Next.js Web Frontend / Admin Portals
- **Core Architecture Style:** Modular, Layered, Type-Safe RESTful API Architecture

---

## 2. User Roles & Access Control (RBAC)
The system enforces strict Role-Based Access Control across five distinct user roles:

| Role | Description | Access Scope |
| :--- | :--- | :--- |
| **User** | Default registered entity prior to specific student enrollment or profile finalization. | Base profile, public course browsing, onboarding. |
| **Student** | Enrolled candidate taking courses, quizzes, and exams. | Course consumption, exam attempts, progress tracking, certificates. |
| **Instructor** | Course creator and educator. | Course authoring, content management, assessment grading, analytics. |
| **Admin** | Operational manager. | User moderation, content moderation, course approvals, operational reports. |
| **Super Admin** | Highest system authority. | Global system configurations, Admin management, role escalation, critical audit logs. |

---

## 3. Technology Stack & Dependencies

### 3.1 Core Technologies
- **Runtime Environment:** Node.js (Latest LTS version)
- **Framework:** Express.js (v4.x / v5.x latest stable)
- **Language:** TypeScript (v5.x+) with strict type checking enabled (`strict: true`)
- **Database Engine:** PostgreSQL (v15+ / v16+)
- **Object-Relational Mapping (ORM):** Prisma ORM (Latest stable) with Prisma Client & Prisma Migrate
- **API Paradigm:** RESTful API with standardized JSON envelopes and HTTP status codes

### 3.2 Key Production Libraries & Dependencies
- **Validation:** Zod / Joi for declarative runtime schema validation
- **Authentication & Security:** `jsonwebtoken` (JWT), `bcryptjs` / `argon2` (where applicable), `helmet`, `cors`, `express-rate-limit`, `cookie-parser`
- **Email Service:** Nodemailer / AWS SES / SendGrid / Resend with templating engine for OTP delivery
- **Logging & Monitoring:** Winston / Pino logger with Morgan HTTP request logger
- **API Documentation:** OpenAPI 3.0 / Swagger UI (`swagger-ui-express`, `tsoa` or `swagger-jsdoc`)
- **Testing Suite:** Jest / Vitest, Supertest, `@prisma/client` mock utilities

---

## 4. Backend Modular Architecture & Folder Structure

### 4.1 Architectural Pattern
The application follows a **Modular Layered Architecture** ensuring Separation of Concerns (SoC), Single Responsibility Principle (SRP), and high reusability:
- **Routes Layer:** HTTP route declarations and middleware attachment.
- **Controller Layer:** Request parsing, calling service methods, formatting responses via `sendResponse`.
- **Validation Layer:** Request payload validation schemas before reaching controllers.
- **Service Layer:** Pure business logic and transactions.
- **Data Access Layer:** Prisma client queries and database interaction.
- **Interface/Type Layer:** Strongly typed data contracts.

### 4.2 Standard Directory Structure
```text
talent-exam-backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app.ts                 # Express application setup, middlewares, routes mounting
│   ├── server.ts              # Server bootstrap, listeners, graceful shutdown
│   ├── config/
│   │   └── index.ts           # Centralized environment variable loader
│   ├── app/
│   │   ├── modules/
│   │   │   ├── auth/          # User & Student/Instructor Auth (Email + OTP)
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.validation.ts
│   │   │   │   ├── auth.route.ts
│   │   │   │   └── auth.interface.ts
│   │   │   ├── adminAuth/     # Admin & Super Admin Dedicated Auth Module
│   │   │   │   ├── adminAuth.controller.ts
│   │   │   │   ├── adminAuth.service.ts
│   │   │   │   ├── adminAuth.validation.ts
│   │   │   │   └── adminAuth.route.ts
│   │   │   ├── user/          # User management (Profiles, Status, Block/Unblock)
│   │   │   ├── student/       # Student module
│   │   │   ├── instructor/    # Instructor module
│   │   │   ├── admin/         # Admin management module
│   │   │   └── otp/           # OTP generation, storage, hashing, throttling
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── validateRequest.ts
│   │   │   ├── globalErrorHandler.ts
│   │   │   └── notFoundHandler.ts
│   │   ├── routes/
│   │   │   └── index.ts       # Central Application Router
│   │   └── utils/
│   │       ├── catchAsync.ts
│   │       ├── sendResponse.ts
│   │       ├── jwtHelper.ts
│   │       ├── paginationHelper.ts
│   │       ├── pick.ts
│   │       └── emailHelper.ts
│   ├── errors/
│   │   ├── ApiError.ts
│   │   ├── handleZodError.ts
│   │   ├── handlePrismaError.ts
│   │   └── handleValidationError.ts
│   ├── types/
│   │   └── index.d.ts
│   └── docs/
│       └── swagger.json
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── tsconfig.json
├── package.json
└── README.md
```

---

## 5. Authentication & Authorization System

### 5.1 End-User Authentication (Email + OTP)
- **Passwordless Architecture:** Users do not register or log in using passwords.
- **Workflow:**
  1. **Request OTP:** Client posts `{ email }`.
  2. **OTP Generation & Security:**
     - 6-digit cryptographically secure numeric OTP generated.
     - OTP is hashed (e.g., SHA-256 / bcrypt) and saved with an expiration window (e.g., 5 minutes) and attempt counter.
     - Rate-limited to prevent flooding (e.g., max 3 OTP requests per 15 minutes per IP/email).
  3. **Delivery:** Dispatched via high-deliverability transactional email service.
  4. **Verify OTP:** Client sends `{ email, otp }`.
  5. **Account Provisioning:**
     - If the email is new, mandatory fields (`name`, `email`) are collected to provision the User/Student entity.
     - If existing, user state is checked (must not be `BLOCKED` or `DELETED`).
  6. **Token Issuance:**
     - **Access Token:** Short-lived JWT (e.g., 15m - 1h) containing `userId`, `email`, and `role`.
     - **Refresh Token:** Long-lived JWT / Secure Token (e.g., 30d) stored securely in HttpOnly, SameSite, Secure cookies or secured store.

### 5.2 Admin & Super Admin Authentication System
- **Segregated Auth Pipeline:** Admin and Super Admin authentication routes are strictly isolated under `/api/v1/admin-auth/` and **never** exposed on regular consumer auth routes.
- **Multi-Factor / Secure Credentials:** Admin/Super Admin authentication utilizes dedicated secure credential flows (e.g., Secure Password + Admin OTP 2FA or dedicated SSO).
- **Strict Authorization Guard:** Access to administrative endpoints is gated via granular role authorization middleware checking `Role.ADMIN` and `Role.SUPER_ADMIN`.

---

## 6. User Management & Data Models

### 6.1 Mandatory User Information
Every user record must contain:
- `name` (String, Required, Sanitized)
- `email` (String, Required, Unique, Lowercase, Validated)

### 6.2 Administrative User Operations
Admins and Super Admins can execute:
- **Block User / Unblock User:** Toggle user status (`ACTIVE`, `BLOCKED`, `SUSPENDED`). Blocked users are immediately revoked from active sessions.
- **Soft Delete:** Mark `isDeleted: true` and set `deletedAt = timestamp` while preserving historical transaction and exam integrity.
- **Role Assignment & Updates:** Super Admin capability to update user roles (`USER` -> `INSTRUCTOR` / `ADMIN`).
- **Profile Maintenance:** View paginated user lists with comprehensive filtering (by status, role, date registered, search term).

---

## 7. Configuration & Environment Management
All configuration is centralized inside `src/config/index.ts` using type-safe environment parsing.

```typescript
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  database_url: process.env.DATABASE_URL as string,
  jwt: {
    secret: process.env.JWT_SECRET as string,
    expires_in: process.env.JWT_EXPIRES_IN || '1d',
    refresh_secret: process.env.JWT_REFRESH_SECRET as string,
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  otp: {
    expiration_minutes: parseInt(process.env.OTP_EXPIRATION_MINUTES || '5', 10),
    max_attempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
  },
  email: {
    smtp_host: process.env.SMTP_HOST,
    smtp_port: parseInt(process.env.SMTP_PORT || '587', 10),
    smtp_user: process.env.SMTP_USER,
    smtp_pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'no-reply@talentexam.in',
  },
  client_url: process.env.CLIENT_URL || 'http://localhost:3000',
};
```

---

## 8. TypeScript & Type-Safety Guidelines
- **Strict Configuration:** `compilerOptions` with `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`.
- **Prisma Type Synchronization:** Use Prisma auto-generated models (e.g., `User`, `Role`, `Prisma.UserWhereInput`) across services.
- **Type-Safe Request Handlers:** Extend Express `Request` types to include authenticated user payload (`req.user: IAuthUser`).
- **Generic Utilities:** Implement generics on pagination helpers, query pickers, and response formatters.

---

## 9. Core Reusable Utilities & Design Patterns

### 9.1 Async Controller Wrapper (`catchAsync`)
Eliminates repetitive `try-catch` blocks across all controller functions:
```typescript
import { NextFunction, Request, RequestHandler, Response } from 'express';

export const catchAsync = (fn: RequestHandler) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};
```

### 9.2 Standardized Response Utility (`sendResponse`)
Ensures uniform REST API response envelopes:
```typescript
import { Response } from 'express';

interface IApiResponse<T> {
  statusCode: number;
  success: boolean;
  message?: string | null;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  data?: T | null;
}

export const sendResponse = <T>(res: Response, data: IApiResponse<T>): void => {
  res.status(data.statusCode).json({
    success: data.success,
    statusCode: data.statusCode,
    message: data.message || 'Operation executed successfully',
    meta: data.meta || null,
    data: data.data || null,
  });
};
```

### 9.3 Pagination Helper (`paginationHelper`)
Standardizes page, limit, skip, and sort calculations.

### 9.4 Dynamic Property Picker (`pick`)
Utility to extract allowed query parameters for filtering and search.

### 9.5 JWT Helper (`jwtHelper`)
Centralized token signing, verification, and decoding with standard error handling.

---

## 10. Error Handling & Exception Management

### 10.1 Global Error Handler
All unhandled errors flow through a single centralized middleware (`globalErrorHandler`) that formats responses into a consistent JSON shape:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation Error",
  "errorMessages": [
    {
      "path": "email",
      "message": "Invalid email address provided"
    }
  ],
  "stack": "development_only_stack_trace"
}
```

The error pipeline intercepts and normalizes:
1. **Zod/Validation Errors:** Maps validation schema violations to path-message arrays.
2. **Prisma Database Errors:** Maps `PrismaClientKnownRequestError` (e.g., P2002 Unique constraint, P2025 Record not found) to appropriate HTTP codes (400, 404, 409).
3. **Authentication & Authorization Errors:** Formats JWT expirations, signature invalidations, and 403 Forbidden errors.
4. **Operational Custom Errors:** Instances of `ApiError(statusCode, message)`.
5. **Generic & Internal Server Errors:** Sanitizes 500 internal server errors to avoid leaking database internals.

### 10.2 404 Not Found Handler
Intercepts all unmatched routes and returns a standard 404 JSON response.

---

## 11. Production Security & Infrastructure Hardening
- **Security Headers:** Enforced via `helmet()` with tailored Content Security Policies (CSP).
- **CORS Protection:** Configured with strict whitelist domains (mobile app origins and Next.js frontend domains).
- **Cookie Security:** `cookie-parser` configured with `httpOnly: true`, `secure: true` (in production), `sameSite: 'lax' / 'strict'`.
- **Data Sanitization:** Defense against parameter pollution, NoSQL/SQL injection, and XSS.
- **Audit Logging:** Administrative actions (block/unblock, deletion, role change) recorded with timestamp, admin ID, IP, and action payload.

---

## 12. Rate Limiting Strategy
Granular rate-limiting using `express-rate-limit`:

| Tier / Endpoint | Window | Max Requests | Purpose |
| :--- | :--- | :--- | :--- |
| **Global API Rate Limit** | 15 minutes | 1000 requests | Prevent DoS and abusive scraping |
| **OTP Request Route (`/auth/send-otp`)** | 15 minutes | 3 - 5 requests | Prevent SMS/Email spam and resource exhaustion |
| **OTP Verification (`/auth/verify-otp`)** | 15 minutes | 10 requests | Prevent brute-force OTP guessing |
| **Admin Login (`/admin-auth/login`)** | 15 minutes | 5 attempts | Protect administrative access against brute force |

---

## 13. Request Validation Pipeline
- Built using **Zod** middleware (`validateRequest(schema)`).
- Validates `req.body`, `req.query`, `req.params`, and `req.cookies` before passing control to the controller.
- Strips unauthorized/unknown properties automatically to maintain data purity.

---

## 14. Server Lifecycle, Startup & Graceful Shutdown

### 14.1 Server Startup Error Handling
The startup script (`server.ts`) wraps initialization inside an asynchronous bootstrap process:
- Validates database connection with Prisma (`prisma.$connect()`).
- Validates loaded environment variables.
- Catches startup exceptions and halts execution with descriptive logs.

### 14.2 Graceful Shutdown & Unhandled Exceptions
Handles operating system signals and Node runtime events to prevent data corruption:
- `SIGTERM` and `SIGINT` signals intercept:
  1. Stop accepting new incoming HTTP connections (`server.close()`).
  2. Allow active requests to finish processing (grace timeout: 10s).
  3. Safely disconnect Prisma client (`await prisma.$disconnect()`).
  4. Exit Node process cleanly (`process.exit(0)`).
- **Unhandled Promise Rejections & Uncaught Exceptions:**
  - `process.on('unhandledRejection', (error) => { ... })` logs the error, terminates open resources, and exits with code 1.
  - `process.on('uncaughtException', (error) => { ... })` immediately logs critical exception and safely terminates the process.

---

## 15. Next.js Frontend Integration & Caching Compatibility
The API is specifically tailored for Next.js (App Router / Pages Router) consumers:
- **Cache-Control & ETag Headers:** Responses return proper `ETag` and `Cache-Control` headers for static and semi-static course metadata.
- **On-Demand Cache Revalidation Support:**
  - When instructors or admins update courses, modules, or questions, backend triggers or emits webhook/events compatible with Next.js `revalidateTag()` and `revalidatePath()`.
- **Fast JSON Serialization:** Optimized response payloads with minimal nesting to ensure fast hydration on Next.js Server Components (RSC).
- **Cookie Forwarding & SSR Friendly Auth:** Standardized session cookies enabling seamless server-side authentication inside Next.js Server Actions and Route Handlers.

---

## 16. API Documentation Specification (OpenAPI / Swagger)
Interactive API documentation exposed at `/api-docs` using Swagger UI.

### Summary of Endpoint Modules:
1. **Auth Modules (`/api/v1/auth`)**
   - `POST /send-otp` - Request login/register OTP
   - `POST /verify-otp` - Validate OTP, receive JWT tokens
   - `POST /refresh-token` - Renew Access Token using Refresh Token
   - `POST /logout` - Invalidate session / clear refresh token cookie
2. **Admin Auth Modules (`/api/v1/admin-auth`)**
   - `POST /login` - Admin/Super Admin credential verification
   - `POST /verify-2fa` - Second factor authentication for Admin
3. **User & Profile Modules (`/api/v1/users`)**
   - `GET /me` - Get current user profile
   - `PATCH /me` - Update current user profile (Name, Avatar, Preferences)
4. **Admin User Management (`/api/v1/admin/users`)**
   - `GET /` - Paginated user listing with search, filtering, and sorting
   - `GET /:id` - Detailed user audit view
   - `PATCH /:id/status` - Block / Unblock user
   - `PATCH /:id/role` - Update user role (Super Admin only)
   - `DELETE /:id` - Soft delete user
5. **Student & Instructor Submodules (`/api/v1/students`, `/api/v1/instructors`)**
   - Domain-specific course management, test submissions, and instructor dashboard metrics.

---

## 17. Comprehensive Testing Strategy

### 17.1 Unit Testing
- Test isolated business logic in service classes (`auth.service.spec.ts`, `user.service.spec.ts`).
- Test reusable utilities (`jwtHelper`, `paginationHelper`, `pick`).
- Mock Prisma Client using `jest-mock-extended` or custom deep mocks.

### 17.2 Integration Testing
- Test database repository interactions using a dedicated PostgreSQL test container/database.
- Verify Prisma transactions (e.g., OTP validation + user creation + token record in a single transaction).

### 17.3 API & End-to-End (E2E) Testing
- Implemented with **Supertest** targeting the Express app instance:
  - **Happy Path:** Full OTP generation -> Verification -> Profile Retrieval -> Course Interaction.
  - **Security & RBAC:** Verifying that a Student cannot access `/admin/*` routes (403 Forbidden).
  - **Validation:** Asserting that invalid emails or missing parameters return structured 400 errors.
  - **Rate Limiting:** Asserting that exceeding 5 OTP attempts triggers 429 Too Many Requests.
  - **Error Edge Cases:** Handling simulated database disconnects and malformed JWTs.

---

## 18. Deliverables & Acceptance Criteria
- [x] Zero plain-text passwords stored or required for end-users (Pure Email + OTP).
- [x] Separate authentication routing and authorization for Admin and Super Admin.
- [x] Mandatory fields (`name`, `email`) strictly validated and enforced.
- [x] 100% Type-Safe codebase with no `any` leaks.
- [x] Production security, rate limiting, and HTTP header hardening configured.
- [x] Fully centralized error handling with normalized error shapes.
- [x] Clean graceful shutdown handling for zero-downtime deployments.
- [x] Next.js caching, tag revalidation compatibility, and Swagger API documentation ready.
