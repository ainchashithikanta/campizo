# MS-21.7 — Visual Design System & UI Specification: Campus Confessions

## Executive Summary & Aesthetic Direction

This specification defines the complete Visual Design System, Design Tokens, Component Layouts, Screen Inventory, Typography, Anonymous Display Models, and Accessibility Standards for the **College Hub Campus Confessions** module.

The visual direction is **Calm, Anonymous, Reading-Focused, and Low-Cognitive-Load**. It intentionally avoids outrage-inducing social media feeds (e.g. Instagram/X) or meme aesthetics in favor of a clean, editorial, safe campus discussion board.

---

## 1. Design Tokens & Color Palette

### 1.1 Color Tokens & Moderation Status Language

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ MODERATION STATUS COLOR LANGUAGE                                                │
│ 🟢 Normal / Active Post:    #10B981 (Emerald 500) - Standard active content     │
│ 🟡 Under Review:            #F59E0B (Amber 500)   - Pending moderation review │
│ 🟠 Quarantined Content:     #EA580C (Orange 600)  - 3-report temporary lock   │
│ 🔴 Deleted by Moderation:   #EF4444 (Red 500)     - Content removed           │
├─────────────────────────────────────────────────────────────────────────────────┤
│ LIGHT MODE PALETTE                                                              │
│ Primary Brand:              #4F46E5 (Indigo 600)  - Primary CTA & active states │
│ Surface Light:              #FFFFFF (White)       - Card backgrounds          │
│ Background Light:           #F8FAFC (Slate 50)    - Main page background      │
│ Border Light:               #E2E8F0 (Slate 200)   - Subtle card borders       │
│ Text Primary:               #0F172A (Slate 900)   - Confession titles & body  │
│ Text Muted:                 #64748B (Slate 500)   - Timestamps & metadata     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.2 Typography & Pseudonym System

- **UI & Reading Font**: `Inter`, sans-serif (Weights: 400 Regular, 500 Medium, 600 SemiBold).
- **Anonymous Pseudonym Font**: `JetBrains Mono`, monospace (Weight: 600 SemiBold). Enforces distinct visual identity for pseudonyms (`Curious Panda #402`).

---

## 2. Feed Card Information Hierarchy & Layout

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🛈 Category: 🎓 Academic                                                         │
│ 💭 Curious Panda #402   •   ⏱️ 14m ago                                         │
│                                                                                 │
│ "Is anyone else overwhelmed by 3rd-year OS lab exams?                           │
│ The grading rubric seems much stricter this semester..."                        │
│                                                                                 │
│ ⬆️ 42  ⬇️ 2   •   💬 18 Comments   •   🔖 Save   •   🚩 Report                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```
- **Strict Rule**: No decorative elements compete with confession content. Intentional layout space reserved for future media attachments without showing empty placeholder boxes in V1.

---

## 3. Micro-Interactions & Subtle Voting UX

- **Vote Micro-Interaction**: Small scale transformation ($1.05\times$) with a brief color transition to `#10B981`. Zero particle explosion effects or bouncing icons.
- **Comment Indentation Limit**: Beyond maximum nesting depth (8–10 levels), replies attach to the nearest valid ancestor without further indentation on mobile screens.

---

## Deliverables & Sign-Off Summary

* ✅ **Calm Discussion Board Aesthetic**: Avoids bright red feeds, meme styling, or social media gradients.
* ✅ **Feed Card Hierarchy**: `Category` $\rightarrow$ `Pseudonym` $\rightarrow$ `Timestamp` $\rightarrow$ `Text` $\rightarrow$ `Votes • Comments`.
* ✅ **Subtle Micro-Interactions**: $1.05\times$ scale vote feedback without particle explosions.
* ✅ **Moderation Color Language**: 🟢 Normal, 🟡 Under Review, 🟠 Quarantined, 🔴 Deleted.
* ✅ **Shared College Hub System**: Shares navigation, typography scale, and WCAG accessibility standards with Marketplace and Academic Hub modules.

> [!IMPORTANT]
> **MS-21.7 Approved with Refinements**. Ready for **MS-21.8.1 (Production Database Implementation)**.
