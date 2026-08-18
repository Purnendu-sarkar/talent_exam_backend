# Software Requirements Specification (SRS) & Technical Architecture
## Project: Talent Exam — Backend System

**Version:** 1.1  
**Status:** Living Document  
**Last Updated:** 2026-08-18  
**Target Environment:** Production (India Region, EdTech)

---

## 1. Document Control & Purpose
This document is the single source of truth for the Talent Exam backend.  
All implementation, code review, and acceptance testing must strictly follow this specification.  
Any deviation requires explicit approval and an update to this document.

---

## 2. System Overview
- **Name:** Talent Exam Backend
- **Domain:** EdTech (Course + Examination Platform)
- **Clients:** Mobile (iOS/Android), Next.js Web, Admin Portal
- **Architecture:** Modular Layered RESTful API (Node.js + Express + TypeScript + Prisma + PostgreSQL)
- **Auth Model:** Passwordless (Email + OTP) for end-users; Segregated OTP flow for Admin/Super Admin

---

## 3. Non-Functional Requirements (Must Have)

| Category              | Requirement                                                                 | Priority |
|-----------------------|-----------------------------------------------------------------------------|----------|
| Security              | Helmet, CORS whitelist, Rate limiting, JWT, hashed OTP, anti-enumeration   | P0       |
| Type Safety           | TypeScript `strict: true`, no `any`, Prisma generated types only            | P0       |
| Error Handling        | Single global error handler, consistent JSON shape, no stack in production  | P0       |
| Observability         | Structured logging (Pino/Winston), request ID, correlation ID               | P0       |
| Reliability           | Graceful shutdown, Prisma connection management, health check endpoint      | P0       |
| Performance           | Global + route-level rate limits, pagination defaults, query optimization   | P1       |
| Documentation         | OpenAPI 3.0 + Swagger UI at `/api-docs`                                     | P1       |
| Testing               | Unit + Integration + E2E (Supertest) with ≥70% critical path coverage       | P1       |
| Deployment            | Zero-downtime friendly (graceful shutdown), env validation at startup       | P0       |

---

## 4. Role-Based Access Control (RBAC)

| Role         | Description                          | Can access Admin Auth? | Can manage users? | Can change roles? |
|--------------|--------------------------------------|------------------------|-------------------|-------------------|
| USER         | Default after OTP login              | No                     | No                | No                |
| STUDENT      | Enrolled learner                     | No                     | No                | No                |
| INSTRUCTOR   | Course creator                       | No                     | No                | No                |
| ADMIN        | Operational manager                  | Yes                    | Yes (limited)     | No                |
| SUPER_ADMIN  | Highest authority (exactly one)      | Yes                    | Yes               | Yes               |

**Rules:**
- Only one `SUPER_ADMIN` is allowed system-wide (enforced by partial unique index + seed integrity check).
- Admins **must** use `/api/v1/admin-auth/*`. Regular `/auth` must reject ADMIN/SUPER_ADMIN.
- Soft-deleted (`isDeleted: true`) and non-ACTIVE users cannot receive tokens.

---

## 5. Authentication Flows (Mandatory)

### 5.1 End-User Auth (`/api/v1/auth`)
1. `POST /send-otp` → rate limited → generate 6-digit OTP → hash → store → email
2. `POST /verify-otp` → verify → create user if new (role = USER) → issue Access Token
3. Future: `POST /refresh-token`, `POST /logout`

### 5.2 Admin Auth (`/api/v1/admin-auth`)
1. `POST /send-otp` → only if role is ADMIN or SUPER_ADMIN and status ACTIVE (anti-enumeration)
2. `POST /verify-otp` → issue token only for valid admin

**Security Rules:**
- OTP never stored in plain text
- Max attempts enforced
- Previous unused OTPs invalidated on new request
- Same error message for “user not found” and “invalid OTP” where possible

---

## 6. Core Modules & Acceptance Criteria

### Implemented (Current State)
- [x] Auth (User OTP)
- [x] Admin Auth (segregated)
- [x] OTP service (hash, expire, attempts, cleanup)
- [x] Email abstraction
- [x] Super Admin seed + integrity check
- [x] Global error handler + Zod + Prisma error mapping
- [x] Rate limiters defined
- [x] Auth middleware (role-based)

### Must Implement Next (Priority Order)
1. **Server bootstrap + Graceful Shutdown** (critical)
2. Apply Global Rate Limiter
3. User module (`GET /me`, `PATCH /me`)
4. Admin User Management (list, block/unblock, soft-delete, role change)
5. Refresh Token + Logout
6. Structured Logging
7. Health check endpoint (`GET /health`)
8. OpenAPI / Swagger
9. Soft-delete + status checks in every auth flow
10. Tests

---

## 7. Mandatory Technical Rules (Code Must Follow)

1. **Folder Structure** — Strict modular layout (routes → controller → service → validation)
2. **No business logic in controllers**
3. **All inputs validated with Zod** before controller
4. **All async controllers wrapped with `catchAsync`**
5. **All responses go through `sendResponse`** (except special cases like token-only response)
6. **Prisma client only from `shared/prisma.ts`**
7. **Config only from `config/index.ts`** (Zod validated at startup)
8. **Email always normalized** (`trim().toLowerCase()`)
9. **Never leak internal errors in production**
10. **JWT payload must contain:** `userId`, `email`, `role`
11. **SUPER_ADMIN creation only via seed**, never via API
12. **Partial unique index for SUPER_ADMIN** must live in Prisma migration, not only seed

---

## 8. Error Response Contract (Mandatory)

```json
{
  "success": false,
  "message": "Human readable message",
  "errorMessages": [
    { "path": "email", "message": "Invalid email address" }
  ],
  "stack": "only in development"
}
```

## 9. Rate Limiting Policy

| Scope                | Window |  Max |
| -------------------- | -----: | ---: |
| Global               | 15 min | 1000 |
| OTP Request (user)   | 15 min |    5 |
| OTP Verify (user)    | 15 min |   10 |
| Admin Auth endpoints | 15 min |    5 |

---

## 10. Environment Variables (Required)

All environment variables **must be validated with Zod at application startup**.

Missing critical variables must cause the application to terminate with:

```ts
process.exit(1);
```

### Required Variables

```env
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN
OTP_EXPIRATION_MINUTES
OTP_MAX_ATTEMPTS
SUPER_ADMIN_EMAIL
SUPER_ADMIN_NAME
```

### SMTP Settings

SMTP configuration is **optional in development** but should be configured for production environments.

---

## 11. Definition of Done

Every new feature must satisfy the following requirements:

* [ ] Zod validation schema implemented
* [ ] Service contains pure business logic
* [ ] Controller only orchestrates requests and responses
* [ ] Authentication middleware applied where required
* [ ] Rate limiter applied where required
* [ ] Consistent API response shape maintained
* [ ] Error cases covered using `ApiError`
* [ ] Soft-delete checks implemented where applicable
* [ ] Status checks implemented where applicable
* [ ] Unit or integration test added for the critical path
* [ ] Swagger/OpenAPI documentation updated
* [ ] No `any` types
* [ ] No `console.log` in production paths

---

## 12. Out of Scope — Current Phase

The following features are intentionally excluded from the current development phase:

* Payment gateway
* Course modules
* Exam modules
* Question modules
* Real-time notifications
* File upload / S3 integration
* Multi-tenancy

---

## 13. Next Immediate Action Items

Complete the following tasks in the specified order:

1. **Fix `server.ts`**

   * Implement application bootstrap
   * Add graceful shutdown
   * Connect Prisma properly

2. **Apply `globalLimiter` in `app.ts`**

3. **Add `GET /health` endpoint**

4. **Add structured logger**

5. **Implement User Module**

   * `GET /users/me`

6. **Implement Admin User Management**

7. **Add Refresh Token Flow**

8. **Write OpenAPI Specification**

9. **Add Tests**

   * Authentication
   * Admin Authentication
