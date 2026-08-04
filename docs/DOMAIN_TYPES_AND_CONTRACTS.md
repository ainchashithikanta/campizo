# College Hub: Domain Types & API Contracts Specification (MS-05)

## Document Overview

- **Project**: College Hub (Enterprise Multi-College Platform)
- **Document Title**: Canonical Domain Models & Versioned API Contracts
- **Document Version**: 1.0.0-FINAL
- **Package Reference**: `@college-hub/types`
- **Status**: Official Engineering Standard (MS-05 Complete)

---

## 1. Package Structure & Module Map

`@college-hub/types` serves as the single source of truth for all domain entities, Data Transfer Objects (DTOs), and versioned API response contracts across Web, Mobile, API, and background workers.

```
packages/types/src/
├── enums/             # Canonical domain enums (UserRole, SubscriptionTier, ModerationStatus)
├── constants/         # Immutably typed platform constants (page limits, file size caps)
├── utilities/         # Shared utility types (Paginated<T>, DeepPartial<T>, Brand<T, B>)
├── models/            # Core business domain entities (User, CollegeTenant, AuditLogRecord)
├── dtos/              # Data Transfer Objects (CreateUserDto, TenantContextDto)
├── api-contracts/     # Versioned API response envelopes (ApiV1Response<T>, ApiV2Response<T>)
├── validation/        # Validation issues & ModuleExtensionMap extension registry
└── index.ts           # Clean, circular-dependency-free barrel export
```

---

## 2. Versioned API Contracts Strategy

All API endpoints MUST wrap JSON payloads in standard, versioned response envelopes.

### API v1 Success Response (`ApiV1SuccessResponse<T>`)

```json
{
  "success": true,
  "data": {
    "id": "prof-101",
    "name": "Dr. Alan Turing",
    "department": "Computer Science"
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### API v1 Error Response (`ApiV1ErrorResponse`)

```json
{
  "success": false,
  "error": {
    "code": "MODULE_DISABLED",
    "message": "The Rate My Professor module is disabled for your college."
  }
}
```

---

## 3. Extension Point Governance (`ModuleExtensionMap`)

Future business modules extend platform type capabilities without altering existing core type files:

```typescript
import '@college-hub/types';

declare module '@college-hub/types' {
  interface ModuleExtensionMap {
    'ai-career-counselor': {
      careerSessionDto: { sessionId: string; prompt: string };
    };
  }
}
```

---

## 4. Type Safety Rules Across Web & Mobile

1. **Framework Independence**: `@college-hub/types` depends on ZERO framework libraries (no React, Next.js, Fastify, or Express imports).
2. **Nominal ID Branding**: Primary keys use branded string types (`UserId`, `CollegeId`) to prevent passing a `UserId` into a function expecting a `CollegeId` at compile time.
3. **Immutability**: Shared constants export with `as const` annotations.

---

_End of Domain Types Specification._
