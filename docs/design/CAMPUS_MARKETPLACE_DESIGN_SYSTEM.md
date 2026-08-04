# MS-20.7 — Visual Design System & UI/UX Specification: Campus Marketplace

## Executive Summary & Design System Identity

This specification defines the complete Visual Design System, Design Tokens, Screen Inventory, Component Anatomy, Mobile Interaction Guidelines, Accessibility Standards, and Motion Design Specs for the **College Hub Campus Marketplace**.

The Marketplace visual identity inherits the core **College Hub Design System** (Inter font, neutral surfaces, glassmorphic accents) while introducing an emerald green primary accent (`#10B981`) to signify **Trust, Verified Value, and Student Mobility**.

---

## 1. Design Philosophy

1. **Trust-First Visual Interface**: Prominent verified badges (`@college.edu.in`), seller response rates, and clear campus safety tags eliminate anonymity and build instant confidence.
2. **Fast Sub-30-Second Discovery**: Clean card grids, high-contrast price tags, condition badges, and instant search bars enable rapid item evaluation.
3. **Mobile-First Ergonomics**: All key actions (`Make Offer`, `Chat`, `Publish`, `Reserve`) placed within thumb-friendly bottom screen zones.
4. **Contextual Clarity**: Immutable offer negotiation cards embedded directly into chat feeds eliminate communication ambiguity.

---

## 2. Design Tokens

### 2.1 Color Tokens & Marketplace Accents

```
                                COLOR PALETTE MATRIX
┌───────────────────────┬───────────────────────────┬───────────────────────────┐
│ Token Name            │ Light Mode Hex            │ Dark Mode Hex             │
├───────────────────────┼───────────────────────────┼───────────────────────────┤
│ --mp-color-accent     │ #10B981 (Marketplace Emerald)| #34D399 (Emerald Glow)   │
│ --mp-color-accent-bg  │ #ECFDF5 (Light Emerald)   │ #064E3B (Dark Emerald)    │
│ --mp-color-primary    │ #4F46E5 (Indigo)          │ #6366F1 (Indigo Glow)     │
│ --mp-color-background │ #FFFFFF                   │ #0F172A (Slate 900)       │
│ --mp-color-surface    │ #F8FAFC (Slate 50)        │ #1E293B (Slate 800)       │
│ --mp-color-border     │ #E2E8F0 (Slate 200)       │ #334155 (Slate 700)       │
│ --mp-color-text       │ #0F172A (Slate 900)       │ #F8FAFC (Slate 50)        │
│ --mp-color-text-muted │ #64748B (Slate 500)       │ #94A3B8 (Slate 400)       │
│ --mp-color-reserved   │ #F59E0B (Amber Warning)   │ #FBBF24 (Amber Glow)      │
└───────────────────────┴───────────────────────────┴───────────────────────────┘
```

### 2.2 Typography Tokens

- **Font Sans**: `Inter`, system-ui, -apple-system, sans-serif.
- **Font Mono**: `JetBrains Mono` (for price tags & transaction IDs).
- **Font Sizes**:
  - `Display`: 2.25rem (36px), Bold
  - `H1`: 1.875rem (30px), Bold
  - `H2`: 1.5rem (24px), SemiBold
  - `H3`: 1.25rem (20px), SemiBold
  - `Body`: 1rem (16px), Regular
  - `Caption`: 0.875rem (14px), Medium
  - `Micro`: 0.75rem (12px), Medium

### 2.3 Spacing & Border Radius

- **Spacing Scale**: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px.
- **Border Radius**:
  - `sm`: 4px (Badges & tags)
  - `md`: 8px (Cards & inputs)
  - `lg`: 16px (Modals & hero cards)
  - `full`: 9999px (Pills & avatars)

---

## 3. Screen Inventory

1. **Marketplace Home Feed**: Search bar, banner deals, category carousel, trending items, giveaways.
2. **Search & Filter Results**: Faceted filters, price slider, condition tags, grid/list view toggle.
3. **Listing Detail Screen**: Image gallery carousel, price badge, seller trust card, item specs, sticky actions.
4. **Offer & Negotiation Screen**: Interactive offer/counter-offer cards, 24-hr reservation banner.
5. **In-App Chat**: Contextual item snapshot header, immutable offer message cards, safe meetup reminders.
6. **Seller Profile Screen**: Campus verification status, total sales count, response rate, trust badges.
7. **Listing Creation Wizard**: 4-Step progress bar (Media ➔ Details ➔ Pricing ➔ Campus Location).
8. **Study Collections & Saved Bookmarks**: Grid of saved items with offline indicators.

---

## 4. Listing Card Visual Anatomy & Priority Matrix

```
┌─────────────────────────────────────────────────────────┐
│ Image Thumbnail (4:3 Aspect Ratio, Aspect Fill)         │
│ [CATEGORY BADGE]                       [★ BOOKMARK]    │
├─────────────────────────────────────────────────────────┤
│ ₹900  [NEGOTIABLE]             [CONDITION: LIKE NEW]    │
│ CASIO FX-991ES+ Scientific Calculator                   │
│ Hostel Block 4 / Library Gate                           │
├─────────────────────────────────────────────────────────┤
│ [Avatar] Rahul S. (CSE '24) • Verified Student          │
└─────────────────────────────────────────────────────────┘
```

### 4.1 Visual Hierarchy Priorities

1. **Item Image & Price**: Primary visual anchors. Price displayed in bold mono font (`₹900`).
2. **Negotiability & Condition Badges**: High contrast badges (`LIKE_NEW`, `NEGOTIABLE`).
3. **Title & Campus Location**: Clear 2-line truncated title and hostel/department tag.
4. **Seller Verification Indicator**: Green checkmark badge verifying campus domain.

---

## 5. Listing Detail Layout & Section Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│ Swipable Image Gallery Carousel (Full-screen expand)     │
├─────────────────────────────────────────────────────────┤
│ Title: CASIO FX-991ES+ Scientific Calculator            │
│ Price: ₹900  [NEGOTIABLE]  [CONDITION: LIKE NEW]        │
├─────────────────────────────────────────────────────────┤
│ 24-Hour Reservation Banner (If Reserved):               │
│ ⏳ Reserved for 18h 42m by Buyer                        │
├─────────────────────────────────────────────────────────┤
│ Seller Profile Card:                                    │
│ [Avatar] Ananya M. (Biotech '24)                        │
│ Verified Student (@stanford.edu.in) • ⭐ 4.9 (14 sales)  │
│ Response Rate: 98% (Responds in < 15 mins)              │
├─────────────────────────────────────────────────────────┤
│ Item Description & Specifications                       │
│ Preferred Pickup: Hostel Block 2 Security Desk          │
├─────────────────────────────────────────────────────────┤
│ STICKY BOTTOM BAR (Mobile):                             │
│ [ Make Offer ]                 [ Chat with Seller ]     │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Offer Cards & Negotiation UX Design

- **Offer Card (`CREATED`)**: Displays offer amount (e.g. `Offered: ₹750`), buyer name, timestamp, and action buttons (`[Accept Offer]`, `[Counter Offer]`, `[Decline]`).
- **Counter Offer Card (`COUNTERED`)**: Highlights updated counter price (`Counter: ₹850`).
- **Accepted Offer Card (`ACCEPTED`)**: Displays success checkmark + 24-hour reservation lock countdown (`Reserved for 23h 59m`).
- **Immutability Principle**: Cards are **never edited in place**. Every action appends a new immutable message card into the chat thread.

---

## 7. Mobile-First Touch Interaction Guidelines

- **Thumb Zone Design**: Primary Call-to-Actions (`Make Offer`, `Chat`, `Publish`) anchored to the bottom 25% of the mobile viewport.
- **Touch Target Sizes**: Minimum $48\text{px} \times 48\text{px}$ for all buttons, filter pills, and navigation icons.
- **Bottom Sheet Modals**: Filters, offer forms, and report dialogs open in smooth bottom sheets on mobile devices.

---

## 8. Motion Design & Micro-Interactions

- **Transition Speeds**: All page transitions and card hover animations capped at $\approx 200\text{ms}$ with `cubic-bezier(0.4, 0, 0.2, 1)` easing.
- **Loading States**: Shimmering skeleton loaders (`--mp-color-surface`) match card layouts to prevent cumulative layout shift (CLS).
- **Offer Acceptance Micro-Animation**: Smooth scale-up particle checkmark transition when an offer is accepted.

---

## 9. Accessibility Specifications (WCAG 2.1 AA)

- **Contrast Ratios**: Minimum 4.5:1 for body text and 3:1 for large text/headings against surface backgrounds.
- **Focus Management**: Visible focus rings (`2px solid #10B981`) and modal focus traps.
- **Screen Readers**: Comprehensive `aria-label` tags for all visual icons (bookmark, share, filter, close).
- **Reduced Motion**: Disables non-essential animations when `prefers-reduced-motion: reduce` is enabled.

---

## Deliverables & Sign-Off Summary

- ✅ **Marketplace Design Identity**: Defined emerald green accent (`#10B981`) paired with College Hub tokens.
- ✅ **Card & Detail Anatomy**: Specified visual priority matrix and sticky bottom mobile bars.
- ✅ **Immutable Offer UX**: Designed chat offer cards, counter-offer cards, and reservation banners.
- ✅ **Accessibility & Motion**: WCAG 2.1 AA compliance and sub-200ms motion specs.
- ✅ **Zero Code / Component Violation**: Pure visual design system specification.

> [!IMPORTANT]
> **MS-20.7 Complete**. Stopped for design approval before proceeding to **MS-20.8.1 (Production Database Implementation)**.
