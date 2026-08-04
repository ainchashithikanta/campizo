# MS-21.3 — Database Architecture & Data Model: Campus Confessions

## Executive Summary & Database Architecture Goals

This document specifies the production PostgreSQL database architecture for the **College Hub Campus Confessions** module.

The database design is engineered for:

- **Strict Multi-Tenant Isolation**: 100% isolation across university campuses using `college_id` keys and PostgreSQL Row-Level Security (RLS).
- **Blind Anonymous Identity Separation**: Complete database-level decoupling between student user identity records and confession text via an isolated `AnonymousIdentityService`.
- **Thread-Consistent Pseudonyms**: Mapping tables that maintain pseudonym continuity (e.g. OP = `Curious Panda #402`) within a single thread while generating fresh pseudonyms per post.
- **Severity-Prioritized Moderation**: Tables supporting blind moderation queues organized by flag severity (`Threats` $\rightarrow$ `Doxxing` $\rightarrow$ `Harassment`) with a dedicated moderation timeline audit trail.
- **Asynchronous Read Model (CQRS)**: Decoupled statistical read models (`confession_statistics`) updated asynchronously via domain events with multi-score metrics (`trending_score`, `hot_score`, `recent_score`, `controversial_score`).

---

## 1. Multi-Tenant Strategy & Row-Level Security (RLS)

### 1.1 Tenant Isolation Architecture

```
                                GLOBAL LAYER (Shared Reference Data)
       ┌──────────────────────────────────────────┬──────────────────────────────────────────┐
       │ confession_categories                    │ report_reasons                           │
       └──────────────────────────────────────────┴──────────────────────────────────────────┘
                                                   │
                                                   ▼
                               TENANT ISOLATED LAYER (college_id Bounded)
       ┌─────────────────────────────────────────────────────────────────────────────────────┐
       │ WHERE college_id = current_setting('app.current_college_id')                         │
       ├─────────────────────────┬─────────────────────────┬─────────────────────────────────┤
       │ confessions             │ confession_comments     │ confession_votes                │
       │ moderation_cases        │ moderation_actions      │ anonymous_thread_identities     │
       │ confession_bookmarks    │ confession_reports      │ confession_statistics           │
       └─────────────────────────┴─────────────────────────┴─────────────────────────────────┘
```

---

## 2. Core Entity Catalog & Aggregate Roots

### 2.1 Entity Summary & Domain Ownership

| Entity Name                   | Primary Key      | Aggregate Root      | Tenant Bounded | Purpose & Ownership                                                                          |
| :---------------------------- | :--------------- | :------------------ | :------------: | :------------------------------------------------------------------------------------------- |
| `confessions`                 | `id` (UUID)      | **Root**            |      Yes       | Core confession entity holding title, content, category, and lifecycle status.               |
| `confession_comments`         | `id` (UUID)      | `Confession`        |      Yes       | Threaded comments maintaining `depth`, `parent_comment_id`, and `root_comment_id`.           |
| `anonymous_thread_identities` | `id` (UUID)      | `Confession`        |      Yes       | Isolated mapping table accessed strictly by `AnonymousIdentityService`.                      |
| `confession_categories`       | `code` (VARCHAR) | Reference           |       No       | Global category taxonomy (`crush`, `academic`, `funny`, `advice`, `rant`, `confession`).     |
| `confession_votes`            | `id` (UUID)      | `Confession`        |      Yes       | Upvotes and downvotes registered on confessions.                                             |
| `comment_votes`               | `id` (UUID)      | `ConfessionComment` |      Yes       | Upvotes registered on individual comments.                                                   |
| `moderation_cases`            | `id` (UUID)      | **Root**            |      Yes       | Moderation review cases organized by severity level.                                         |
| `moderation_actions`          | `id` (UUID)      | `ModerationCase`    |      Yes       | Immutable log of moderator decisions (`APPROVE`, `QUARANTINE`).                              |
| `confession_bookmarks`        | `id` (UUID)      | Independent         |      Yes       | Student saved confessions for quick offline access.                                          |
| `confession_reports`          | `id` (UUID)      | Independent         |      Yes       | Community abuse reports filed by students.                                                   |
| `confession_statistics`       | `confession_id`  | `Confession`        |      Yes       | Read model storing `trending_score`, `hot_score`, `recent_score`, and `controversial_score`. |
| `confession_audit_logs`       | `id` (UUID)      | System              |      Yes       | Immutable audit log of administrative actions without user identity exposure.                |

---

## 3. Detailed Entity Models & Schema Design

### 3.1 `confessions` Table Specification

- **Purpose**: Main aggregate root for anonymous student confessions.
- **Attributes**:
  - `id`: UUID (Primary Key)
  - `college_id`: VARCHAR(64) NOT NULL (Tenant Isolation)
  - `category_code`: VARCHAR(32) NOT NULL (Foreign Key $\rightarrow$ `confession_categories`)
  - `title`: VARCHAR(256) NOT NULL
  - `slug`: VARCHAR(300) NOT NULL (Unique per college)
  - `content`: TEXT NOT NULL
  - `author_thread_pseudonym`: VARCHAR(64) NOT NULL (e.g. `Curious Panda #402`)
  - `status`: VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED' (`DRAFT`, `PUBLISHED`, `QUARANTINED`, `ARCHIVED`, `DELETED`)
  - `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - `updated_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - `deleted_at`: TIMESTAMPTZ NULL (Soft Delete)

---

### 3.2 `anonymous_thread_identities` Table Specification (Security Boundary)

- **Purpose**: Internal security boundary maintaining thread-consistent pseudonyms.
- **Attributes**:
  - `id`: UUID (Primary Key)
  - `college_id`: VARCHAR(64) NOT NULL
  - `confession_id`: UUID NOT NULL (Foreign Key $\rightarrow$ `confessions`)
  - `user_id_hash`: VARCHAR(128) NOT NULL (Cryptographically blinded user ID hash)
  - `assigned_pseudonym`: VARCHAR(64) NOT NULL (e.g. `Curious Panda #402`)
  - `is_op`: BOOLEAN NOT NULL DEFAULT FALSE
  - `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
- _Strict Security Boundary_: Accessed **strictly via `AnonymousIdentityService`**. No moderation, reporting, analytics, or search queries can access this table directly.

---

### 3.3 `confession_comments` Table Specification (Flat Tree Querying)

- **Purpose**: Threaded comments supporting fast flat tree querying without recursive DB calls.
- **Attributes**:
  - `id`: UUID (Primary Key)
  - `college_id`: VARCHAR(64) NOT NULL
  - `confession_id`: UUID NOT NULL (Foreign Key $\rightarrow$ `confessions`)
  - `root_comment_id`: UUID NULL (Points to top-level thread comment)
  - `parent_comment_id`: UUID NULL (Points to immediate parent)
  - `depth`: INT NOT NULL DEFAULT 1 (Tree depth level)
  - `author_thread_pseudonym`: VARCHAR(64) NOT NULL (e.g. `Witty Owl #108`)
  - `content`: TEXT NOT NULL
  - `status`: VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' (`ACTIVE`, `SOFT_DELETED`, `QUARANTINED`)
  - `upvotes_count`: INT NOT NULL DEFAULT 0
  - `created_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()

---

### 3.4 `confession_statistics` Read Model (Multi-Score System)

- **Purpose**: Asynchronously precomputed scores updated exclusively by background workers.
- **Attributes**:
  - `confession_id`: UUID Primary Key
  - `college_id`: VARCHAR(64) NOT NULL
  - `total_views`: INT NOT NULL DEFAULT 0
  - `total_upvotes`: INT NOT NULL DEFAULT 0
  - `total_comments`: INT NOT NULL DEFAULT 0
  - `total_reports`: INT NOT NULL DEFAULT 0
  - `trending_score`: NUMERIC(10, 4) NOT NULL DEFAULT 0.0000
  - `hot_score`: NUMERIC(10, 4) NOT NULL DEFAULT 0.0000
  - `recent_score`: NUMERIC(10, 4) NOT NULL DEFAULT 0.0000
  - `controversial_score`: NUMERIC(10, 4) NOT NULL DEFAULT 0.0000
  - `last_calculated_at`: TIMESTAMPTZ NOT NULL DEFAULT NOW()

---

## Deliverables & Sign-Off Summary

- ✅ **Anonymous Security Boundary**: Enforced `AnonymousIdentityService` encapsulation of `anonymous_thread_identities`.
- ✅ **Multi-Score Ranking System**: Precomputed `trending_score`, `hot_score`, `recent_score`, and `controversial_score`.
- ✅ **Flat Tree Comment Indexing**: Added `depth`, `parent_comment_id`, and `root_comment_id` to eliminate recursive DB joins.
- ✅ **Decoupled Future Media Support**: Architecture supports future `confession_media` relations.

> [!IMPORTANT]
> **MS-21.3 Approved with Refinements**. Ready for **MS-21.4 (Domain Model & Business Rules)**.
