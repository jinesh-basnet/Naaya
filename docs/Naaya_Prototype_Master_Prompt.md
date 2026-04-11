# Naaya: Master Prototype Specification & Development Prompt

This document contains the "Grand Prompt" for the Naaya project. Use this prompt to guide AI development, design high-fidelity prototypes, or provide a comprehensive project overview for stakeholders.

---

## 🚀 THE MASTER PROMPT

**Role:** Act as a Senior Product Architect & Design Lead at a top-tier social media tech firm (e.g., Instagram/Snapchat meta-division).
**Task:** Build a high-fidelity, production-ready prototype for "Naaya"—a premier social discovery platform that focuses on "Algorithmic Equity" and "Luxury Aesthetics."

### 1. Vision & Core Philosophy
Naaya isn't just a social network; it’s a high-performance content engine designed to break the "Popularity Paradox."
- **Core Value:** Algorithmic content discovery based on real-time engagement vs. historical popularity.
- **Design DNA:** "Luxury Precision"—a combination of Bauhaus minimalism, Apple-grade polish, and aggressive Glassmorphism.

### 2. Design System: "Luxury Precision"
Implement a cohesive design system using the following tokens:
- **Color Palette:**
  - **Surface (Dark):** `#0B0E14` (Night Charcoal) with `#161B22` elevated layers.
  - **Surface (Light):** `#FAFAFA` (Pure Snow) with `#F1F5F9` elevated layers.
  - **Brand Accents:** 'Hyper Blue' (`#38BDF8`) to 'Vivid Violet' (`#8B5CF6`) gradients.
  - **Status:** Rose Gold for likes, Mint Green for success, Ruby for errors.
- **Glassmorphism Spec:**
  - `backdrop-filter: blur(24px) saturate(180%)`.
  - Border: `1px solid rgba(255, 255, 255, 0.1)`.
  - Box Shadow: `0 8px 32px 0 rgba(0, 0, 0, 0.3)`.
- **Typography:**
  - Header: **Outfit** (Geometric, tracked tight).
  - Body: **Satoshi** or **Inter** (High legibility, variable weight).
  - Code/Meta: **JetBrains Mono** for timestamps and IDs.

### 3. Feature Deep-Dive (Prototype Specs)

#### A. Auth & Onboarding
- **Multi-Step Flow:** Clean, card-based registration.
- **Location Cascading:** Dynamic dropdowns (Province > District > City) with validation.
- **Premium Onboarding:** High-res avatar upload with circular cropping and real-time preview.

#### B. The "Cinema" Discovery Feed
- **Infinite Scroll:** Native-feeling vertical scroll.
- **PostCard Architecture:** 
  - Edge-to-edge media (16:9 or 9:16).
  - Floating Action Blade: Glass-frosted panel for Likes, Comments, Shares, and Saves.
  - Heart Burst: A custom 3D-feeling heart animation on double-tap.
- **Algorithm Integration:** Visual indicators for "Rising Posts" vs "Top Posts."

#### C. Story & Reels System
- **Stories:** Circular avatars at top with dual-ring gradients (active/viewed).
- **Viewer:** Full-screen immersive viewer with segmented progress bars and swipe-to-next logic.

#### D. Messaging & Real-Time
- **Presence:** Subtle pulsing neon rings around active user avatars.
- **Experience:** Gradient message bubbles that change tint based on viewport position.
- **Security:** Visual indicators for End-to-End Encryption (E2EE).

### 4. Technical Architecture
- **Frontend:** React (TypeScript), Framer Motion (for all motion), TanStack Query (State & Cache), Vanilla CSS (Design Tokens).
- **Backend:** Node.js, Express, Socket.io (Real-time), MongoDB.
- **Key Logic:** Implementation of "Rich-get-Richer" logic in the retrieval controller to balance content visibility.

### 5. Interaction & Animation Guidelines
- **Physicality:** Use spring physics for all UI movements. Nothing "snaps"—it Q"glides."
- **Feedback:** Every button click must have a subtle haptic-style scale-down (0.96x).
- **Skeleton Screens:** Shimmering gradient placeholders for loading states.

---

## 🛠️ Usage Instructions
To use this prompt with an AI assistant (like Antigravity or others):
1. **Initialize:** "I want to build Naaya. Please read `docs/Naaya_Prototype_Master_Prompt.md` and use it as your ground truth for all design and code decisions."
2. **Phase Implementation:** "Based on the Master Prompt, implement Phase 1: The Design Foundation and index.css."
3. **Component Creation:** "Generate the PostCard component exactly as described in the 'Cinema Architecture' section of the prompt."
