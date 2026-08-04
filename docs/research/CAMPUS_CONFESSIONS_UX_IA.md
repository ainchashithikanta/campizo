# MS-21.2 — User Experience & Information Architecture: Campus Confessions

## Executive Summary & Design Vision

This specification defines the complete User Experience (UX), Navigation, Information Architecture (IA), Component Layouts, Anonymous Display Model, Moderation Workflow, and Mobile Interaction Design for the **College Hub Campus Confessions** module.

The primary goal is to enable any verified student to anonymously post or discover a meaningful confession in **under 15 seconds** while feeling 100% safe from judgment, harassment, or doxxing.

---

## 1. UX Philosophy & Safe-by-Design Principles

1. **Safe-by-Design**: Real names, roll numbers, phone numbers, and social media handles are automatically detected and blocked during post composition before publishing.
2. **Anonymous but Accountable**: Students authenticate via mandatory `@college.edu.in` credentials to access their campus feed, but posts display cryptographically blind pseudonyms.
3. **Thread-Consistent Anonymity**: A user's pseudonym remains consistent within a single confession thread (e.g. OP = `Curious Panda #402`), enabling coherent discussion while generating a fresh pseudonym for every new confession.
4. **Blind Moderation**: Student and platform moderators review flagged content in a 100% blind queue where submitter real identities are **never visible**.
5. **Quality over Viral Toxicity**: Feeds are ranked using a configurable ranking policy rather than raw reverse-chronological or outrage-baiting metrics.

---

## 2. Target User Personas & Journeys

### 2.1 First-Year Student (Rohan, 18)

- **Goal**: Ask sensitive questions about GPA requirements, professor grading styles, or hostel rules without fear of senior judgment.
- **Journey**: Open App $\rightarrow$ Tap "+ Confess" $\rightarrow$ Select Category `🤔 Advice` $\rightarrow$ Write post $\rightarrow$ System verifies no PII $\rightarrow$ Acknowledge moderation policy $\rightarrow$ Post published live as `Curious Panda #402`.

### 2.2 Senior Student (Ananya, 21)

- **Goal**: Share placement interview experiences, campus career advice, and nostalgia before graduating.
- **Journey**: Browse `🎓 Academic` feed $\rightarrow$ Read junior's advice question $\rightarrow$ Reply as `Witty Owl #108` $\rightarrow$ Receive upvotes & thank-you reactions.

### 2.3 Hostel Resident (Vikram, 20)

- **Goal**: Express frustration about mess food quality or hostel night curfew rules anonymously.
- **Journey**: Post under `😤 Rant` $\rightarrow$ Hostel peers upvote and comment $\rightarrow$ Topic trends on campus feed.

### 2.4 Blind Student Moderator (Arjun, 21)

- **Goal**: Clean up severity-prioritized flagged posts in real time without knowing who submitted them.
- **Journey**: Open Moderation Queue $\rightarrow$ Inspect highest-severity flags (Threats / Doxxing) $\rightarrow$ Tap "Approve" or "Quarantine" (Author name completely hidden).

---

## 3. Information Architecture & Navigation Sitemap

```
College Hub Main App
  │
  └── 🗣️ Campus Confessions Module
        ├── 🏠 Home Feed (🔥 Trending, 🕒 Latest, 📂 Categories)
        ├── 🔍 Search & Discover (Keyword Search, Category Filter, Trending Tags)
        ├── ➕ Create Confession (Category ➔ PII Scan ➔ Policy Acknowledgment ➔ Publish)
        ├── 🔔 Anonymous Notifications (Replies to your threads, Upvotes)
        ├── 👤 My Activity (My Anonymous Posts, Saved Confessions)
        └── 🛡️ Blind Moderation Queue (Severity-Prioritized for Student Mods)
```

---

## 4. Feed Architecture & Configurable Ranking Policy

```
┌─────────────────────────────────────────────────────────┐
│ V1 FEED NAVIGATION TABS                                 │
│ [ 🔥 Trending ]         [ 🕒 Latest ]   [ 📂 Categories ]│
├─────────────────────────────────────────────────────────┤
│ CONFESSION FEED CARD LIST                               │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 💭 Confession • 12m ago • Curious Panda #402        │ │
│ │ "Is anyone else overwhelmed by 3rd-year OS labs?"   │ │
│ │ 🛈 Category: 🎓 Academic                             │ │
│ │ ⬆️ 42  ⬇️ 2   •   💬 18 Comments   •   🔖 Save       │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Configurable Feed Ranking Policy (Decoupled Weights)

$$\text{Score} = (\text{RecencyWeight} \times \text{HoursOld}^{-\alpha}) + (\text{Upvotes} \times w_1) + (\text{Comments} \times w_2) - (\text{Reports} \times w_3)$$

---

## 5. Confession Detail Screen Layout

```
┌─────────────────────────────────────────────────────────┐
│ ← Back to Campus Feed                                   │
├─────────────────────────────────────────────────────────┤
│ PERMANENT PRIVACY BANNER                                │
│ 🛡️ Stay anonymous. Do not reveal personal information   │
│    about yourself or others.                            │
├─────────────────────────────────────────────────────────┤
│ [Category: 🎓 Academic] • 14m ago                       │
│ Author: Curious Panda #402 (Original Poster)            │
├─────────────────────────────────────────────────────────┤
│ "Is anyone else overwhelmed by 3rd-year OS lab exams?   │
│ The grading rubric seems much stricter this semester."   │
├─────────────────────────────────────────────────────────┤
│ ⬆️ 54 Upvotes   •   💬 22 Comments   •   🚩 Report       │
├─────────────────────────────────────────────────────────┤
│ THREADED COMMENT TREE                                   │
│ ├─ Witty Owl #108 (4m ago):                             │
│ │  "Focus on the IPC synchronization problems first!"   │
│ │  └─ Curious Panda #402 (OP) (2m ago):                 │
│ │     "Thanks! Are those covered in Chapter 5?"         │
│ └─ [Comment removed by moderation]                      │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Posting Flow & Safety Acknowledgment UX

1. **Step 1: Category Picker**: Select one of 6 V1 categories (`Crush`, `Academic`, `Funny`, `Advice`, `Rant`, `Confession`).
2. **Step 2: Post Composition**: Rich text input with character counter (max 1,000 chars).
3. **Step 3: Real-Time PII Safety Scan**: Scans for phone numbers, roll numbers, real names, Instagram handles `@username`.
4. **Step 4: Explicit Policy Acknowledgment**:
   - Checkbox requirement: `☑️ I understand this post is anonymous but subject to community moderation.`
5. **Step 5: Anonymous Preview & Publish**: Displays pseudonym badge (`Curious Panda #402`) before final submission.

---

## 7. Severity-Prioritized Blind Moderation Queue UX

```
┌─────────────────────────────────────────────────────────┐
│ SEVERITY-PRIORITIZED MODERATION QUEUE                   │
│ 1. 🔴 Threats / Self-Harm                               │
│ 2. 🟠 Doxxing / Personal Information                    │
│ 3. 🟡 Harassment & Targeted Abuse                       │
│ 4. 🟢 Hate Speech & Slurs                               │
│ 5. ⚪ Spam & Commercial Links                           │
├─────────────────────────────────────────────────────────┤
│ Flagged Post #4012 • Reported by 3 Students             │
│ Severity: 🔴 Threats / Self-Harm                        │
├─────────────────────────────────────────────────────────┤
│ Author Identity: 🔒 BLIND (Hidden by Privacy Policy)    │
├─────────────────────────────────────────────────────────┤
│ ACTION BUTTONS                                          │
│ [ ✅ Approve & Unhide ]       [ 🚫 Quarantine Post ]    │
└─────────────────────────────────────────────────────────┘
```

---

## Deliverables & Sign-Off Summary

- ✅ **V1 Feed Tabs**: Streamlined to 🔥 `Trending`, 🕒 `Latest`, 📂 `Categories`.
- ✅ **Permanent Privacy Banner**: Top warning banner on confession detail pages.
- ✅ **Posting Flow Acknowledgment**: PII Scan $\rightarrow$ Moderation Checkbox $\rightarrow$ Publish.
- ✅ **Severity-Prioritized Moderation Queue**: Highest-severity flags (Threats/Doxxing) prioritized over raw chronology.
- ✅ **Soft Deletion for Comments**: Moderated comments render placeholder `[Comment removed by moderation]`.
- ✅ **Configurable Ranking Policy**: Decoupled formula weights.

> [!IMPORTANT]
> **MS-21.2 Approved with Refinements**. Ready for **MS-21.3 (Production Database Architecture & Data Model)**.
