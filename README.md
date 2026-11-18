# SpendMate — Phase 1 (Frontend)

A mobile-first app for managing event and personal expenses: agreed amounts, advances, partial payments, final settlements and pending balances.

Phase 1 is the complete frontend. It runs on sample data saved in your browser (localStorage). There is no backend or login yet. Those arrive in Phases 2 and 3.

## Run locally

Requirements: **Node.js 20.19+ or 22+** (Vite 7 needs this). Check with `node -v`.

```bash
cd spendmate
npm install
npm run dev
```

Open http://localhost:5173. To try it on your phone, connect it to the same Wi-Fi and open the "Network" URL that Vite prints.

Other commands:

| Command | What it does |
|---|---|
| `npm run typecheck` | Type-checks the project with TypeScript only |
| `npm run build` | Type-checks, then builds a production bundle into `dist/` |
| `npm run preview` | Serves the production build locally |

## What works in Phase 1

- **Navigation**: bottom tab bar on mobile with a centre "+" button, sidebar on desktop, and hash routes such as `#/events/:id`.
- **Dashboard** shows:
  - Total expenses, paid and pending amounts
  - Active and completed event counts
  - Payments due within 7 days and upcoming payments
  - Monthly spend chart, event summary, category donut and budget overview
  - Recent transactions and top vendors
  - A welcome screen when there is no data yet
- **Events** can be created, edited, archived, deleted (with confirmation) and moved between statuses. The events list has search, status filters and sorting.
- **Event detail** shows:
  - Budget used, remaining budget and an over-budget warning
  - Payment status overview with filtering
  - Tabs: Expenses (sortable), Upcoming, Timeline and Activity
- **Expenses** record an agreed amount with category, vendor and phone, expense date, due date and notes, plus an optional initial advance.
  - Zero payment is allowed.
  - You can add a custom category from inside the form.
  - A typed vendor name is linked to a saved vendor, or saved as a new one.
- **Payments**: advance, partial and final settlement, with amount, date, method (Cash, UPI, Bank Transfer, Credit Card, Debit Card, Other), reference and notes.
  - Quick-fill buttons: full balance, 50% and 25%.
  - The form previews the new balance and warns before an overpayment.
  - Payments can be edited. Deleting one asks for confirmation first.
- **Payment calculations**:
  - Total Paid = sum of payment records.
  - Outstanding = Agreed − Paid.
  - Status is Pending, Partially Paid, Paid or Overpaid.
  - Money is calculated in whole paise, so there are no floating-point rounding errors.
- **Audit trail**: payments, expenses and events are soft-deleted. Every edit and deletion is logged with before → after values and is shown in each expense's and event's activity history.
- **Reports**: Overview, by event, category and vendor, monthly, yearly, Paid vs Pending, and Budget vs Actual.
  - Filters: date range, event and category.
  - Charts: pie/donut, bar and line, plus budget progress bars.
  - **CSV export** works for every report. The files open in Excel and handle the ₹ symbol correctly.
- **Vendors**: list, search, add and edit, with linked expenses and their paid/agreed totals.
- **Profile**: name, default currency (INR by default), light/dark/system theme and notification preferences. You can also reload the sample data or clear everything.
- **Design**: light and dark mode, keyboard-accessible dialogs (Esc to close, focus trapped inside), labelled form fields with error messages, and support for reduced-motion settings.

### Shown as placeholders (not functional yet)

| Feature | Arrives in |
|---|---|
| Receipt and cover photo uploads | Phase 7 |
| Sharing and roles | Phase 6 |
| Login, logout, account deletion, changing email or phone | Phase 2 |
| Delivery of notifications | Later phase |
| PDF export | Later phase |

These are clearly labelled in the UI.

## Project structure

```
src/
  types.ts                 Domain model (mirrors the planned Supabase tables)
  data/constants.ts        Event types, statuses, categories, payment methods
  data/sampleData.ts       Demo data (dates relative to today)
  lib/calc.ts              Payment status & balance calculations, derived totals
  lib/reports.ts           Report grouping, filters, CSV export
  lib/format.ts            ₹ formatting (Indian grouping), dates, amount parsing
  lib/router.tsx           Tiny hash router (no server rewrites needed)
  store/AppStore.tsx       Reducer + audit logging + localStorage persistence
  store/UIContext.tsx      Modals, confirm dialog, toasts
  components/ui/           Buttons, fields, modal/bottom sheet, badges, progress
  components/charts/       Dependency-free SVG bar, line, donut charts
  components/forms/        Event, Expense, Payment, Vendor forms
  components/domain.tsx    Event cards, expense rows, payment history, activity log
  pages/                   Dashboard, Events, EventDetail, ExpenseDetail, Reports, Vendors, Profile
```

All data changes go through the store's actions (`event/add`, `payment/update`, `payment/delete`, …). In Phase 3 the store's persistence layer will be replaced with Supabase calls. The screens won't need to change.

## Next steps

**Phase 2 – Authentication & profile.** Before starting:
1. Create a free project at https://supabase.com.
2. Under **Authentication → Providers → Email**, turn on Email OTP (6-digit code). Optionally turn on Google, and Phone with an SMS provider such as Twilio, MessageBird or Vonage.
3. Copy the **Project URL** and the **anon public key** from Project Settings → API. Never share the service-role key.

Then ask for Phase 2. It will add:
- Supabase client
- Welcome, signup and login screens
- Email OTP verification
- Forgot and reset password
- Profile creation
- Protected routes and logout

**Phase 3 – Database.** SQL migrations for the tables listed in the spec, with Row Level Security policies. The store's actions will then be switched over to Supabase.
