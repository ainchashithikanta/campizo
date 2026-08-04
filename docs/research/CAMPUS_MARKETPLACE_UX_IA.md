# MS-20.2 — User Experience & Information Architecture: Campus Marketplace

## Executive Summary & Design Vision

This specification defines the complete User Experience (UX), Navigation, Information Architecture (IA), and Interaction Model for the **College Hub Campus Marketplace**.

The primary objective is to enable any verified college student to discover, negotiate, reserve, and physically exchange campus items (textbooks, calculators, cycles, hostel gear) in **under 15 seconds** with complete trust and safety.

---

## 1. User Personas

### 1.1 First-Year Student Buyer (Rohan, 18)

- **Goals**: Buy affordable 1st-year engineering textbooks, CASIO calculator, and lab coat without paying full retail store prices.
- **Pain Points**: Fear of buying damaged/outdated editions or getting scammed on open platforms like OLX.
- **Device Usage**: 100% Mobile (Android/iOS).
- **Frequency**: High at semester start (July/Aug, Jan/Feb); low during mid-terms.
- **Trust Concern**: Wants to confirm seller is an authentic senior from their own campus before meeting.

### 1.2 Senior Student Seller (Ananya, 21)

- **Goals**: Quickly sell cycles, mattress, mini-fan, and study notes before graduating and vacating hostel.
- **Pain Points**: Lowball offers on WhatsApp groups; messages getting buried; ghosting after agreeing on price.
- **Device Usage**: Mobile & Laptop.
- **Frequency**: Intense 2-week period before semester graduation exit.
- **Trust Concern**: Doesn't want external non-college strangers coming to hostel premises.

### 1.3 Hostel Resident (Vikram, 20)

- **Goals**: Acquire room decor, mini-refrigerators, and appliances directly from hostel room neighbors.
- **Pain Points**: Carrying heavy items across large campus distances.
- **Device Usage**: Mobile-first.
- **Frequency**: Frequent micro-purchases across semester.
- **Trust Concern**: Prefers hostel-block level handovers at night or during breaks.

### 1.4 Day Scholar (Priya, 19)

- **Goals**: Buy used reference books and sell unused course materials at campus gates or library.
- **Pain Points**: Strict schedule; cannot stay late on campus for item handovers.
- **Device Usage**: Mobile.
- **Frequency**: Intermittent.
- **Trust Concern**: Needs precise meet-up scheduling during college hours (10 AM - 4 PM).

### 1.5 Student Seeking Free Items / Giveaways (Karan, 18)

- **Goals**: Find free leftover textbooks, stationery, or room accessories from seniors moving out.
- **Pain Points**: Cannot afford high prices; misses out on free items posted in chaotic chat groups.
- **Device Usage**: Mobile.
- **Frequency**: Daily browsing.
- **Trust Concern**: Ensuring items are genuinely free without hidden costs.

### 1.6 Wanted-Post Creator (Sneha, 20)

- **Goals**: Request a specific rare textbook edition or scientific calculator model that isn't currently listed.
- **Pain Points**: Posting in WhatsApp gets ignored or spammed.
- **Device Usage**: Mobile.
- **Frequency**: As needed.
- **Trust Concern**: Receiving responses from sellers who actually possess the item.

### 1.7 Moderator & Admin (Faculty / Student Admin)

- **Goals**: Maintain a scam-free, safe marketplace environment free from commercial spam or prohibited items.
- **Pain Points**: Reviewing mass reports; handling duplicate listings and prohibited merchandise.
- **Device Usage**: Laptop / Desktop dashboard.
- **Frequency**: Daily.
- **Trust Concern**: Swift enforcement of community guidelines without disrupting legitimate peer trades.

---

## 2. Complete User Journeys

### 2.1 Buyer Discovery & Purchase Journey

```
[Open Marketplace App] ──► [Instant Search / Category Filter] ──► [Inspect Listing Detail]
                                                                        │
                                                                        ▼
[View Seller Trust Badge] ◄── [Click "Make Offer" / "Chat"] ◄── [Check Photos & Condition]
          │
          ▼
[Send Structured Offer (e.g., ₹800)] ──► [Offer Accepted] ──► [Item Status: RESERVED]
                                                                        │
                                                                        ▼
                                                       [Meet at Campus Safe Zone]
                                                                        │
                                                                        ▼
                                                       [Confirm Exchange & Rate Seller]
```

### 2.2 Seller Listing & Handover Journey

```
[Click "+ Sell Item"] ──► [Upload Photos] ──► [Fill Details & Select Category]
                                                                  │
                                                                  ▼
[Item Published Live] ◄── [Set Price & Negotiable Toggle] ◄── [Set Condition & Pickup Hostel]
          │
          ▼
[Receive Formal Offer Card in Chat] ──► [Tap "Accept"] ──► [Item Auto-Reserved (24h)]
                                                                  │
                                                                  ▼
                                                 [Hand over item & receive payment]
                                                                  │
                                                 [Tap "Mark Sold" ──► Earn Badge]
```

---

## 3. Information Architecture & Navigation Hierarchy

```
College Hub Main App
  │
  └── 🛍️ Campus Marketplace Module
        ├── 🏠 Home Feed (Trending, Campus Deals, Free Giveaways, Moving Out Sales)
        ├── 🔍 Search & Browse (Category Taxonomy, Filters, Wanted Posts)
        ├── ➕ Post Listing (4-Step Wizard: Media ➔ Attributes ➔ Pricing ➔ Location)
        ├── 💬 Marketplace Chat (Contextual Item Card + Offer Engine)
        └── 👤 Seller Profile & My Activity
              ├── Active Listings
              ├── Sold Items
              ├── Saved Bookmarks
              ├── Received Offers
              └── Seller Reputation Badges
```

---

## 4. Marketplace Home Hierarchy & Content Ordering

1. **Top Navigation Bar**: College Selector (`x-college-id`), Search Input, Saved Bookmarks, Notification Bell.
2. **Campus Banner**: Quick filters (`Exam Essentials`, `Moving Out Sale`, `Free Giveaways`, `Wanted Posts`).
3. **Category Carousel**: Visual pill icons (`Textbooks`, `Calculators`, `Cycles`, `Hostel Gear`, `Electronics`, `Lab Coats`).
4. **Trending Campus Deals**: High-demand items in the current college campus sorted by quality score.
5. **Free & Giveaways Section**: Zero-cost listings for immediate student claims.
6. **Recent Listings Grid**: Infinite scrolling grid of newest campus listings with thumbnail, price, title, and hostel tag.

---

## 5. Listing Creation UX (4-Step Wizard)

- **Step 1: Media & Title** (Upload up to 6 photos, title input with auto-suggested tags).
- **Step 2: Category & Condition** (Category picker, condition selector: `Brand New`, `Like New`, `Good`, `Fair`).
- **Step 3: Pricing & Intent** (Price in ₹, `Negotiable` toggle, Mode selector: `SELL`, `RENT`, `GIVEAWAY`).
- **Step 4: Campus Pickup Location** (Hostel Block / Department Gate dropdown picker).
- **Live Preview & Publish**: Review card representation before final submission.

---

## 6. Listing Detail Page Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│ Image Carousel (Swipeable, Full-screen preview)         │
├─────────────────────────────────────────────────────────┤
│ Title: CASIO FX-991ES+ Scientific Calculator            │
│ Price: ₹900  [NEGOTIABLE]  [CONDITION: LIKE NEW]        │
├─────────────────────────────────────────────────────────┤
│ Seller Profile Card:                                    │
│ [Avatar] Rahul S. (CSE '24) • ⭐ 4.9 (12 sales)          │
│ Verified Student (@stanford.edu.in)                     │
├─────────────────────────────────────────────────────────┤
│ Item Description & Specifications                       │
│ Pickup Location: Hostel Block 4 / Library Gate          │
├─────────────────────────────────────────────────────────┤
│ [ Make Offer ]             [ Chat with Seller ]         │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Offer & Negotiation Engine UX

- **Make Offer Modal**: Input custom price (restricted to $\ge 50\%$ of listed price to avoid lowballing).
- **Chat Offer Card**: Displays interactive buttons: `[Accept Offer]`, `[Counter Offer]`, `[Decline]`.
- **24-Hour Item Reservation**: Accepting an offer locks the item status to `RESERVED` for 24 hours, preventing duplicate offers while meeting details are confirmed.
- **Mark Sold**: Once cash/UPI exchange completes, seller taps `Mark Sold` to record reputation points.

---

## 8. Mobile-First & Touch Interaction Specifications

- **Thumb Zone Optimization**: Primary CTA buttons (`Make Offer`, `Chat`, `Publish`) placed within comfortable bottom-third touch zones.
- **Target Sizes**: Minimum 48px $\times$ 48px touch targets for all interactive buttons and filter chips.
- **Gestures**: Horizontal swiping for image galleries; pull-to-refresh for search feeds; bottom sheet modals for filters and offer submissions.

---

## 9. Accessibility Specifications (WCAG AA)

- **Contrast Ratios**: Minimum 4.5:1 contrast for body text and 3:1 for large headings against background.
- **Focus Management**: Visible focus rings (`2px solid var(--ch-color-border-focus)`) and focus trap modals.
- **Screen Reader Support**: Complete `aria-label` attributes on icon buttons (`Bookmark`, `Share`, `Close`, `Filter`).
- **Reduced Motion**: Respects `prefers-reduced-motion: reduce` by disabling smooth scroll and entry animations.

---

## 10. Strategic UX Decisions & Rationale

| UX Decision          | Chosen Approach                            | Inspiration             | Rejected Alternative             | Campus Fit Rationale                                                                  |
| :------------------- | :----------------------------------------- | :---------------------- | :------------------------------- | :------------------------------------------------------------------------------------ |
| **Offer Protocol**   | Structured In-Chat Offer Cards             | Mercari / OfferUp       | Plain text bargaining in chat    | Eliminates endless text haggling and clarifies final price commitment.                |
| **Item Reservation** | Automated 24-Hour Lock on Offer Acceptance | Vinted                  | Manual "Mark Reserved" toggle    | Prevents sellers from selling to someone else while buyer is traveling across campus. |
| **Location Tagging** | Hostel Block / Campus Gate Picker          | Internal Campus Mapping | GPS Coordinates / Pin Codes      | GPS coordinates are imprecise inside multi-story hostel dorms.                        |
| **Giveaway Support** | Dedicated "Free & Giveaways" Filter        | Freecycle / Reddit      | Setting price to ₹0 in paid feed | Highlight zero-cost items clearly for needy students without polluting paid listings. |

---

## Deliverables & Sign-Off Summary

- ✅ **User Personas**: 7 detailed personas covering buyers, sellers, hostellers, day scholars, giveaway seekers, and admins.
- ✅ **User Journeys**: Complete step-by-step flows for buying, selling, negotiating, reserving, and reporting.
- ✅ **Information Architecture**: Full sitemap, deep linking structure, and screen hierarchy.
- ✅ **Zero Code / Schema Violation**: Pure UX/IA design specification document suitable for engineering & design review.

> [!IMPORTANT]
> **MS-20.2 Complete**. Stopped for architecture review before proceeding to **MS-20.3 (Database Architecture & Data Model)**.
