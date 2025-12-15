# Architecture & Data Model

## 1. Directory Structure
The project follows a standard Next.js App Router structure with a feature-based component organization.

```
src/
├── app/                 # Next.js App Router pages and layouts
│   ├── globals.css      # Global styles and Tailwind directives
│   ├── layout.tsx       # Root layout with ThemeProvider and Toaster
│   └── page.tsx         # Main application controller (Single Page App logic)
├── components/          # React components
│   ├── modals/          # Dialogs for creating/editing entities
│   ├── ui/              # Reusable UI primitives (buttons, inputs, etc.)
│   ├── d3-graph.tsx     # Force-directed graph visualization
│   ├── metro-map.tsx    # Metro-style map visualization
│   ├── dashboard.tsx    # Sidebar for scenario management
│   ├── table-view.tsx   # Grid view for bulk editing
│   └── ...              # Other layout components (Header, TabBar)
├── hooks/               # Custom React hooks (use-toast, etc.)
├── lib/                 # Utilities and business logic
│   ├── localStorage.ts  # Data persistence layer
│   ├── types.ts         # TypeScript interfaces
│   └── utils.ts         # Helper functions (cn, etc.)
└── docs/                # Documentation
```

## 2. Data Model
The core data structures are defined in `src/lib/types.ts`.

### UIElement
Represents a screen, modal, or component state.
- `id` (string): Unique identifier (generated as `el-{timestamp}-{random}`).
- `name` (string): Display name.
- `isBuggy` (boolean): Flag for error states.
- `bugDetails` (string): Description of the bug.
- `mediaLink` (string): URL for related media (image/video).
- `createdAt` (string): ISO timestamp.
- `x?`, `y?` (number, optional): D3 simulation coordinates.
- `fx?`, `fy?` (number | null, optional): D3 fixed position coordinates (for dragging).

### UIScenario
Represents a user journey or flow.
- `id` (string): Unique identifier (generated as `sc-{timestamp}-{random}`).
- `name` (string): Descriptive name of the flow.
- `group?` (string, optional): Category for organization (e.g., "Onboarding").
- `methods` (string[][]): Array of arrays of Element IDs. Each inner array represents a linear path or "method" within the scenario.

### GraphData
Container for a complete workspace.
- `name` (string): Name of the graph (tab).
- `elements` (UIElement[]): List of all elements in the graph.
- `scenarios` (UIScenario[]): List of all scenarios in the graph.

## 3. State Management

### Persistence Layer
- **Storage**: Data is stored in the browser's `localStorage` under the key `scenario-map-data`.
- **Structure**: A dictionary object where keys are Graph IDs and values are `GraphData` objects.
- **Synchronization**: The `localStorage.ts` module handles CRUD operations and dispatches `storage` events to sync state across tabs/windows.
- **De-duplication**: On every read/write, the system automatically:
    1. De-duplicates scenarios by name (case-insensitive).
    2. De-duplicates methods within the same scenario.
    3. De-duplicates identical methods across different scenarios.
    4. De-duplicates entire scenarios with identical content.
    5. Removes empty scenarios after cleanup.

### Application State
`src/app/page.tsx` acts as the central controller, holding the state for:
- `graphs`: All available graphs loaded from storage.
- `activeGraphId`: The ID of the currently selected graph/tab.
- `hoveredScenarioId`: State for cross-component highlighting (hovering sidebar highlights graph).
- `hiddenScenarioIds`: Set of IDs for scenarios toggled to hidden.
- Modal states (`elementModal`, `scenarioModal`, `deleteDialog`).

## 4. Data Layer API
The `localStorage.ts` module exposes the following functions:

### Graph Operations
- `getGraphs()`: Returns all graphs from storage (with de-duplication).
- `saveGraphs(graphs)`: Saves all graphs to storage.
- `deleteGraph(graphId)`: Removes a graph (prevents deleting the last one).
- `renameGraph(graphId, newName)`: Updates a graph's display name.

### Element Operations
- `addElement(graphId, elementData)`: Creates a new element in the specified graph.
- `updateElement(graphId, id, elementData)`: Updates an existing element.
- `deleteElement(graphId, id)`: Removes an element and cleans up scenario references.

### Scenario Operations
- `addScenario(graphId, scenarioData)`: Creates a new scenario.
- `updateScenario(graphId, id, scenarioData)`: Updates an existing scenario.
- `deleteScenario(graphId, id)`: Removes a scenario.

### Data Portability
- `exportData(graphData)`: Downloads the graph as a JSON file.
- `importData(jsonData, activeGraphId)`: Merges imported data into the active graph.
- `addSampleData()`: Generates sample data or migrates legacy data.
- `activeGraphId`: The ID of the currently selected graph/tab.
- `hoveredScenarioId`: State for cross-component highlighting (hovering sidebar highlights graph).
- `hiddenScenarioIds`: Set of IDs for scenarios toggled to hidden.
- Modal states (`elementModal`, `scenarioModal`, `deleteDialog`).
