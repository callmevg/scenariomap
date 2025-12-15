# Component Reference

## 1. Layout Components

### Header (`header.tsx`)
Top navigation bar with global actions.
- **Props**:
    - `onExport`: Callback for export button.
    - `onImport`: Callback for file input change.
    - `disabled`: Disables buttons when no active graph.
    - `children`: Slot for TabBar component.
- **Contains**: Logo, TabBar slot, Export/Import buttons, ThemeToggle.

### TabBar (`tab-bar.tsx`)
Horizontal tabs for multi-graph navigation.
- **Props**:
    - `graphs`: Record of all graphs.
    - `activeGraphId`: Currently selected graph.
    - `onSelectTab`, `onAddGraph`, `onDeleteGraph`, `onRenameGraph`: Callbacks.
- **Features**:
    - Double-click to rename.
    - Close button on hover.
    - "+" button to add new graph.
    - Delete confirmation dialog.

### Dashboard (`dashboard.tsx`)
Left sidebar for scenario management.
- **Props**:
    - `scenarios`: List of scenarios to display.
    - `scenarioColors`: Color map for visual indicators.
    - `hiddenScenarioIds`: Set of hidden scenario IDs.
    - `onAddScenario`, `onEditScenario`, `onAddElement`: Callbacks.
    - `onScenarioHover`, `onToggleScenario`, `onToggleGroup`: Callbacks.
- **Features**:
    - Grouped accordion for scenario categories.
    - Hover triggers graph highlighting.
    - Eye icons toggle visibility.

## 2. Visualization Components

### D3Graph (`d3-graph.tsx`)
Force-directed graph visualization using D3.js.
- **Props**:
    - `elements`: Array of UIElement.
    - `scenarios`: Array of UIScenario (visible only).
    - `onNodeClick`: Callback when node is clicked.
    - `hoveredScenarioId`: ID of hovered scenario for highlighting.
    - `onScenarioHover`: Callback for link hover.
    - `scenarioColorScale`: D3 ordinal color scale.
- **Key Behaviors**:
    - Force simulation with charge, link, center, and collision forces.
    - Nodes sized by scenario participation count.
    - Parallel links rendered as arcs.
    - Drag to fix node position; click to view details.

### MetroMap (`metro-map.tsx`)
Grid-based schematic visualization.
- **Props**: Same as D3Graph.
- **Key Behaviors**:
    - Auto-layout based on longest scenario.
    - Drag nodes to snap to grid.
    - Undo button for layout changes.
    - Orthogonal path rendering with corner arcs.

### TableView (`table-view.tsx`)
Spreadsheet-style data editor.
- **Props**:
    - `elements`, `scenarios`: Data arrays.
    - `onBulkUpdate`: Callback for batch saves.
    - `onDeleteElement`, `onDeleteScenario`: Callbacks.
- **Features**:
    - Inline editing for all fields.
    - Checkbox for bug status.
    - Text parsing for scenario methods.

## 3. Modal Components

### ElementModal (`modals/element-modal.tsx`)
Dialog for element CRUD operations.
- **Modes**: Add, Edit, View.
- **Form Fields**: Name, isBuggy, bugDetails, mediaLink.
- **Validation**: Zod schema (name min 2 chars, valid URL).

### ScenarioModal (`modals/scenario-modal.tsx`)
Dialog for scenario CRUD operations.
- **Layout**: Two-column (available elements | selected methods).
- **Features**:
    - Quick-add element input.
    - Multiple methods per scenario.
    - Reorder elements within methods.
    - Group selector with autocomplete.

## 4. UI Primitives (`ui/` folder)
Shadcn/ui components built on Radix UI:
- **Form**: Button, Input, Textarea, Checkbox, Select, Label, Form.
- **Layout**: Card, Separator, ScrollArea, Tabs.
- **Feedback**: Toast, Toaster, Alert, AlertDialog, Dialog.
- **Navigation**: Accordion, DropdownMenu, Menubar.
- **Data Display**: Table, Badge, Avatar, Progress.
- **Overlay**: Popover, Tooltip, Sheet.

## 5. Utility Components

### ThemeProvider (`theme-provider.tsx`)
Wraps app with `next-themes` provider for dark/light mode.

### ThemeToggle (`theme-toggle.tsx`)
Dropdown menu to switch between Light, Dark, and System themes.

### Icons (`icons.tsx`)
Custom SVG icons (currently only Logo).

### Toaster (`ui/toaster.tsx`)
Toast notification container (renders at root level).
