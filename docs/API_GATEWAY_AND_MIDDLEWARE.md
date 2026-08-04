# College Hub: API Gateway, Security Middleware & Request Pipeline (MS-17)

## Document Overview

- **Project**: College Hub (Enterprise Multi-College Platform)
- **Document Title**: Request Pipeline Architecture, Security Middleware & Error Handler Specification
- **Document Version**: 1.0.0-FINAL
- **Application Reference**: `apps/api`
- **Status**: Official API Architecture Standard (MS-17 Complete)

---

## 1. 16-Step Permanent Request Processing Pipeline

Every HTTP request entering the College Hub API monolith passes through 16 ordered security and context steps:

```mermaid
graph TD
    Step1[1. Request ID & Trace Correlation] --> Step2[2. Security Headers - Helmet]
    Step2 --> Step3[3. CORS Origin Validation]
    Step3 --> Step4[4. Request Body Size Limits - 1MB]
    Step4 --> Step5[5. Request Validation - Zod Schemas]
    Step5 --> Step6[6. Tenant Resolution - Custom Domain / Subdomain / Header]
    Step6 --> Step7[7. Authentication - Bearer Token Verification]
    Step7 --> Step8[8. Session Validation - Theft & Revocation Check]
    Step8 --> Step9[9. RBAC Authorization - PermissionEvaluator]
    Step9 --> Step10[10. Feature Flag Evaluation - Per-College Module Guards]
    Step10 --> Step11[11. Rate Limiting - IP / User / Tenant Limits]
    Step11 --> Step12[12. Anti-Brute-Force Protection]
    Step12 --> Step13[13. Request Logging - Structured JSON Logs]
    Step13 --> Step14[14. Audit Hooks - Security Event Logging]
    Step14 --> Step15[15. Response Transformation - Standard API Envelope]
    Step15 --> Step16[16. Global Exception Handler - Standardized Error Envelope]
```

---

## 2. Standardized API Response & Error Envelopes

### 2.1 Success Response Envelope

```json
{
  "success": true,
  "data": {
    "status": "OK"
  },
  "meta": {
    "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "timestamp": "2026-08-02T23:30:00.000Z"
  }
}
```

### 2.2 Error Response Envelope

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested endpoint does not exist.",
    "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
  }
}
```

---

## 3. Security & OWASP Alignment

- **Helmet HSTS & CSP**: Prevents Clickjacking (`X-Frame-Options: DENY`), MIME sniffing (`X-Content-Type-Options: nosniff`), and XSS injection via strict Content-Security-Policy headers.
- **Rate Limiting**: Protects against Denial-of-Service (DoS) attacks using multi-dimensional keys (`tenantId:userId:ipAddress`).
- **Correlation ID Propagation**: `x-request-id` is returned on every response header and propagated into `AsyncLocalStorage` for end-to-end trace correlation.

---

_End of API Gateway & Security Middleware Specification._
