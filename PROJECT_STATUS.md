# Biptach Project Status

Version: 0.0.1

Project Status: Active Development

Last Updated: 25 July 2026

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

38%

Current Release

v0.0.1

Current Phase

MVP Development

---

# Milestone Progress

| Milestone | Status | Progress |
|------------|---------|----------|
| 1. Marketing Website | ✅ Completed | 100% |
| 2. Authentication & User Roles | ✅ Completed | 100% |
| 3. Customer Management | ✅ Completed | 100% |
| 4. Work Orders | ✅ Completed | 100% |
| 5. Scheduling & Dispatch | ⚪ Not Started | 0% |
| 6. Technician Mobile | ⚪ Not Started | 0% |
| 7. Notifications | ⚪ Not Started | 0% |
| 8. Reporting & Analytics | ⚪ Not Started | 0% |

---

# Current Development State

Current Milestone

Milestone 5 — Scheduling & Dispatch

Status

⚪ Not Started

Current Task

Milestone 4 completed. Milestone 5 not started.

Next Task

Set up scheduling & dispatch — calendar view, drag-and-drop assignment, technician availability.

Estimated Completion

Unknown

---

# Current Milestone Checklist

## Work Orders

- [x] WorkOrder, WorkOrderInput, and related types defined (status, priority, jobType)
- [x] useWorkOrders hook with localStorage persistence and seed data
- [x] Work order list with search (title, description, customer) and status filter
- [x] Create work order modal with customer linkage dropdown
- [x] Edit work order modal
- [x] Work order detail drawer (view full info + linked customer)
- [x] Delete work order with confirmation prompt
- [x] Four seed work orders pre-loaded (linked to seed customers)
- [x] Shared status/priority badge helpers (workOrderDisplay util)
- [x] Routing wired (replaced placeholder page)
- [x] Production build passes
- [x] Typecheck passes

Note: Work order data is stored in browser localStorage (no database) per user request. Data layer is isolated in useWorkOrders hook for easy migration to Supabase later.

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

## Milestone 4 — Work Orders

Completed On

2026-07-25

Summary

- WorkOrder, WorkOrderInput, WorkOrderStatus, WorkOrderPriority, and WorkOrderJobType types defined
- useWorkOrders hook with localStorage-backed in-memory store and four seed work orders
- WorkOrdersPage with searchable list, status filter pills, and delete confirmation
- WorkOrderFormModal for create/edit with title, description, customer dropdown, scheduled date, job type, priority, and status
- WorkOrderDetailDrawer showing status/priority badges, description, linked customer details, scheduled time, clock in/out, time on job, tech notes, photos, and signature placeholder
- Shared workOrderDisplay util for consistent status/priority badge styling across list and drawer
- Customer linkage: work orders reference customers by id; drawer resolves and shows customer name, contact, address, and notes
- Routing wired to real WorkOrdersPage; placeholder export removed
- Production build and typecheck pass cleanly

Important Notes

- Work order data is stored in browser localStorage (no database) per user request. Data layer is isolated in useWorkOrders hook for easy migration to Supabase later.
- Photos and signature capture are scaffolded as fields (empty arrays / null) — actual capture is planned for Milestone 6 (Technician Mobile).
- Clock in/out and tech notes fields exist on the model and display in the drawer; editing them is planned for Milestone 6.

Files Created

- src/hooks/useWorkOrders.ts
- src/components/workorders/WorkOrderFormModal.tsx
- src/components/workorders/WorkOrderDetailDrawer.tsx
- src/pages/WorkOrdersPage.tsx
- src/utils/workOrderDisplay.ts

Files Modified

- src/types/index.ts (added WorkOrder + WorkOrderInput + status/priority/jobType types)
- src/App.tsx (import real WorkOrdersPage, removed placeholder import)
- src/pages/PlaceholderPage.tsx (removed WorkOrdersPage export)
- PROJECT_STATUS.md

Database Migrations

None (data layer is localStorage-backed per user request; Supabase migration deferred to end of project)

Known Issues

None

## Milestone 2 — Authentication & User Roles

Completed On

2026-07-24

Summary

- Supabase integration for authentication and database (replaces Convex per environment availability)
- Profiles table extending auth.users with name, role, phone, and is_active fields
- Three user roles: Admin, Manager, Technician with role-based access control
- Auto-create profile trigger fires on every signup; first user becomes Admin, rest default to Technician
- Row Level Security: authenticated users can read all profiles; updates restricted to self or admin; deletes admin-only
- is_admin() security-definer helper used in RLS policies for admin-only actions
- AuthContext provider manages session, profile, role, and exposes signIn/signUp/signOut
- onAuthStateChange listener with async-safe pattern to avoid deadlocks
- Sign in page with email/password, error handling, and redirect to dashboard
- Sign up page with name/email/password, success state, and auto-redirect
- Shared AuthLayout component for consistent auth page styling
- Authenticated app shell with sidebar navigation (desktop) and horizontal scroll nav (mobile)
- Role-aware sidebar: Admin sees all nav items, Manager sees subset, Technician sees Dashboard + Work Orders
- Role-aware dashboard with different stat cards and content per role
- ProtectedRoute component gates access by session and optional role list
- Placeholder pages for upcoming modules (Customers, Work Orders, Scheduling, Reports, Settings)
- Navbar "Sign in" and "Start free trial" buttons now route to /signin and /signup
- React Router v7 for routing

Important Notes

- Backend switched from Convex to Supabase (environment provisioned Supabase; Convex not available)
- Authentication uses Supabase email/password (no magic links or social providers)
- Email confirmation stays OFF per project defaults
- The first account created automatically becomes the Admin — no manual seeding needed
- Client never inserts/updates role directly; role changes are gated by is_admin() RLS policies
- Supabase env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) pre-populated in .env
- Production build and typecheck both pass cleanly

Files Created

- src/lib/supabase.ts
- src/types/index.ts
- src/hooks/useAuth.tsx
- src/components/AuthLayout.tsx
- src/components/AppLayout.tsx
- src/components/ProtectedRoute.tsx
- src/pages/SignInPage.tsx
- src/pages/SignUpPage.tsx
- src/pages/DashboardPage.tsx
- src/pages/PlaceholderPage.tsx

Files Modified

- src/App.tsx (added routing, AuthProvider, protected routes)
- src/components/Navbar.tsx (Sign in / Start free trial now Link to /signin and /signup)
- PROJECT_STATUS.md

Database Migrations

- create_profiles_table: profiles table + is_admin() + handle_new_user trigger + RLS policies

Known Issues

None

---

# Current Session Summary

This section is overwritten after every AI session.

Session Date

25 July 2026

Work Completed

- Completed Milestone 4 — Work Orders (UI only, no database per user request)
- Added WorkOrder, WorkOrderInput, and status/priority/jobType types
- Built useWorkOrders hook with localStorage-backed in-memory store and four seed work orders
- Built WorkOrdersPage with searchable list, status filter pills, detail drawer, and delete confirmation
- Built WorkOrderFormModal (create/edit) with customer linkage dropdown
- Built WorkOrderDetailDrawer showing full work order info + linked customer
- Added shared workOrderDisplay util for consistent badge styling
- Wired routing to replace placeholder page
- Production build and typecheck pass cleanly

Files Created

- src/hooks/useWorkOrders.ts
- src/components/workorders/WorkOrderFormModal.tsx
- src/components/workorders/WorkOrderDetailDrawer.tsx
- src/pages/WorkOrdersPage.tsx
- src/utils/workOrderDisplay.ts

Files Modified

- src/types/index.ts (added WorkOrder + WorkOrderInput + status/priority/jobType types)
- src/App.tsx (import real WorkOrdersPage, removed placeholder import)
- src/pages/PlaceholderPage.tsx (removed WorkOrdersPage export)
- PROJECT_STATUS.md

Current Blocker

None

Recommended Next Step

Start Milestone 5 — Scheduling & Dispatch.

---

# Architecture Decisions

Every important technical decision must be recorded here.

Current Decisions

- React 19
- Vite 6
- Supabase (Backend, Database, Auth) — replaced Convex per environment availability
- Tailwind CSS 4 (via @tailwindcss/vite)
- Motion (animation)
- Lucide React (icons)
- React Router v7 (routing)
- Supabase email/password authentication
- DM Sans font, blue primary / green accent color system, 0.75rem radius
- Role-based access control via profiles table + RLS policies
- Offline-first technician experience (planned)
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

- Supabase (Backend & Database)
- Supabase Auth
- Supabase Row Level Security

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

Milestone 4 — Work Orders

---

# AI Memory

Before writing any code every AI MUST understand:

Completed Work

- MASTER_SPEC.md
- PROJECT_STATUS.md
- Milestone 1 — Marketing Website (complete)
- Milestone 2 — Authentication & User Roles (complete)
- Milestone 3 — Customer Management (complete, UI only — no database yet)
- Milestone 4 — Work Orders (complete, UI only — no database yet)

Current Milestone

Scheduling & Dispatch

Current Task

Start Milestone 5 — set up scheduling & dispatch.

Next Milestone

Technician Mobile

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

Milestone 4 completed, awaiting approval to proceed to Milestone 5.

Last Finished Task

Milestone 4 — Work Orders UI fully built, typechecked, and production build verified.

Current Working File

PROJECT_STATUS.md

Next Recommended Action

Start Milestone 5 — Scheduling & Dispatch.

Estimated Remaining Work

4 milestones remaining.

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

25 July 2026

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

---

# Security Vulnerability Checklist

Every AI MUST review security impact before completing tasks.

## Injection Attacks

- [ ] SQL Injection checked
- [ ] NoSQL/Query Injection checked
- [ ] Command Injection checked
- [ ] Template Injection checked
- [ ] User input sanitized

## Authentication Security

- [ ] Authentication bypass checked
- [ ] Session handling reviewed
- [ ] Token security reviewed
- [ ] OAuth configuration reviewed

## Authorization Security

- [ ] Role escalation checked
- [ ] Permission boundaries tested
- [ ] Multi-tenant data isolation verified
- [ ] Users cannot access other companies' data

## Web Application Security

- [ ] XSS prevention checked
- [ ] CSRF protection checked
- [ ] Clickjacking protection considered
- [ ] Secure headers configured

## Data Security

- [ ] Sensitive data exposure checked
- [ ] File upload security checked
- [ ] Secrets/API keys protected
- [ ] Logs do not expose private data

## Dependency Security

- [ ] npm packages audited
- [ ] Known vulnerabilities reviewed
- [ ] Dependencies updated carefully

## Infrastructure Security

- [ ] Environment variables secured
- [ ] Production configuration reviewed
- [ ] Database permissions reviewed

---

# Vulnerability Register

| Date | Vulnerability | Severity | Status | Fix |
|------|---------------|----------|--------|-----|
| None | None | None | None | None |

---

# Security Testing Tools

Planned:

- npm audit
- Dependabot
- OWASP ZAP
- SAST scanning
- Manual security review
