# MS-20.5 — API Contracts & DTO Specification: Campus Marketplace

## Executive Summary & API Principles

This document specifies the production REST API contracts, Data Transfer Objects (DTOs), request/response envelopes, header requirements, error codes, and validation rules for the **College Hub Campus Marketplace**.

The API architecture enforces:
- **Strict Multi-Tenant Isolation**: Mandatory `x-college-id` header on every request.
- **Idempotency Protection**: Mandatory `x-idempotency-key` header on all write operations (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Standard Envelopes**: Uniform `ApiV1Response<T>` success and error structures.
- **Immutable Negotiations**: Immutable offer cards appended directly into chat streams.
- **Offer-Driven Reservations**: Reservations are created exclusively when a seller accepts an offer card.

---

## 1. API Protocol & Standard Envelopes

### 1.1 Base URL & Versioning
- **Base URL**: `https://api.collegehub.edu.in/api/v1/marketplace`
- **Protocol**: HTTPS (TLS 1.3)

### 1.2 Mandatory Request Headers

| Header Name | Type | Requirement | Purpose |
| :--- | :--- | :--- | :--- |
| `Authorization` | `Bearer <JWT>` | Mandatory | Authenticates the student identity (`user_id`). |
| `x-college-id` | String (UUID/Slug) | Mandatory | Resolves tenant scope (e.g. `college-stanford-001`). Prevents cross-college requests. |
| `x-request-id` | String (UUID) | Mandatory | Traces distributed logs across system boundaries. |
| `x-idempotency-key` | String (UUID) | Mandatory (Writes) | Prevents duplicate offer, listing, or reservation requests. |

---

### 1.3 Standard Success & Error Envelopes

```json
// Success Response (HTTP 200 / 201)
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req-98765-abcd",
    "timestamp": "2026-08-03T14:05:00.000Z",
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 142,
      "totalPages": 8
    }
  }
}
```

```json
// Error Response (HTTP 4xx / 5xx)
{
  "success": false,
  "error": {
    "code": "SELF_PURCHASE_NOT_ALLOWED",
    "message": "Sellers cannot submit offers on their own listings.",
    "requestId": "req-98765-abcd",
    "timestamp": "2026-08-03T14:05:00.000Z"
  }
}
```

---

## 2. Listing REST APIs

### 2.1 List & Search Listings
- **HTTP Method**: `GET /api/v1/marketplace/listings`
- **Query Parameters**:
  - `query` (string, optional): Full-text keyword search.
  - `category` (string, optional): e.g. `textbooks`, `calculators`, `cycles`.
  - `condition` (string, optional): `BRAND_NEW`, `LIKE_NEW`, `GOOD`, `FAIR`.
  - `listingType` (string, optional): `SELL`, `RENT`, `GIVEAWAY`.
  - `minPrice` / `maxPrice` (number, optional): Price boundaries.
  - `page` (number, default: 1), `limit` (number, default: 20).
- **Response**: `ApiV1Response<ListingSummaryDto[]>`

---

### 2.2 Get Listing Detail
- **HTTP Method**: `GET /api/v1/marketplace/listings/:id`
- **Response**: `ApiV1Response<ListingDetailDto>`

---

### 2.3 Create Listing Draft & Publish
- **HTTP Method**: `POST /api/v1/marketplace/listings`
- **Request Body**:
  ```json
  {
    "title": "CASIO FX-991ES+ Scientific Calculator",
    "categoryCode": "calculators",
    "conditionCode": "LIKE_NEW",
    "listingType": "SELL",
    "priceInr": 900.00,
    "isNegotiable": true,
    "pickupLocationName": "Hostel Block 4 / Central Library Gate",
    "description": "Mint condition scientific calculator. Required for 1st year CSE lab.",
    "mediaIds": ["med-101", "med-102"]
  }
  ```
- **Response**: `ApiV1Response<ListingDetailDto>` (HTTP 201 Created)

---

### 2.4 Publish / Archive / Mark Sold / Delete Listing
- `PATCH /api/v1/marketplace/listings/:id/publish` $\rightarrow$ Transition to `PUBLISHED`.
- `PATCH /api/v1/marketplace/listings/:id/archive` $\rightarrow$ Transition to `ARCHIVED`.
- `POST /api/v1/marketplace/listings/:id/sold` $\rightarrow$ Transition to `SOLD`.
- `DELETE /api/v1/marketplace/listings/:id` $\rightarrow$ Soft Delete.

---

## 3. Offer & Negotiation REST APIs

### 3.1 Submit Offer
- **HTTP Method**: `POST /api/v1/marketplace/listings/:id/offers`
- **Request Body**:
  ```json
  {
    "offeredPriceInr": 750.00,
    "message": "Hi, can pick up from Library Gate today at 4 PM."
  }
  ```
- **Response**: `ApiV1Response<OfferDto>` (HTTP 201 Created)
- *Note*: If `offeredPriceInr` is significantly lower than asking price, response metadata includes a non-blocking UI warning advisory.

---

### 3.2 Counter Offer / Accept Offer / Reject Offer
- `POST /api/v1/marketplace/offers/:offerId/counter`
  - Body: `{ "counterPriceInr": 850.00 }`
- `POST /api/v1/marketplace/offers/:offerId/accept`
  - *Automated Trigger*: Creates a 24-hour `MarketplaceReservation` and locks listing status to `RESERVED`.
- `POST /api/v1/marketplace/offers/:offerId/reject`

---

## 4. Reservation REST APIs

- **`GET /api/v1/marketplace/reservations/:id`**: Returns current reservation status & countdown expiry.
- **`POST /api/v1/marketplace/reservations/:id/cancel`**: Seller or buyer cancels reservation; returns listing to `PUBLISHED`.
- **`POST /api/v1/marketplace/reservations/:id/complete`**: Seller confirms transaction completion; marks listing `SOLD`.
- *Note*: Direct client creation of reservations is disabled. Reservations can only be spawned via `POST /offers/:id/accept`.

---

## 5. Conversation & Chat REST APIs

- **`POST /api/v1/marketplace/conversations`**: Initiates a buyer-seller chat thread for a listing.
- **`GET /api/v1/marketplace/conversations`**: Lists active buyer/seller chat threads.
- **`GET /api/v1/marketplace/conversations/:id/messages`**: Retrieves message history (includes embedded immutable offer cards).
- **`POST /api/v1/marketplace/conversations/:id/messages`**: Sends a text message or shares location.

---

## 6. Seller Profile & Reputation REST APIs

- **`GET /api/v1/marketplace/sellers/:userId`**: Returns seller profile, trust badges (`VERIFIED_STUDENT`, `SENIOR_SELLER`), total sales count, and response rate.
- **`GET /api/v1/marketplace/sellers/:userId/listings`**: Lists active and past listings by seller.

---

## 7. Bookmark & Report REST APIs

- **`POST /api/v1/marketplace/listings/:id/bookmarks`**: Saves listing to user bookmarks.
- **`DELETE /api/v1/marketplace/listings/:id/bookmarks`**: Removes listing from bookmarks.
- **`POST /api/v1/marketplace/reports`**: Reports listing or conversation for abuse/fraud (3 reports trigger automated quarantine).

---

## 8. Upload Pre-Signed Session REST APIs

- **`POST /api/v1/marketplace/uploads/session`**:
  - Request Body: `{ "fileName": "calc.jpg", "fileSizeBytes": 1048576, "mimeType": "image/jpeg", "sha256Hash": "..." }`
  - Response: Returns `preSignedUploadUrl` for direct S3/MinIO upload.
- **`GET /api/v1/marketplace/uploads/:uploadId/status`**: Polls virus scan and media processing status.

---

## 9. Data Transfer Objects (DTOs) Summary

```typescript
export interface ListingSummaryDto {
  id: string;
  collegeId: string;
  sellerUserId: string;
  categoryCode: string;
  title: string;
  slug: string;
  conditionCode: 'BRAND_NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR';
  listingType: 'SELL' | 'RENT' | 'GIVEAWAY';
  priceInr: number;
  isNegotiable: boolean;
  pickupLocationName: string;
  status: 'PUBLISHED' | 'RESERVED' | 'SOLD' | 'ARCHIVED' | 'QUARANTINED';
  thumbnailUrl?: string;
  createdAt: string;
}

export interface ListingDetailDto extends ListingSummaryDto {
  description?: string;
  mediaList: ListingMediaDto[];
  sellerProfile: SellerProfileDto;
  statistics: MarketplaceStatisticsDto;
}

export interface OfferDto {
  id: string;
  listingId: string;
  buyerUserId: string;
  sellerUserId: string;
  offeredPriceInr: number;
  counterPriceInr?: number;
  status: 'CREATED' | 'COUNTERED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
}

export interface ReservationDto {
  id: string;
  listingId: string;
  offerId: string;
  buyerUserId: string;
  sellerUserId: string;
  startsAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
}

export interface SellerProfileDto {
  userId: string;
  collegeId: string;
  isVerifiedStudent: boolean;
  successfulSalesCount: number;
  responseRatePercent: number;
  badgeLevel: 'VERIFIED_STUDENT' | 'SENIOR_SELLER' | 'POWER_SELLER';
}
```

---

## 10. Error Code Catalogue

| HTTP Status | Error Code | Description |
| :---: | :--- | :--- |
| **403** | `SELF_PURCHASE_NOT_ALLOWED` | Student attempted to buy/vote on their own listing. |
| **403** | `CROSS_COLLEGE_OPERATION` | Request header `x-college-id` does not match resource college. |
| **409** | `LISTING_ALREADY_SOLD` | Item has already been sold. |
| **409** | `RESERVATION_EXPIRED` | 24-hour reservation window has lapsed. |
| **409** | `DUPLICATE_BOOKMARK` | Listing already present in bookmarks. |
| **409** | `DUPLICATE_REPORT` | User has already submitted a report for this listing. |
| **404** | `LISTING_NOT_FOUND` | Specified listing ID does not exist. |
| **400** | `INVALID_INPUT` | Zod DTO validation error. |

---

## Deliverables & Sign-Off Summary

* ✅ **Mandatory Headers**: Enforced `Authorization`, `x-college-id`, `x-request-id`, `x-idempotency-key`.
* ✅ **Standard Envelopes**: Uniform `ApiV1Response<T>` success/error JSON envelopes.
* ✅ **Refinements Incorporated**: No hard 50% offer floor constraint; reservations spawned exclusively via accepted offers; immutable offer history.
* ✅ **Zero Code / Schema Violation**: Pure API contract and DTO specification.

> [!IMPORTANT]
> **MS-20.5 Complete**. Stopped for architecture review before proceeding to **MS-20.6 (Technical Architecture & Technology Blueprint)**.
