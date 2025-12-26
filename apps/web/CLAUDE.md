# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server on port 3000
pnpm build        # TypeScript check + Vite build
pnpm check-types  # TypeScript only (no build)
pnpm lint         # ESLint
pnpm preview      # Preview production build
```

## Architecture

React 19 + Vite SPA with React Router for routing and TRPC for type-safe API calls.

### Key Files

- `src/app.tsx` - Route definitions
- `src/trpc.ts` - TRPC client setup with auth token from cookies
- `src/main.tsx` - App entry point with QueryClient and TRPC provider
- `src/constants.ts` - Environment variables (VITE_API_URL)

### Directory Structure

- `src/pages/` - Page components organized by route
  - `src/pages/dashboard/` - Main app pages (subscribers, campaigns, templates, etc.)
  - `src/pages/auth/` - Login/signup
  - `src/pages/onboarding/` - Setup flow
- `src/components/` - Reusable components
- `src/hooks/` - Custom React hooks (useSession, usePagination, useDebounce, etc.)
- `src/utils/` - Utility functions

### Data Fetching

TRPC with React Query. The client is configured in `src/trpc.ts`:

```typescript
import { trpc } from "@/trpc"

// In components:
const { data } = trpc.subscriber.list.useQuery({ page: 1 })
const mutation = trpc.subscriber.create.useMutation()
```

Auth token is stored in cookies (`js-cookie`) and sent via Authorization header.

### Routing Structure

```
/                     - Auth (login/signup)
/dashboard            - Main dashboard
/dashboard/subscribers
/dashboard/campaigns
/dashboard/campaigns/:id
/dashboard/templates
/dashboard/settings
/dashboard/settings/webhooks/:id
/dashboard/analytics
/dashboard/lists
/dashboard/messages
/onboarding           - First-time setup
/unsubscribe          - Public unsubscribe page
/verify-email         - Email verification
```

### UI Components

Uses `@repo/ui` (shared Shadcn components) and local components. Key libraries:

- Shadcn UI (via @repo/ui)
- React Hook Form + Zod for forms
- Recharts for analytics charts
- Monaco Editor for email template editing
- Sonner for toast notifications
- Lucide React for icons

### Development

- `react-scan` is enabled in dev mode for performance monitoring
- PWA support via `vite-plugin-pwa`
