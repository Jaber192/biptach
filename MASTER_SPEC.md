# Biptach Master Specification

Version: 1.0.0

Last Updated: 24 July 2026

---

# Project Overview

Biptach is a modern HVAC Field Service Management (FSM) SaaS designed specifically for HVAC companies ranging from solo operators to businesses with up to 50 technicians.

The goal is to build the easiest HVAC software to learn and use while providing all of the essential tools needed to manage technicians, customers, scheduling, dispatching, and work orders.

The product should feel modern, fast, lightweight, and mobile-first.

---

# Vision

Biptach exists to replace paper scheduling, whiteboards, spreadsheets, and overly complicated software.

The product should prioritize:

- Simplicity
- Speed
- Reliability
- Beautiful UI
- Mobile-first experience
- Real-time collaboration

Every feature should reduce manual work or save time.

---

# Target Customers

Primary Market

- HVAC companies
- 10–50 technicians
- United States

Typical Customer

- Owner-operated companies
- Regional HVAC businesses
- Companies currently using paper, Excel, Google Calendar, or outdated software
- Companies wanting a simpler alternative to enterprise software

---

# Product Philosophy

Never build features simply because competitors have them.

Every feature must satisfy at least one of these:

- Saves time
- Reduces manual work
- Improves technician productivity
- Improves customer experience
- Helps managers make decisions

The software should always remain simple.

---

# Tech Stack

Frontend

- React 19
- Vite
- TypeScript
- Tailwind CSS 4
- shadcn/ui
- Motion
- React Router v7

Backend

- Convex

Authentication

- OIDC Authentication

Forms

- React Hook Form
- Zod

Icons

- Lucide React

---

# Database

Users

Fields

- tokenIdentifier
- name
- email
- role
- phone
- isActive

Customers

Fields

- name
- email
- phone
- address
- city
- state
- zip
- notes
- createdBy

Work Orders

Fields

- title
- description
- jobType
- priority
- status
- customerId
- assignedTo
- createdBy
- scheduledDate
- clockInTime
- clockOutTime
- techNotes
- photos
- signatureStorageId

---

# User Roles

Admin

Can

- Manage users
- Manage customers
- Create work orders
- Dispatch technicians
- View reports
- Manage settings

Manager

Can

- Manage customers
- Create work orders
- View reports
- Monitor technicians

Technician

Can

- View assigned jobs
- Start jobs
- Complete jobs
- Upload photos
- Capture signatures
- Add technician notes

---

# Design System

Font

DM Sans

Primary Color

Blue

Accent Color

Green

Border Radius

0.75rem

Style

- Clean
- Friendly
- Modern
- Professional
- Mobile First

Support

- Light Mode
- Dark Mode

---

# UI Principles

Every screen should be:

- Easy to understand
- Fast to navigate
- Mobile responsive
- Consistent

Avoid unnecessary clicks.

Large buttons for technicians.

---

# Coding Standards

Always

- Use TypeScript
- Write reusable components
- Keep components small
- Avoid duplicated code
- Use descriptive names
- Keep folder structure organized

Never

- Hardcode values
- Duplicate business logic
- Mix UI with business logic

---

# Architecture Rules

Every API must require authentication.

Every query must validate permissions.

Every page should be responsive.

Business logic should remain inside backend functions whenever possible.

Use reusable UI components.

---

# Current MVP

Milestone 1

Marketing Website

Milestone 2

Authentication

Milestone 3

Customer Management

Milestone 4

Work Orders

Milestone 5

Scheduling & Dispatch

Milestone 6

Technician Mobile

Milestone 7

Notifications

Milestone 8

Reporting & Analytics

---

# Future Features (Not MVP)

Live Technician Tracking

Customer Live Tracking

AI Dispatcher

AI Route Optimization

Inventory Management

Payroll

Fleet Management

AI Customer Support

Voice Assistant

Predictive Maintenance

Customer Portal

Online Payments

---

# Definition of Done

A milestone is complete only when:

- No TypeScript errors
- No build errors
- Responsive on desktop and mobile
- Authentication works
- Permissions work correctly
- UI follows design system
- Code is reusable
- Feature has been tested
- No known critical bugs remain

---

# AI Instructions

Every AI working on this project must:

1. Read this file completely before writing any code.

2. Never change the overall architecture without explicit approval.

3. Build only the requested milestone.

4. Never modify completed features unless fixing a bug.

5. Reuse existing components whenever possible.

6. Follow the design system.

7. Keep the codebase clean and scalable.

8. Explain any major architectural decision before implementing it.

9. Never add features that are not requested.

10. Always prioritize simplicity over complexity.

---

# Offline-First Requirements

Biptach must support offline operation for technicians.

When internet is unavailable:

- Technician can view previously synced assigned jobs.
- Technician can read customer information.
- Technician can view job details.
- Technician can add technician notes.
- Technician can capture customer signatures.
- Technician can take photos.
- Technician can start and complete jobs.
- All changes are stored locally on the device.

When the device reconnects:

- Automatically synchronize all pending changes.
- Upload photos and signatures.
- Resolve conflicts safely.
- Update the dashboard in real time.

Managers and dispatchers require an internet connection.
Offline mode is primarily designed for technicians in the field.
---
# Folder Structure

The project must maintain a clean, scalable folder structure.

Example:

src/
├── components/
├── pages/
├── layouts/
├── hooks/
├── lib/
├── services/
├── utils/
├── types/
├── assets/
├── styles/

convex/
├── schema.ts
├── auth.ts
├── users.ts
├── customers.ts
├── workOrders.ts

Every new feature should be added to the appropriate folder.
Avoid creating duplicate components or business logic.

---

# Third-Party Integrations

Current

- Convex (Backend & Database)
- Convex File Storage
- OIDC Authentication
- Google Maps Platform
- Email Provider
- SMS Provider

Future

- Stripe
- QuickBooks
- Twilio
- Google Calendar
- Outlook Calendar

---

# Non-Functional Requirements

The application must:

- Be mobile-first.
- Load pages in under 2 seconds under normal conditions.
- Support offline mode for technicians.
- Synchronize automatically when internet returns.
- Use secure authentication.
- Enforce role-based permissions.
- Scale to at least 50 technicians per company.
- Support dark mode.
- Minimize battery usage on technician devices.
- Be accessible where practical.

---

# Success Metrics

The MVP is successful when:

- A customer can be created in under 30 seconds.
- A work order can be created in under 30 seconds.
- A technician can start a job in under 10 seconds.
- Dashboard loads in under 2 seconds.
- Offline technician mode works correctly.
- Photo uploads work reliably.
- Signature capture works correctly.
- Managers can monitor technician progress in real time.
- System supports at least 50 technicians without noticeable performance issues.

---


# Future Database Expansion

Location Tracking

- technicianId
- latitude
- longitude
- timestamp
- accuracy
---

