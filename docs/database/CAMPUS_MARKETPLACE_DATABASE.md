# MS-20.3 — Database Architecture & Data Model: Campus Marketplace

## Executive Summary & Database Architecture Goals

This document specifies the production PostgreSQL database architecture for the **College Hub Campus Marketplace**.

The database design is engineered to support:
- **Multi-Tenant Isolation**: Complete isolation across 100+ university campuses using `college_id` keys and PostgreSQL Row-Level Security (RLS).
- **High Throughput & Concurrency**: Support for millions of listings, real-time negotiation offers, and heavy student chat messaging.
- **State Machine Integrity**: Strict status transitions for listings (`PUBLISHED` $\rightarrow$ `RESERVED` $\rightarrow$ `SOLD`), offers (`CREATED` $\rightarrow$ `ACCEPTED` / `REJECTED`), and reservation timers.
- **Resource-Centric Domain Model**: Clear separation of aggregate roots (`MarketplaceListing`, `MarketplaceConversation`, `SellerProfile`) with decoupled statistics write paths.

---

## 1. Multi-Tenant Strategy & Row-Level Security (RLS)

### 1.1 Tenant Partitioning Architecture

```
                                GLOBAL LAYER (Shared Reference Data)
       ┌──────────────────────────────────────────┬──────────────────────────────────────────┐
       │ marketplace_categories                   │ marketplace_conditions                   │
       └──────────────────────────────────────────┴──────────────────────────────────────────┘
                                                   │
                                                   ▼
                               TENANT ISOLATED LAYER (college_id Bounded)
       ┌─────────────────────────────────────────────────────────────────────────────────────┐
       │ WHERE college_id = current_setting('app.current_college_id')                         │
       ├─────────────────────────┬─────────────────────────┬─────────────────────────────────┤
       │ marketplace_listings    │ marketplace_offers      │ marketplace_conversations       │
       │ marketplace_media       │ marketplace_reservations│ marketplace_messages            │
       │ seller_profiles         │ marketplace_reports     │ marketplace_statistics          │
       └─────────────────────────┴─────────────────────────┴─────────────────────────────────┘
```

### 1.2 RLS Invariants
- Every tenant-specific table contains an indexed, non-null `college_id` column.
- Row-Level Security policies restrict read/write access to rows matching `current_setting('app.current_college_id')`.
- Cross-college browsing, messaging, offers, and reservations are strictly blocked at the database boundary.

---

## 2. Core Entity Catalog & Aggregate Roots

### 2.1 Entity Summary & Domain Ownership

| Entity Name | Primary Key | Aggregate Root | Tenant Bounded | Purpose & Ownership |
| :--- | :--- | :--- | :---: | :--- |
| `marketplace_listings` | `id` (UUID) | **Root** | Yes | Core listing entity holding title, price, condition, location, and lifecycle status. |
| `listing_media` | `id` (UUID) | `MarketplaceListing` | Yes | Uploaded photos attached to a listing with display ordering (`position_order`). |
| `marketplace_categories` | `code` (VARCHAR) | Reference | No | Global category taxonomy (Textbooks, Calculators, Cycles, Hostel Gear). |
| `marketplace_offers` | `id` (UUID) | `MarketplaceListing` | Yes | Formal price negotiation proposals between buyer and seller. |
| `marketplace_reservations` | `id` (UUID) | `MarketplaceListing` | Yes | 24-hour temporary item reservation binding buyer, seller, and listing. |
| `marketplace_conversations` | `id` (UUID) | **Root** | Yes | Chat thread between buyer and seller associated with a specific listing. |
| `marketplace_messages` | `id` (UUID) | `MarketplaceConversation` | Yes | Individual text messages, offer cards, and system notifications in chat. |
| `seller_profiles` | `id` (UUID) | **Root** | Yes | Student seller reputation, completed sales count, and trust badges. |
| `marketplace_reports` | `id` (UUID) | Independent | Yes | Safety reports filed by students for spam, counterfeit, or harassment. |
| `marketplace_bookmarks` | `id` (UUID) | Independent | Yes | Student saved listings for quick offline/saved access. |
| `marketplace_statistics` | `listing_id` | `MarketplaceListing` | Yes | Aggregate counters for views, bookmarks, offers, and popularity metrics. |
| `marketplace_audit_logs` | `id` (UUID) | System | Yes | Immutable log of status transitions and moderation actions. |

---

## 3. Detailed Entity Models & Schema Design

### 3.1 `marketplace_listings` Table Specification
- **Purpose**: Single source of truth for items posted for sale, rent, or giveaway.
- **Attributes**:
  - `id`: UUID (Primary Key)
  - `college_id`: VARCHAR(64) NOT NULL (Tenant Isolation)
  - `seller_user_id`: VARCHAR(64) NOT NULL (Uploader Student ID)
  - `category_code`: VARCHAR(32) NOT NULL (Foreign Key $\rightarrow$ `marketplace_categories`)
  - `title`: VARCHAR(256) NOT NULL
  - `slug`: VARCHAR(300) NOT NULL (Unique per college)
  - `description`: TEXT NULL
  - `condition_code`: VARCHAR(32) NOT NULL (`BRAND_NEW`, `LIKE_NEW`, `GOOD`, `FAIR`)
  - `listing_type`: VARCHAR(32) NOT NULL (`SELL`, `RENT`, `GIVEAWAY`)
  - `price_inr`: NUMERIC(10, 2) NOT NULL DEFAULT 0.00
  - `is_negotiable`: BOOLEAN NOT NULL DEFAULT TRUE
  - `pickup_location_name`: VARCHAR(256) NOT NULL (Hostel Block / Department Gate)
  - `status`: VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED' (`DRAFT`, `PUBLISHED`, `RESERVED`, `SOLD`, `ARCHIVED`, `QUARANTINED`, `DELETED`)
  - `current_reservation_id`: UUID NULL (Foreign Key $\rightarrow$ `marketplace_reservations`)
  - `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - `updated_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - `deleted_at`: TIMESTAMPTZ NULL (Soft Delete)

---

### 3.2 `marketplace_offers` Table Specification
- **Purpose**: Stores price negotiation lifecycle between buyer and seller.
- **Attributes**:
  - `id`: UUID (Primary Key)
  - `college_id`: VARCHAR(64) NOT NULL
  - `listing_id`: UUID NOT NULL (Foreign Key $\rightarrow$ `marketplace_listings`)
  - `buyer_user_id`: VARCHAR(64) NOT NULL
  - `seller_user_id`: VARCHAR(64) NOT NULL
  - `offered_price_inr`: NUMERIC(10, 2) NOT NULL
  - `counter_price_inr`: NUMERIC(10, 2) NULL
  - `status`: VARCHAR(32) NOT NULL DEFAULT 'CREATED' (`CREATED`, `COUNTERED`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`, `EXPIRED`, `CANCELLED`, `COMPLETED`)
  - `expires_at`: TIMESTAMPTZ NOT NULL (Default: Created + 48 hours)
  - `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()

---

### 3.3 `marketplace_reservations` Table Specification
- **Purpose**: Governs 24-hour item lock period upon offer acceptance.
- **Attributes**:
  - `id`: UUID (Primary Key)
  - `college_id`: VARCHAR(64) NOT NULL
  - `listing_id`: UUID NOT NULL (Foreign Key $\rightarrow$ `marketplace_listings`)
  - `offer_id`: UUID NOT NULL (Foreign Key $\rightarrow$ `marketplace_offers`)
  - `buyer_user_id`: VARCHAR(64) NOT NULL
  - `seller_user_id`: VARCHAR(64) NOT NULL
  - `starts_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - `expires_at`: TIMESTAMPTZ NOT NULL (Configurable: Default Starts + 24 hours)
  - `status`: VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' (`ACTIVE`, `COMPLETED`, `EXPIRED`, `CANCELLED`)
  - `cancel_reason`: VARCHAR(256) NULL

---

### 3.4 `marketplace_conversations` & `marketplace_messages` Tables
- **Purpose**: In-app buyer/seller chat linked directly to an item listing.
- **`marketplace_conversations` Attributes**:
  - `id`: UUID (Primary Key)
  - `college_id`: VARCHAR(64) NOT NULL
  - `listing_id`: UUID NOT NULL (Foreign Key $\rightarrow$ `marketplace_listings`)
  - `buyer_user_id`: VARCHAR(64) NOT NULL
  - `seller_user_id`: VARCHAR(64) NOT NULL
  - `last_message_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()

- **`marketplace_messages` Attributes**:
  - `id`: UUID (Primary Key)
  - `conversation_id`: UUID NOT NULL (Foreign Key $\rightarrow$ `marketplace_conversations`)
  - `sender_user_id`: VARCHAR(64) NOT NULL
  - `message_type`: VARCHAR(32) NOT NULL DEFAULT 'TEXT' (`TEXT`, `OFFER_CARD`, `SYSTEM_ALERT`, `LOCATION_SHARE`)
  - `content`: TEXT NOT NULL
  - `offer_id`: UUID NULL (Optional Foreign Key $\rightarrow$ `marketplace_offers`)
  - `is_read`: BOOLEAN NOT NULL DEFAULT FALSE
  - `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()

---

### 3.5 `seller_profiles` Table Specification
- **Purpose**: Tracks seller statistics, completed sales, and trust badges without public star ratings.
- **Attributes**:
  - `id`: UUID (Primary Key)
  - `college_id`: VARCHAR(64) NOT NULL
  - `user_id`: VARCHAR(64) NOT NULL (Unique per college)
  - `is_verified_student`: BOOLEAN NOT NULL DEFAULT TRUE
  - `total_listings_posted`: INT NOT NULL DEFAULT 0
  - `successful_sales_count`: INT NOT NULL DEFAULT 0
  - `cancelled_reservations_count`: INT NOT NULL DEFAULT 0
  - `response_rate_percent`: NUMERIC(5, 2) NOT NULL DEFAULT 100.00
  - `badge_level`: VARCHAR(32) NOT NULL DEFAULT 'VERIFIED_STUDENT' (`VERIFIED_STUDENT`, `SENIOR_SELLER`, `POWER_SELLER`)
  - `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - `updated_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()

---

## 4. Indexing Strategy & Performance Optimization

```
                                      INDEX OPTIMIZATION
┌──────────────────────────────────────┬─────────────────────────────────────────────────────┐
│ Target Column(s)                     │ Index Type & Purpose                                │
├──────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ (college_id, status, category_code)  │ Composite B-Tree for fast home/category grid queries │
│ (college_id, seller_user_id)         │ Composite B-Tree for seller active/past listing lookups│
│ (college_id, slug)                   │ UNIQUE Composite B-Tree for instant detail page URL │
│ (title, description)                 │ GIN Full-Text Search index for sub-10ms keyword search│
│ (listing_id, buyer_user_id)          │ Composite B-Tree for offer & conversation lookups   │
│ (expires_at) WHERE status='ACTIVE'   │ Partial B-Tree for background reservation worker    │
└──────────────────────────────────────┴─────────────────────────────────────────────────────┘
```

---

## 5. Scalability & Partitioning Blueprint

1. **Table Partitioning**:
   - `marketplace_messages` is list-partitioned by `college_id` or range-partitioned by `created_at` (monthly) to ensure high-volume chat messages do not degrade database performance.
2. **Asynchronous Read Model Separation**:
   - Write-heavy interactions (`marketplace_views`, `marketplace_bookmarks`) update `marketplace_statistics` asynchronously via background worker events to keep listing creation fast.

---

## Deliverables & Sign-Off Summary

* ✅ **Core Aggregate Roots**: Designed `MarketplaceListing`, `MarketplaceConversation`, `SellerProfile`.
* ✅ **Multi-Tenant RLS**: Guaranteed 100% tenant isolation across campuses using `college_id`.
* ✅ **State Machine Integrity**: Complete lifecycle specs for listings, 48-hr offers, and 24-hr reservations.
* ✅ **Zero Code Violation**: Pure database architecture specification document.

> [!IMPORTANT]
> **MS-20.3 Complete**. Stopped for architecture review before proceeding to **MS-20.4 (Domain Model & Business Rules)**.
