# MS-21.4 — Domain Model & Business Rules: Campus Confessions

## Executive Summary & DDD Framework

This specification defines the Domain-Driven Design (DDD) model, Aggregate Root boundaries, State Machine transitions, Domain Invariants, Domain Events, and Typed Business Errors for the **College Hub Campus Confessions** module.

The domain logic is strictly deterministic, technology-agnostic, and independent of database schemas or HTTP transport layers.

---

## 1. Aggregate Roots & Boundaries

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ AGGREGATE ROOT 1: Confession                                                           │
│   - Value Objects: ConfessionTitle, ConfessionContent, CategoryCode, Pseudonym         │
│   - Lifecycle: DRAFT ➔ PUBLISHED ➔ QUARANTINED ➔ (RESTORED / HIDDEN / DELETED)          │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ AGGREGATE ROOT 2: ConfessionComment                                                    │
│   - Value Objects: CommentContent, ThreadPseudonym, TreeDepth, RootCommentId           │
│   - Invariant: Max nesting depth (8–10 levels). Beyond max depth, attaches to ancestor.  │
│   - Lifecycle: ACTIVE ➔ SOFT_DELETED ➔ QUARANTINED                                    │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ AGGREGATE ROOT 3: AnonymousIdentity (Security Boundary)                                │
│   - Invariant: 1 User + 1 Thread ➔ Exactly 1 Immutable Anonymous Identity              │
│   - Security Boundary: Accessible strictly via AnonymousIdentityService               │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ AGGREGATE ROOT 4: ModerationCase                                                       │
│   - Entities: ModerationAction                                                         │
│   - Value Objects: SeverityLevel, FlagReason, ReportCount                              │
│   - Lifecycle: OPEN ➔ UNDER_REVIEW ➔ QUARANTINED ➔ (RESTORED / HIDDEN / DELETED)       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Moderation Workflow & State Machine (Quarantine Non-Terminal)

```
                    ┌───────────────┐
                    │   PUBLISHED   │
                    └───────┬───────┘
                            │ Reported / 3 Reports
                            ▼
                    ┌───────────────┐
                    │ AUTO-QUARANTINED │ (Temporary State)
                    └───────┬───────┘
                            │ Moderator Review
          ┌─────────────────┼─────────────────┬─────────────────┐
          ▼                 ▼                 ▼                 ▼
  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
  │   RESTORED    │ │    HIDDEN     │ │    DELETED    │ │   ESCALATED   │
  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
```

---

## 3. Domain Invariants (Business Rules)

1. **Immutable Anonymous Identity Invariant**: `1 User + 1 Confession Thread ➔ Exactly 1 Immutable Anonymous Identity`. Once assigned, the pseudonym for that user in that thread can never change or be re-assigned.
2. **Quarantine Non-Terminal State**: `QUARANTINED` is a temporary isolation state. Final decisions (`RESTORED`, `HIDDEN`, `DELETED`, `ESCALATED`) require moderator review or deterministic rules.
3. **Voting Rules**: A student may upvote, remove vote, downvote, or switch vote. Exactly **1 active vote** per student per target at any time.
4. **Configurable Comment Nesting Depth**: Maximum nesting depth (8–10 levels). Replies exceeding max depth automatically attach to the nearest valid ancestor comment.
5. **Blind Moderation Boundary**: Moderators can **never view or query** author real identities from normal moderation tools.
6. **Self-Voting Prohibition**: A student cannot vote on their own confessions or comments (`author_id != voter_id`).
7. **Automated 3-Report Quarantine**: Accumulating **3 independent student reports** automatically transitions a confession to temporary `QUARANTINED` status.
8. **Soft-Deleted Comment Integrity**: Moderated comments maintain `[Comment removed by moderation]` placeholder text so thread trees do not break.

---

## 4. Domain Events Catalog

- `ConfessionCreated`: Emitted when a confession draft is initialized.
- `ConfessionPublished`: Emitted when a confession goes live for campus viewing.
- `ConfessionQuarantined`: Emitted when a confession is temporarily quarantined.
- `ConfessionRestored`: Emitted when a quarantined confession is cleared by a moderator.
- `ConfessionHidden`: Emitted when a confession is hidden from public feeds.
- `ConfessionDeleted`: Emitted when a confession is soft-deleted.
- `CommentAdded`: Emitted when a new reply is posted to a confession thread.
- `CommentSoftDeleted`: Emitted when a comment is soft-deleted.
- `VoteAdded`: Emitted when an upvote/downvote is registered.
- `VoteRemoved`: Emitted when a vote is retracted.
- `VoteSwitched`: Emitted when a vote transitions between upvote and downvote.
- `BookmarkAdded`: Emitted when a student saves a confession.
- `ReportSubmitted`: Emitted when a student flags a post for abuse.
- `ModerationCaseOpened`: Emitted when a new severity case is created.
- `ModerationDecisionRecorded`: Emitted when a moderator records a decision.
- `ReplyReceived`: Emitted when a student receives a reply to their confession/comment.
- `CommentReceived`: Emitted when a new comment is added to a thread.
- `ConfessionTrending`: Emitted when a confession crosses the trending threshold.
- `ModerationDecisionDelivered`: Emitted when a moderation outcome notification is prepared.
- `MediaAttached`: Forward-compatible media attachment event.
- `MediaRemoved`: Forward-compatible media removal event.

---

## Deliverables & Sign-Off Summary

- ✅ **Immutable Anonymous Identity**: Enforced `1 User + 1 Thread ➔ 1 Immutable Pseudonym`.
- ✅ **Non-Terminal Quarantine State**: `QUARANTINED` $\rightarrow$ (`RESTORED`, `HIDDEN`, `DELETED`, `ESCALATED`).
- ✅ **Voting Mechanics**: Support for vote removal and vote switching (max 1 active vote).
- ✅ **Comment Depth Bounding**: Configurable max nesting depth (8–10 levels) with ancestor fallback.
- ✅ **Expanded Domain Events Catalog**: Added `ReplyReceived`, `ConfessionTrending`, `ModerationDecisionDelivered`, `MediaAttached`.

> [!IMPORTANT]
> **MS-21.4 Approved with Refinements**. Ready for **MS-21.5 (API Contracts & DTO Specification)**.
