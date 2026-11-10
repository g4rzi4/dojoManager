# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Four roles work inside each dojo, and each deserves the same level of care:

- **Administrador:** owner of a martial arts school. Manages teachers, students, events and all collections.
- **Profesor:** sub-administrator. Sees only their own group of students, enrolls them, sets their own event prices and confirms payments credited to their key.
- **Tutor:** parent or guardian with one or more children enrolled. Checks each child's record and pays monthly fees and events.
- **Alumno:** student with an account. Checks their own record, payments and calendar.

Above them, the **Superadministrador** owns the platform: creates dojos and their administrators, and does not see any dojo's students or payments.

Hackathon judges also evaluate the app through demo accounts.

## Product Purpose

DojoManager runs the day-to-day of a martial arts school: students, belts, attendance, teachers, monthly fees, events with paid modalities, enrollment by QR, and notifications. Success means families can see what they owe and pay it online, and staff stop chasing payments by hand.

## Positioning

Built around how a dojo actually works: teacher keys that credit each charge to the right teacher, per-teacher prices, tournament categories by branch, belt and age, and PayPal payment that enrolls the student without manual confirmation.

## Operating Context

Spanish-language (es-MX), amounts in Mexican pesos. Staff work from a computer; families often arrive on a phone, including from QR links shared by WhatsApp. Being built for a PayPal hackathon with an AI component, using the PayPal sandbox.

## Capabilities and Constraints

React 19, TypeScript, Vite, Tailwind CSS 4 frontend. Express, Prisma and PostgreSQL backend. Access is role-scoped and enforced by the backend. Each dojo sees only its own data; the filter lives in `backend/src/lib/prisma.ts`. The AI assistant is planned and does not exist yet, so the interface must not present it as available.

## Brand Commitments

Name: DojoManager. User reference for the visual redesign: flashka.ai, as inspiration for its visual language only, never its brand, name, mascot or assets.

## Evidence on Hand

Demo accounts and fictional students in `backend/prisma/seed-demo.ts`. There are no real customers, testimonials or usage figures, and none may be invented.

## Product Principles

- Every role finds its next action right away: what is owed, what needs confirming, what comes next.
- Money is never ambiguous: amount, status and method are always legible.
- Say plainly what is not available instead of showing controls that do nothing.
- Phone and computer are both first-class.

## Accessibility & Inclusion

WCAG 2.1 AA as the working target. Respect reduced-motion preferences.
