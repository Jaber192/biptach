# Biptach Project Status

Version: 0.0.1

Project Status: Active Development

Last Updated: 24 July 2026

Repository Branch: main

---

# Purpose

This document is the living memory of the project.

MASTER_SPEC.md defines WHAT Biptach should become.

PROJECT_STATUS.md defines WHAT has been built, WHAT is currently being built, and WHAT should be built next.

Every AI must read BOTH files before writing any code.

Every AI MUST update this file before ending its work session.

---

# Overall Progress

Overall Completion

12%

Current Release

v0.0.1

Current Phase

MVP Development

---

# Milestone Progress

| Milestone | Status | Progress |
|------------|---------|----------|
| 1. Marketing Website | ✅ Completed | 100% |
| 2. Authentication & User Roles | 🟡 In Progress | 0% |
| 3. Customer Management | ⚪ Not Started | 0% |
| 4. Work Orders | ⚪ Not Started | 0% |
| 5. Scheduling & Dispatch | ⚪ Not Started | 0% |
| 6. Technician Mobile | ⚪ Not Started | 0% |
| 7. Notifications | ⚪ Not Started | 0% |
| 8. Reporting & Analytics | ⚪ Not Started | 0% |

---

# Current Development State

Current Milestone

Milestone 2 — Authentication & User Roles

Status

🟡 In Progress

Current Task

Milestone 1 completed. Milestone 2 not started.

Next Task

Set up authentication with user roles (Admin, Manager, Technician).

Estimated Completion

Unknown

---

# Current Milestone Checklist

## Marketing Website

- [x] Sticky Navigation
- [x] Hero Section
- [x] Dashboard Mockup
- [x] Features Section
- [x] How It Works
- [x] Pricing
- [x] CTA Banner
- [x] Footer
- [x] Responsive Design
- [x] Dark Mode
- [x] Animations

---

# Completed Milestones

## Milestone 1 — Marketing Website

Completed On

2026-07-24

Summary

- Sticky navigation bar with scroll-aware blur background, mobile hamburger menu, and theme toggle
- Hero section with animated headline, CTAs, and a realistic dashboard dispatch mockup
- Features section showcasing 8 core product capabilities with icon cards and hover states
- How It Works section with a 4-step flow and connecting timeline
- Pricing section with 3 tiers (Solo, Team, Business) and a highlighted "most popular" plan
- CTA banner with gradient background and decorative accents
- Footer with logo, product/company/support link columns, and copyright
- Full light/dark mode support with system preference detection and localStorage persistence
- Responsive design across mobile, tablet, and desktop breakpoints
- Subtle entrance and scroll-triggered animations using Motion
- DM Sans font, blue primary / green accent color system, 0.75rem border radius per design spec

Important Notes

- Tech stack: React 19, Vite 6, TypeScript 5, Tailwind CSS 4, Motion, Lucide React
- Tailwind 4 configured via @tailwindcss/vite plugin with @theme tokens in src/styles/index.css
- Theme state managed via useTheme hook with localStorage persistence
- Production build and typecheck both pass cleanly

Files Created

- package.json
- vite.config.ts
- tsconfig.json
- index.html
- public/favicon.svg
- src/main.tsx
- src/App.tsx
- src/vite-env.d.ts
- src/styles/index.css
- src/hooks/useTheme.ts
- src/components/Logo.tsx
- src/components/Navbar.tsx
- src/components/Hero.tsx
- src/components/Features.tsx
- src/components/HowItWorks.tsx
- src/components/Pricing.tsx
- src/components/CtaBanner.tsx
- src/components/Footer.tsx

Files Modified

- PROJECT_STATUS.md

Known Issues

None

Whenever a milestone is completed, move it here using the following format.

Example

## Milestone 1 — Marketing Website

Completed On

YYYY-MM-DD

Summary

- Feature A
- Feature B
- Feature C

Important Notes

...

Files Created

...

Files Modified

...

Known Issues

...

---

# Current Session Summary

This section is overwritten after every AI session.

Session Date

24 July 2026

Work Completed

- Scaffolded Vite + React 19 + TypeScript + Tailwind CSS 4 project
- Built complete marketing landing page (Milestone 1)
- Implemented sticky nav, hero with dashboard mockup, features, how-it-works, pricing, CTA, footer
- Added dark mode with system preference detection and localStorage persistence
- Added scroll-triggered and entrance animations via Motion
- Production build and typecheck pass cleanly

Files Modified

- package.json, vite.config.ts, tsconfig.json, index.html
- src/main.tsx, src/App.tsx, src/vite-env.d.ts
- src/styles/index.css, src/hooks/useTheme.ts
- src/components/Logo.tsx, Navbar.tsx, Hero.tsx, Features.tsx, HowItWorks.tsx, Pricing.tsx, CtaBanner.tsx, Footer.tsx
- PROJECT_STATUS.md

Current Blocker

None

Recommended Next Step

Start Milestone 2 — Authentication & User Roles.

---

# Architecture Decisions

Every important technical decision must be recorded here.

Current Decisions

- React 19
- Vite 6
- Convex
- Tailwind CSS 4 (via @tailwindcss/vite)
- Motion (animation)
- Lucide React (icons)
- DM Sans font, blue primary / green accent color system, 0.75rem radius
- OIDC Authentication
- Offline-first technician experience
- Mobile-first design

---

# Known Bugs

None

When bugs are found they should be added here.

Format

Issue

Severity

Status

Solution

---

# Technical Debt

None

Future improvements that are intentionally postponed should be documented here.

---

# Third-Party Integrations

Current

- Convex
- Convex File Storage
- OIDC Authentication

Pending

- Google Maps Platform
- Email Provider
- SMS Provider

Future

- Stripe
- Twilio
- QuickBooks
- Google Calendar
- Outlook Calendar

---

# Git History

Latest Commit

None

Latest Version

0.0.1

Latest Milestone Completed

None

---

# AI Memory

Before writing any code every AI MUST understand:

Completed Work

- MASTER_SPEC.md
- PROJECT_STATUS.md
- Milestone 1 — Marketing Website (complete)

Current Milestone

Authentication & User Roles

Current Task

Start Milestone 2 — set up authentication with user roles.

Next Milestone

Customer Management

Current Priorities

1. Complete current milestone.
2. Maintain clean architecture.
3. Reuse components.
4. Follow MASTER_SPEC.md.

---

# AI Rules

Every AI working on this repository MUST:

1. Read MASTER_SPEC.md completely.

2. Read PROJECT_STATUS.md completely.

3. Continue exactly where the previous AI stopped.

4. Never rebuild completed work.

5. Never delete completed features.

6. Never change architecture without approval.

7. Reuse existing components whenever possible.

8. Keep business logic clean.

9. Follow the design system.

10. Test new functionality before finishing.

11. Before ending the session ALWAYS update:

- Overall Progress
- Current Milestone
- Current Task
- Next Task
- Milestone Progress
- Current Session Summary
- Completed Milestones
- Known Bugs
- Technical Debt
- Git History (if changed)

12. Save PROJECT_STATUS.md before ending every work session.

13. If the current milestone is fully completed:

- Mark it as ✅ Completed.
- Move it to Completed Milestones.
- Change the next milestone to 🟡 In Progress.
- Update Current Task.
- Update Overall Progress.
- Update Current Session Summary.
- Then STOP and wait for further instructions.

14. Never modify MASTER_SPEC.md unless explicitly instructed by the user.

---

# Notes

PROJECT_STATUS.md is a living document.

It should always represent the current state of the project.

It should never become outdated.

Any AI should be able to read only MASTER_SPEC.md and PROJECT_STATUS.md and immediately continue development without additional explanation from the user.

If the current context window becomes too large, finish the current task, update PROJECT_STATUS.md, summarize all changes, and stop. Never leave the project in a partially documented state.

---

# Session Handover

Before ending every work session the AI MUST write:

Session Completed

YES

Reason Stopped

Current milestone completed, awaiting approval to proceed to Milestone 2.

Last Finished Task

Milestone 1 — Marketing Website fully built, typechecked, and production build verified.

Current Working File

PROJECT_STATUS.md

Next Recommended Action

Start Milestone 2 — Authentication & User Roles.

Estimated Remaining Work

7 milestones remaining.

---

# Project Health

Build Status

✅ Passing

Tests

Not Implemented

Critical Bugs

0

Warnings

0

Performance

Unknown

Last Verified

24 July 2026
---

# Repository Rules

Never

- Delete existing files unless requested.
- Rename folders without approval.
- Introduce breaking changes.
- Remove completed functionality.

Always

- Keep commits focused.
- Preserve backward compatibility.
- Keep folder structure organized.
