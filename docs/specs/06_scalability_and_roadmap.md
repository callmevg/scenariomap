# Scalability, Maintainability & Roadmap

## 1. Scalability & Maintainability

### Code Organization
- **Separation of Concerns**:
    - **Data Layer**: `localStorage.ts` is the single source of truth for data logic. It can be swapped for an API client without affecting UI components.
    - **Visualization Layer**: `d3-graph.tsx` and `metro-map.tsx` encapsulate complex D3 logic, exposing simple props (`elements`, `scenarios`) to the parent.
    - **Controller Layer**: `page.tsx` handles the orchestration, state syncing, and event handling.

### Type Safety
- Strict TypeScript interfaces (`UIElement`, `UIScenario`) are used throughout.
- `zod` schemas in forms ensure runtime validation matches compile-time types.

### Performance Considerations
- **Memoization**: `useMemo` and `useCallback` are used extensively in visualization components to prevent expensive D3 recalculations on unrelated state changes (e.g., hovering).
- **Simulation Management**: The D3 simulation is managed within `useEffect` hooks to run outside the React render cycle.

## 2. Testing Strategy

### E2E Test Suite
The project uses **Playwright** for comprehensive end-to-end testing across 3 browsers (Chromium, Firefox, WebKit).

#### Test Files
| File | Coverage | Test Count |
|------|----------|------------|
| `element-management.spec.ts` | Element CRUD, validation, bug status | 7 |
| `scenario-management.spec.ts` | Scenario CRUD, methods, grouping, visibility | 8 |
| `multi-graph-workspace.spec.ts` | Tab management, graph isolation, persistence | 8 |
| `visualization-views.spec.ts` | D3 Graph, Metro Map, Table View interactions | 12 |
| `data-portability.spec.ts` | Import/Export, duplicates, data integrity | 7 |
| `ui-ux-theme.spec.ts` | Theme switching, modals, toasts, accessibility | 14 |
| `file-storage.spec.ts` | Save/Open to server, file listing, deletion | 10 |

**Total: 66 E2E tests**

#### Test Commands
```bash
npm run test:e2e          # Run all tests headless
npm run test:e2e:ui       # Interactive UI mode
npm run test:e2e:debug    # Debug mode with inspector
npm run test:e2e:report   # View HTML report
```

#### Test Principles
- **Isolation**: Each test clears `localStorage` before running.
- **Real Interactions**: Tests simulate actual user behavior (clicks, drags, keyboard).
- **Cross-Browser**: All tests run on Chromium, Firefox, and WebKit.
- **Visual Verification**: Screenshots captured on failure.

## 3. Future Roadmap

### Short Term
- **Undo/Redo**: Implement a global history stack for all graph operations (not just Metro Map layout).
- **Image Export**: Ability to export the current visualization as a PNG/SVG image.

### Medium Term
- **Backend Integration**: Replace `localStorage` with a real backend (Firebase/PostgreSQL) to enable persistence across devices.
- **Collaboration**: Real-time multiplayer editing using WebSockets or CRDTs (Yjs).

### Long Term
- **AI Integration**:
    - "Text to Scenario": Generate flows from natural language descriptions.
    - "Screenshot to Element": Upload a screenshot to auto-create an Element with details.
- **Testing Integration**: Link Elements to E2E test files (Playwright/Cypress) to visualize test coverage.
