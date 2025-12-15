# End-to-End Test Suite

Comprehensive E2E tests for ScenarioMap using Playwright.

## Test Coverage

### 1. Element Management (`element-management.spec.ts`)
- ✅ Display sample data on first load
- ✅ Create new element via sidebar
- ✅ Validate element name uniqueness
- ✅ Edit existing element
- ✅ Delete element and cascade to scenarios
- ✅ Mark element as buggy with visual indicator
- ✅ Validate element name length

### 2. Scenario Management (`scenario-management.spec.ts`)
- ✅ Create scenario with single method
- ✅ Create scenario with multiple methods
- ✅ Validate scenario name uniqueness
- ✅ Edit existing scenario
- ✅ Delete scenario
- ✅ Toggle scenario visibility
- ✅ Toggle group visibility
- ✅ Reorder elements within method
- ✅ Quick-add element from scenario modal
- ✅ Validate scenario has at least one method
- ✅ Hover scenario to highlight in graph

### 3. Multi-Graph Workspace (`multi-graph-workspace.spec.ts`)
- ✅ Display initial sample graph tab
- ✅ Create new graph
- ✅ Switch between graphs
- ✅ Rename graph via double-click
- ✅ Delete graph with confirmation
- ✅ Prevent deleting last graph
- ✅ Persist graph state across reload
- ✅ Maintain separate element lists per graph
- ✅ Reset hidden scenarios when switching tabs

### 4. Visualization Views (`visualization-views.spec.ts`)
- ✅ Switch between Graph, Map, and Table views
- ✅ D3 Graph: Render nodes and links
- ✅ D3 Graph: Zoom and pan
- ✅ D3 Graph: Drag nodes to fix positions
- ✅ D3 Graph: Click node to open details
- ✅ D3 Graph: Highlight scenario on link hover
- ✅ D3 Graph: Display buggy nodes with red stroke
- ✅ Metro Map: Render grid layout
- ✅ Metro Map: Drag nodes to grid positions
- ✅ Metro Map: Undo node position changes
- ✅ Metro Map: Zoom and pan
- ✅ Table View: Display elements in table
- ✅ Table View: Edit element inline
- ✅ Table View: Toggle bug status
- ✅ Table View: Add new element
- ✅ Table View: Delete element
- ✅ Table View: Display scenarios
- ✅ Table View: Edit scenario methods as text

### 5. Data Portability (`data-portability.spec.ts`)
- ✅ Export graph as JSON file
- ✅ Import graph from JSON file
- ✅ Handle duplicate elements during import
- ✅ Handle duplicate scenarios during import
- ✅ Handle invalid JSON import
- ✅ Export and re-import maintaining data integrity

### 6. UI/UX & Theme (`ui-ux-theme.spec.ts`)
- ✅ Switch to dark theme
- ✅ Switch to light theme
- ✅ Use system theme
- ✅ Persist theme preference
- ✅ Show success toast notifications
- ✅ Show error toast notifications
- ✅ Open and close modal with Escape key
- ✅ Close modal by clicking outside
- ✅ Trap focus within modal
- ✅ Expand and collapse accordion groups
- ✅ Scroll sidebar with many scenarios
- ✅ Submit form with Enter key
- ✅ Responsive layout on resize

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run tests with UI mode (recommended for development)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Show test report
npm run test:e2e:report

# Run specific test file
npx playwright test element-management

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Configuration

- **Base URL**: `http://localhost:9002`
- **Browsers**: Chromium, Firefox, WebKit
- **Parallel Execution**: Enabled (except in CI)
- **Retries**: 2 attempts in CI, 0 locally
- **Screenshots**: On failure only
- **Trace**: On first retry

## Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

3. Start dev server (automatically started by tests):
   ```bash
   npm run dev
   ```

## Test Structure

Each test file follows the same structure:
- `beforeEach`: Navigate to app and clear localStorage
- Test suites grouped by feature area
- Descriptive test names following "should [expected behavior]" pattern
- Assertions using Playwright's `expect` API

## Notes

- Tests use sample data generated on first load
- localStorage is cleared before each test for isolation
- Temp files (for import/export tests) are cleaned up automatically
- Tests wait for animations and transitions where necessary
