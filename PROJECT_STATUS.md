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

100%

Current Release

v0.0.1

Current Phase

MVP Development

---

# Milestone Progress

| Milestone | Status | Progress |
|------------|---------|----------|
| 1. Marketing Website | ✅ Completed | 100% |
| 2. Authentication & User Roles |rebuild  | 0% |
| 3. Customer Management | ✅ Completed | 100% |
| 4. Work Orders | ✅ Completed | 100% |
| 5. Scheduling & Dispatch | ✅ Completed | 100% |
| 6. Technician Mobile | ✅ Completed | 100% |
| 7. Notifications | ✅ Completed | 100% |
| 8. Reporting & Analytics | ✅ Completed | 100% |

---

# Current Development State

Current Milestone

MVP Complete

Status

✅ All 8 milestones completed

Current Task

All MVP milestones complete.

Next Task

Future enhancements (email/SMS notifications, offline sync, Stripe payments, QuickBooks, Google Maps, etc.) as described in MASTER_SPEC.md Future Features.

Estimated Completion

MVP complete

---

# Current Milestone Checklist

## Reporting & Analytics

- [x] ReportsPage with KPI cards (total work orders, completed, hours logged, active technicians)
- [x] Date range filter (7d / 30d / 90d / all time)
- [x] Weekly trend bar chart (created vs completed, last 6 weeks)
- [x] Status breakdown with progress bars
- [x] Job type distribution with progress bars
- [x] Priority distribution with progress bars
- [x] Top customers by activity table
- [x] Technician productivity table (assigned, completed, active, hours, avg per job)
- [x] Real ReportsPage wired into App.tsx; placeholder export removed
- [x] Production build passes
- [x] Typecheck passes

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

## Milestone 8 — Reporting & Analytics

Completed On

2026-07-27

Summary

- ReportsPage built with KPI cards: total work orders, completed, hours logged, active technicians
- Date range filter: 7 days, 30 days, 90 days, all time
- Weekly trend bar chart comparing created vs completed work orders over the last 6 weeks
- Status breakdown with color-coded progress bars and percentages
- Job type distribution with progress bars (repair, install, maintenance, inspection, emergency, other)
- Priority distribution with progress bars (low, medium, high, urgent)
- Top customers by activity table (total jobs, completed, open)
- Technician productivity table (assigned, completed, active, hours logged, avg hours per job)
- Real ReportsPage wired into App.tsx; placeholder export removed from PlaceholderPage
- Production build and typecheck pass cleanly

Important Notes

- All analytics are computed client-side from the Supabase-backed hooks (no separate analytics queries; data comes from the realtime work_orders/customers/technicians subscriptions).
- Revenue reporting is not included (no billing data in MVP); planned for a future milestone with Stripe integration.

Files Created

- src/pages/ReportsPage.tsx

Files Modified

- src/App.tsx (import real ReportsPage, removed from PlaceholderPage)
- src/pages/PlaceholderPage.tsx (removed ReportsPage export)
- PROJECT_STATUS.md

Database Migrations

None

Known Issues

None

## Milestone 7 — Notifications

Completed On

2026-07-27

Summary

- AppNotification, NotificationInput, and NotificationType types added
- useNotifications hook + NotificationsProvider backed by Supabase notifications table with realtime updates
- NotificationBell component: header bell with unread count badge and a dropdown panel showing recent notifications with mark-read and delete actions
- NotificationsPage with All / Unread filters, mark read, mark all read, delete, and clear all
- Bell wired into both desktop and mobile app headers
- /notifications route added (all roles)
- Notifications emitted on work order create, assign, reassign, start, clock in, clock out, and complete
- Notification emitted on customer create
- Notifications nav item added to sidebar (all roles)
- Production build and typecheck pass cleanly

Important Notes

- Notifications are in-app only (no email/SMS delivery yet). Data is stored in the Supabase notifications table and synced via realtime subscriptions.
- Email/SMS delivery is planned for a future milestone once a provider is selected.

Files Created

- src/hooks/useNotifications.tsx
- src/components/NotificationBell.tsx
- src/pages/NotificationsPage.tsx

Files Modified

- src/types/index.ts (added Notification types)
- src/App.tsx (wrapped app in NotificationsProvider, added /notifications route)
- src/components/AppLayout.tsx (added NotificationBell to headers, Notifications nav item)
- src/pages/WorkOrdersPage.tsx (emit notifications on create / assign / reassign)
- src/pages/SchedulingPage.tsx (emit notification on assign)
- src/pages/CustomersPage.tsx (emit notification on customer create)
- src/components/technician/JobDetailSheet.tsx (emit notifications on start / clock in / clock out / complete)
- PROJECT_STATUS.md

Database Migrations

Supabase tables: customers, technicians, work_orders, notifications (all with RLS, owner-scoped via user_id)

Known Issues

None

## Milestone 6 — Technician Mobile

Completed On

2026-07-27

Summary

- patchWorkOrder method added to useWorkOrders hook for partial field updates (status, clock in/out, notes, photos, signature)
- SignaturePad canvas component with pointer-based drawing, save/clear, and PNG data URL output
- PhotoUpload component with file input (camera capture), base64 thumbnails, and remove
- JobDetailSheet bottom-sheet drawer: start job, clock in/out, complete job, technician notes, photos, signature
- TechnicianMobilePage with mobile-first assigned jobs list, status filters (active/scheduled/completed/all), and search
- Seed work orders now assigned to seed technicians
- Technician dashboard now shows live stats (active jobs, scheduled today, completed, hours logged) and a link to My Jobs
- "My Jobs" nav item added to sidebar for technician role
- Routing wired to /my-jobs (all roles)
- Production build and typecheck pass cleanly

Important Notes

- Signature and photo data are stored as base64 data URLs in the Supabase work_orders table (photos[] and signature_storage_id columns). No Supabase Storage buckets are used yet; data URLs are stored inline.
- Offline-first sync is planned for a future milestone.

Files Created

- src/components/technician/SignaturePad.tsx
- src/components/technician/PhotoUpload.tsx
- src/components/technician/JobDetailSheet.tsx
- src/pages/TechnicianMobilePage.tsx

Files Modified

- src/hooks/useWorkOrders.ts (added patchWorkOrder + WorkOrderPatch; assigned seed work orders to seed technicians)
- src/pages/DashboardPage.tsx (live stats per role, My Jobs link for technicians)
- src/components/AppLayout.tsx (added My Jobs nav item for technician role)
- src/App.tsx (added /my-jobs route)
- PROJECT_STATUS.md

Database Migrations

Supabase tables: customers, technicians, work_orders, notifications (all with RLS, owner-scoped via user_id)

Known Issues

None

## Scheduling & Dispatch

- [x] Technician type and TechnicianInput type defined
- [x] useTechnicians hook with localStorage persistence and seed data (3 technicians)
- [x] Week-view calendar board with 7 day columns
- [x] Scheduled work orders appear as cards on their scheduled day
- [x] Week navigation (prev / next / today) with date range display
- [x] Technician assignment modal (dispatch) — assign or unassign
- [x] Technician color dots on cards and in legend
- [x] Unscheduled work orders list with quick-assign
- [x] Routing wired (replaced placeholder page)
- [x] Production build passes
- [x] Typecheck passes

Note: Technician data is stored in the Supabase technicians table with realtime updates via the useTechnicians hook.

## Milestone 5 — Scheduling & Dispatch

Completed On

2026-07-25

Summary

- Technician and TechnicianInput types defined
- useTechnicians hook backed by Supabase technicians table with realtime updates
- SchedulingPage with week-view calendar board (7 day columns)
- Scheduled work orders render as cards on their scheduled day, sorted by time
- Week navigation: previous / next / today, with formatted date range header
- Technician legend with color-coded avatars at top of board
- Click any job card to open an assignment modal — assign a technician or unassign
- Assigned technician shown with color dot on each card; unassigned cards show "Assign" prompt
- Unscheduled work orders list below the board with quick-assign buttons
- Routing wired to real SchedulingPage; placeholder export removed
- Production build and typecheck pass cleanly

Important Notes

- Technician data is stored in the Supabase technicians table with realtime updates via the useTechnicians hook.
- Drag-and-drop rescheduling is not implemented (kept simple per spec philosophy); jobs are scheduled via the Work Orders form's date picker and dispatched from this board.

Files Created

- src/hooks/useTechnicians.ts
- src/pages/SchedulingPage.tsx

Files Modified

- src/types/index.ts (added Technician + TechnicianInput types)
- src/App.tsx (import real SchedulingPage, removed placeholder import)
- src/pages/PlaceholderPage.tsx (removed SchedulingPage export)
- PROJECT_STATUS.md

Database Migrations

Supabase tables: customers, technicians, work_orders, notifications (all with RLS, owner-scoped via user_id)

Known Issues

None

## Milestone 4 — Work Orders

Completed On

2026-07-25

Summary

- WorkOrder, WorkOrderInput, WorkOrderStatus, WorkOrderPriority, and WorkOrderJobType types defined
- useWorkOrders hook backed by Supabase work_orders table with realtime updates
- WorkOrdersPage with searchable list, status filter pills, and delete confirmation
- WorkOrderFormModal for create/edit with title, description, customer dropdown, scheduled date, job type, priority, and status
- WorkOrderDetailDrawer showing status/priority badges, description, linked customer details, scheduled time, clock in/out, time on job, tech notes, photos, and signature placeholder
- Shared workOrderDisplay util for consistent status/priority badge styling across list and drawer
- Customer linkage: work orders reference customers by id; drawer resolves and shows customer name, contact, address, and notes
- Routing wired to real WorkOrdersPage; placeholder export removed
- Production build and typecheck pass cleanly

Important Notes

- Work order data is stored in the Supabase work_orders table with realtime updates via the useWorkOrders hook.
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

Supabase tables: customers, technicians, work_orders, notifications (all with RLS, owner-scoped via user_id)

Known Issues

None


## Milestone 2 — Company Authentication & Multi-Tenant Foundation

### Objective

Build the complete authentication, authorization, company management, and multi-tenant foundation of Biptach.

This milestone is the backbone of the entire application.

Every future feature (Customers, Work Orders, Scheduling, Reports, Notifications, Billing, etc.) depends on this architecture.

No future milestone should be built until this milestone is fully completed.

---

# Overview

Biptach is a multi-tenant SaaS.

Every HVAC company is an independent workspace.

Each company owns its own:

- Users
- Customers
- Work Orders
- Technicians
- Notifications
- Reports
- Settings
- Files
- Subscription

No company should ever be able to access another company's data.

The Company is the root entity of the system.

Everything belongs to a company.

---

# Authentication

Authentication must use Supabase Authentication.

Supported methods:

- Email
- Password

Required features:

- Login
- Logout
- Forgot Password
- Reset Password
- Session Persistence

Email verification should remain configurable.

---

# Registration Flow

There are only TWO ways to register.

## Option 1 — Create Company

This option is for HVAC business owners.

Required information:

- Company Name
- Full Name
- Email
- Password

After successful registration the system automatically creates:

- Company
- Owner Profile
- Company Membership
- Default Company Settings
- Default Subscription (Trial or Starter)

The Owner is automatically logged in.

The user never selects the Owner role manually.

The system assigns it automatically.

---

## Option 2 — Join Existing Company

This option is for employees.

Employees cannot create companies.

Employees must join an existing company.

Joining should support:

- Invitation Link
or
- Company Invitation Code

The invitation determines:

- Company
- Assigned Role

Employees never choose their own role.

The system assigns the role automatically.

---

# Company Roles

Four roles exist.

## Owner

Highest permission level.

Can:

- Manage company
- Manage subscription
- Invite users
- Remove users
- Promote users
- Demote users
- Manage billing
- Access every feature
- Manage company settings

Only one Owner should exist per company unless ownership is transferred.

---

## Manager

Can:

- Manage customers
- Create work orders
- Assign technicians
- View reports
- Monitor technician progress

Cannot:

- Manage subscription
- Transfer ownership
- Delete company

---

## Dispatcher

Can:

- Schedule jobs
- Dispatch technicians
- Update work order status
- View technician availability
- Manage daily operations

Cannot:

- Manage billing
- Manage subscription
- Delete company

---

## Technician

Can:

- View assigned work
- Start jobs
- Complete jobs
- Upload photos
- Capture signatures
- Add technician notes
- Work offline
- Synchronize data when online

Cannot access management features.

---

# Dashboard Architecture

The application must use ONE dashboard.

Separate dashboards should not exist.

Navigation is generated dynamically based on the authenticated user's role.

Example

Owner

- Everything

Manager

- Management modules

Dispatcher

- Dispatch modules

Technician

- Technician modules

Navigation should never expose unauthorized pages.

---

# Company Membership

Every authenticated user belongs to exactly one company.

Every profile must contain:

- Company
- Role

Every business object must inherit the company from the authenticated user.

---

# Authorization

Every protected page must verify:

- User is authenticated
- User belongs to a company
- User has permission

Unauthorized access must return an error or redirect appropriately.

---

# Multi-Tenant Rules

Every business object belongs to one company.

Examples:

Customer

→ Company

Work Order

→ Company

Notification

→ Company

Technician Location

→ Company

Reports

→ Company

Settings

→ Company

No cross-company access should ever be possible.

---

# Database Foundation

The database architecture should be redesigned around Company ownership.

Core entities include:

- Companies
- Profiles
- Company Memberships
- Invitations
- Customers
- Work Orders
- Notifications
- Technician Locations
- Company Settings
- Subscriptions

The Company must be the root entity.

Do not build a user-centric architecture.

---

# Invitation System

The Owner should be able to invite:

- Managers
- Dispatchers
- Technicians

The invitation contains:

- Company
- Assigned Role

After acceptance the employee automatically joins the company.

---

# Subscription Ownership

Subscriptions belong to companies.

Individual users never purchase subscriptions.

Only the Owner manages:

- Billing
- Subscription
- Seats
- Company Plan

---

# Offline Support

Offline mode is required only for Technicians.

Managers, Dispatchers, and Owners require internet connectivity.

Technicians must be able to:

- View assigned work
- Start jobs
- Complete jobs
- Capture signatures
- Upload photos
- Add notes

Changes synchronize automatically when internet returns.

---

# Security

Authentication must be secure.

Authorization must be role-based.

Every database query must enforce company isolation.

Never trust client-side role checks.

Server-side validation is mandatory.

---

# Success Criteria

Milestone 2 is complete only when:

- Company creation works
- Owner is automatically created
- Employees can join existing companies
- Invitation system works
- Role permissions work correctly
- Company isolation works correctly
- Dashboard navigation changes by role
- Authentication works
- Session persistence works
- Unauthorized users cannot access restricted resources
- Multi-tenant architecture is fully operational
- The foundation is stable enough for Milestone 3 (Customer Management)


---

# Current Session Summary

This section is overwritten after every AI session.

Session Date

27 July 2026 (session 4)

Work Completed

- Verified full project state against the database and codebase
- Fixed critical bug: handle_new_user() trigger hardcoded 'manager' role for every signup, so the first user could never become admin (no UI to promote). Updated the trigger to assign 'admin' to the first signup and 'manager' thereafter, matching the MASTER_SPEC requirement.
- Removed redundant condition in NotificationBell filter (n.recipientRole === role || n.recipientRole === role).
- Corrected PROJECT_STATUS.md: earlier milestone notes incorrectly claimed the data layer was localStorage-backed. The app actually uses Supabase (Postgres + RLS + realtime) for all business data. Updated all misleading localStorage/no-database/deferred-migration statements.
- Confirmed production build and typecheck pass; all 5 Supabase tables (profiles, customers, technicians, work_orders, notifications) exist with RLS enabled and correct owner-scoped policies.

Files Modified

- supabase migration: fix_first_user_admin_role (handle_new_user updated)
- src/components/NotificationBell.tsx (redundant filter condition removed)
- PROJECT_STATUS.md (corrected stale localStorage claims, updated session summary)

Current Blocker

None

Recommended Next Step

MVP is complete. Future work: email/SMS notifications, offline sync, Stripe payments, QuickBooks, Google Maps, and other features listed in MASTER_SPEC.md Future Features.

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

Milestone 8 — Reporting & Analytics (MVP complete)

---

# AI Memory

Before writing any code every AI MUST understand:

Completed Work

- MASTER_SPEC.md
- PROJECT_STATUS.md
- Milestone 1 — Marketing Website (complete)
- Milestone 2 — Authentication & User Roles (complete)
- Milestone 3 — Customer Management (complete, Supabase-backed)
- Milestone 4 — Work Orders (complete, Supabase-backed)
- Milestone 5 — Scheduling & Dispatch (complete, Supabase-backed)
- Milestone 6 — Technician Mobile (complete, Supabase-backed)
- Milestone 7 — Notifications (complete, in-app only — no email/SMS yet)
- Milestone 8 — Reporting & Analytics (complete)

IMPORTANT CORRECTION (27 July 2026, session 4): Earlier milestone notes below incorrectly state the data layer is "localStorage-backed". This is OUTDATED. The app uses Supabase (Postgres + RLS + realtime) for all business data: customers, technicians, work_orders, and notifications. The hooks (useCustomers, useWorkOrders, useTechnicians, useNotifications) query Supabase directly and subscribe to postgres_changes for realtime updates. Ignore any "localStorage" / "no database yet" / "Supabase migration deferred" statements in the per-milestone notes — they were written before the Supabase migration was applied and were never corrected. The only localStorage usage is the theme toggle (useTheme).

Current Milestone

MVP Complete

Current Task

All 8 MVP milestones complete.

Next Milestone

Future enhancements (email/SMS, offline sync, Stripe, QuickBooks, Google Maps, etc.)

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

All 8 MVP milestones complete.

Last Finished Task

Verification + fixes: corrected first-user admin role bug, cleaned up NotificationBell, and reconciled PROJECT_STATUS.md with the actual Supabase-backed data layer.

Current Working File

PROJECT_STATUS.md

Next Recommended Action

MVP is complete. Future work: email/SMS notifications, offline sync, Stripe payments, QuickBooks, Google Maps, and other features listed in MASTER_SPEC.md Future Features.

Estimated Remaining Work

MVP complete. Future enhancements as described in MASTER_SPEC.md.

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

27 July 2026

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
