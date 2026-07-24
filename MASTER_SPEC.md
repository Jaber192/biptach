# Biptach Master Specification

Version: 1.0

Last Updated: 24 July 2026

---

# Project Overview

Biptach is a modern HVAC Field Service Management (FSM) SaaS designed specifically for small-to-medium HVAC companies with approximately 10–50 technicians.

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

# Current Progress

Current Milestone

Project Initialization

Completed

- GitHub Repository Created
- Bolt Connected

In Progress

- Project Setup

Next

- Marketing Landing Page

Known Issues

None
