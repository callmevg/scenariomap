# Project Overview & Technology Stack

## 1. Project Identity
**Project Name**: ScenarioMap (formerly FlowVerse)
**Description**: A Next.js application for visualizing, managing, and analyzing user interface scenarios and flows. It allows product managers, designers, and developers to map out application states (Elements) and user journeys (Scenarios) using interactive visualizations.

## 2. Technology Stack

### Core Framework
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Runtime**: Node.js

### Frontend & UI
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui (built on Radix UI primitives)
- **Icons**: Lucide React
- **Theming**: `next-themes` (System/Dark/Light support)

### Visualization
- **Graph Engine**: D3.js (v7)
    - Used for Force-Directed Graph
    - Used for Metro Map calculations and SVG rendering

### State & Data
- **State Management**: React Context / Local State (`useState`, `useReducer`)
- **Persistence**: Browser `localStorage`
- **Form Handling**: React Hook Form
- **Validation**: Zod

### Development Tools
- **Linting**: ESLint
- **Formatting**: Prettier
- **Package Manager**: npm/yarn/pnpm
- **Build Tool**: Turbopack (Next.js 15 default)
- **Testing**: Playwright (E2E, cross-browser)

## 3. Custom Hooks
- `useToast`: Toast notification system (success, error, info messages).
- `useIsMobile`: Responsive breakpoint detection (768px threshold).
- `useHistory` (in metro-map): Undo/Redo stack for node position changes.

## 4. Project Scripts
```bash
npm run dev           # Start dev server on port 9002
npm run build         # Production build
npm run start         # Start production server
npm run lint          # Run ESLint
npm run typecheck     # TypeScript type checking
npm run test:e2e      # Run Playwright E2E tests
npm run test:e2e:ui   # Playwright interactive UI mode
npm run test:e2e:debug # Playwright debug mode
npm run test:e2e:report # View test report
```
