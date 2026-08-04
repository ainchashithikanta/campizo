# MS-20.4 — Domain Model & Business Rules: Campus Marketplace

## Executive Summary & DDD Framework

This specification defines the Domain-Driven Design (DDD) model, Aggregate Root boundaries, State Machine transitions, Domain Invariants, Domain Events, and Typed Business Errors for the **College Hub Campus Marketplace**.

The domain logic is strictly deterministic, technology-agnostic, and independent of databases or HTTP transport layers.

---

## 1. Aggregate Roots & Boundaries

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ AGGREGATE ROOT 1: MarketplaceListing                                                   │
│   - Entities: ListingMedia                                                             │
│   - Value Objects: ListingPrice, ListingLocation, ListingCondition, CategoryCode       │
│   - Lifecycle: DRAFT ➔ PUBLISHED ➔ RESERVED ➔ SOLD / ARCHIVED / QUARANTINED              │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ AGGREGATE ROOT 2: MarketplaceConversation                                              │
│   - Entities: MarketplaceMessage (Immutable offer cards & text messages)               │
│   - Value Objects: ParticipantId, MessageType, OfferSnapshot                           │
│   - Invariant: Exactly 1 conversation per (ListingId, BuyerUserId) pair               │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ AGGREGATE ROOT 3: SellerProfile                                                        │
│   - Value Objects: ReputationScore, ResponseRate, TrustBadge                           │
│   - Invariant: Unique per (CollegeId, UserId) pair                                     │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ AGGREGATE ROOT 4: MarketplaceReservation                                               │
│   - Value Objects: ReservationPolicy, ExpiryTime                                       │
│   - Invariant: A reservation NEVER exists without an accepted offer                   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Entities vs Value Objects

| Symbol Name | Classification | Equality Identifier | Mutability | Domain Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| `MarketplaceListing` | **Aggregate Root** | `id` (ListingId) | Mutable | Governs item pricing, status lifecycle, media items, and reservation pointers. |
| `MarketplaceConversation` | **Aggregate Root** | `id` (ConversationId) | Mutable | Coordinates buyer-seller chat history and immutable offer card embedding. |
| `SellerProfile` | **Aggregate Root** | `userId` + `collegeId` | Mutable | Tracks completed sales count, response rate, and trust badge progression. |
| `MarketplaceReservation` | **Aggregate Root** | `id` (ReservationId) | Mutable | Manages 24-hour temporary item lock window created via an accepted offer. |
| `ListingMedia` | Entity | `id` (MediaId) | Mutable | Represents individual item photos with display sequence ordering. |
| `ListingPrice` | **Value Object** | Value equality (INR) | Immutable | Encapsulates currency amount (≥ ₹0.00) and negotiability flag. |
| `ListingLocation` | **Value Object** | Value equality | Immutable | Hostel Block / Campus Gate location description. |
| `Offer` | Entity | `id` (OfferId) | Mutable | Price negotiation state (`CREATED`, `COUNTERED`, `ACCEPTED`, `REJECTED`). |
| `TrustBadge` | **Value Object** | Code equality | Immutable | Deterministic badge level (`VERIFIED_STUDENT`, `SENIOR_SELLER`). |

---

## 3. Listing Lifecycle & State Machine

```
                  ┌───────────────┐
                  │     DRAFT     │
                  └───────┬───────┘
                          │ Publish
                          ▼
                  ┌───────────────┐
        ┌─────────┤   PUBLISHED   ├──────────┐
        │         └───────┬───────┘          │
        │ Reserve         │ Quarantined      │ Archive / Expire
        ▼                 ▼                  ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   RESERVED    │ │  QUARANTINED  │ │   ARCHIVED    │
└───────┬───────┘ └───────────────┘ └───────────────┘
        │ Complete Sale
        ▼
┌───────────────┐
│     SOLD      │
└───────────────┘
```

### 3.1 Legal State Transitions
- `DRAFT` $\rightarrow$ `PUBLISHED`
- `PUBLISHED` $\rightarrow$ `RESERVED` (Triggered ONLY by an accepted offer)
- `PUBLISHED` $\rightarrow$ `ARCHIVED` (By Seller)
- `PUBLISHED` $\rightarrow$ `QUARANTINED` (Triggered by 3+ Abuse Reports)
- `PUBLISHED` $\rightarrow$ `EXPIRED` (Auto-lapsed after listing duration)
- `PUBLISHED` $\rightarrow$ `DELETED` (Soft Delete)
- `RESERVED` $\rightarrow$ `PUBLISHED` (On Reservation Expiry or Cancellation)
- `RESERVED` $\rightarrow$ `SOLD` (On Successful Transaction Completion)

---

## 4. Offer Negotiation & Immutable Card Rules

- `CREATED` $\rightarrow$ `COUNTERED` (Seller proposes new price; appends NEW immutable counter card in chat)
- `CREATED` / `COUNTERED` $\rightarrow$ `ACCEPTED` (Creates Reservation & Locks Listing to `RESERVED`)
- `CREATED` / `COUNTERED` $\rightarrow$ `REJECTED` (Seller or Buyer declines)
- `CREATED` $\rightarrow$ `WITHDRAWN` (Buyer cancels pending offer)
- `CREATED` $\rightarrow$ `EXPIRED` (Auto-expires after 48 hours)

*Note*: Offer cards in chat are **100% immutable**. Original offer cards never change; counter offers and state transitions append new domain events into the conversation log.

---

## 5. Domain Invariants (Refined)

1. **Campus Isolation**: All operations (`browse`, `offer`, `chat`, `reserve`) must be restricted to matching `college_id`. Cross-college interactions are forbidden.
2. **Self-Purchase Prohibition**: A student cannot make an offer or purchase their own item listing (`seller_user_id != buyer_user_id`).
3. **Verified Student Requirement**: Only users with verified `@college.edu.in` credentials may publish listings or submit offers.
4. **Offer-Driven Reservation**: A reservation **NEVER** exists without an accepted offer (`Accepted Offer` $\rightarrow$ `Reservation Created` $\rightarrow$ `Listing Reserved`).
5. **Single Active Reservation Rule**: A listing can have at most **1 active reservation** (`current_reservation_id`) at any time.
6. **Flexible Offer Pricing (No Hard Minimum)**: There is **no minimum offer floor** enforced at the domain layer. Low offers trigger a UX advisory ("Offer is significantly below asking price"), allowing the seller full autonomy to accept, reject, or counter.
7. **Single Active Conversation Rule**: Exactly **1 active conversation thread** can exist between a specific buyer and seller for a given listing.
8. **Automated Quarantine Circuit Breaker**: If a listing receives **3 independent reports**, it automatically transitions to `QUARANTINED` status.

---

## 6. Domain Events Catalog

- `ListingCreated`: Emitted when a new listing draft is initialized.
- `ListingPublished`: Emitted when a listing goes live for campus discovery.
- `ListingReserved`: Emitted when an offer is accepted and item is locked.
- `ListingSold`: Emitted when a seller confirms physical handover and payment.
- `ListingArchived`: Emitted when a listing is archived.
- `ListingExpired`: Emitted when a listing reaches auto-expiry.
- `OfferCreated`: Emitted when a buyer submits a formal price offer.
- `OfferCountered`: Emitted when a seller submits a counter-offer.
- `OfferAccepted`: Emitted when an offer is accepted in chat.
- `ReservationCreated`: Emitted when a reservation is initialized from an accepted offer.
- `ReservationCancelled`: Emitted when a buyer/seller cancels an active reservation.
- `ReservationExpired`: Emitted when a 24-hour reservation window lapses.
- `ConversationCreated`: Emitted when a buyer initiates a chat thread.
- `MessageSent`: Emitted when a message or offer card is posted in chat.
- `StatisticsUpdated`: Emitted when view/bookmark counts are aggregated.

---

## 7. Typed Domain Errors

| Error Name | HTTP Status | Business Rationale |
| :--- | :---: | :--- |
| `SelfPurchaseNotAllowedError` | 403 Forbidden | Sellers cannot buy or vote on their own listings. |
| `CrossCollegeOperationError` | 403 Forbidden | Operations across different `college_id` boundaries are forbidden. |
| `ListingAlreadySoldError` | 409 Conflict | Item has already been sold to another buyer. |
| `ReservationExpiredError` | 409 Conflict | The 24-hour reservation window has lapsed. |
| `DuplicateOfferError` | 409 Conflict | An active pending offer already exists for this buyer/listing. |
| `InvalidStateTransitionError` | 400 Bad Request | Attempted illegal status transition (e.g. `SOLD` $\rightarrow$ `PUBLISHED`). |
| `ResourceNotFoundError` | 404 Not Found | Listing or conversation does not exist. |

---

## Deliverables & Sign-Off Summary

* ✅ **Flexible Offer Rule**: Removed hard 50% offer floor; converted to UX advisory.
* ✅ **Offer-Driven Reservation**: Guaranteed `Accepted Offer` $\rightarrow$ `Reservation Created` invariant.
* ✅ **Immutable Offer Cards**: Verified append-only chat conversation log.
* ✅ **Explicit Listing Transitions**: Fully documented `PUBLISHED` $\rightarrow$ `ARCHIVED` / `QUARANTINED` / `EXPIRED` / `RESERVED`.
* ✅ **Expanded Event Catalog**: Added `ReservationCreated`, `ReservationCancelled`, `ReservationExpired`, `ConversationCreated`.

> [!IMPORTANT]
> **MS-20.4 Approved with Refinements**. Ready for **MS-20.5 (API Contracts & DTO Specification)**.
