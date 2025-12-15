# Visualization Specifications

The application provides three distinct views for the active graph data.

## 1. Force-Directed Graph View (D3.js)
A dynamic, physics-based visualization.

- **Engine**: `d3-force` simulation.
- **Forces**:
    - **Charge**: `d3.forceManyBody().strength(-600)` - Nodes repel each other.
    - **Link**: `d3.forceLink().distance(200)` - Links pull connected nodes together.
    - **Center**: `d3.forceCenter(width/2, height/2)` - Keeps graph centered.
    - **Collision**: `d3.forceCollide()` - Prevents node overlap based on radius.
- **Visual Encoding**:
    - **Node Size**: Proportional to the number of scenarios the element appears in (`d3.scaleSqrt`, range 25-45px).
    - **Node Color**:
        - Default: `hsl(var(--card))` background, `hsl(var(--border))` stroke.
        - Buggy: `hsl(var(--destructive))` stroke (4px width).
    - **Link Color**: Each scenario is assigned a unique color from `d3.schemeCategory10`.
    - **Parallel Links**: If multiple scenarios connect the same two nodes, links are curved (arced) to ensure all are visible and don't overlap.
    - **Arrows**: SVG markers indicate direction of flow.
- **Interactivity**:
    - **Zoom/Pan**: `d3.zoom()` with scale extent 0.2x to 5x.
    - **Drag**: Users can drag nodes to fix their positions (`fx`, `fy`). Short drags (<5px) are treated as clicks.
    - **Hover**: Hovering a link dims other links (opacity 0.1) and highlights the specific scenario.
    - **Click**: Clicking a node opens the Element Details modal.

## 2. Metro Map View
A schematic, grid-based visualization resembling a subway map.

- **Constants**:
    - `GRID_SIZE`: 120px (spacing between grid positions).
    - `NODE_RADIUS`: 8px.
    - `LINE_WIDTH`: 5px.
    - `STATION_OFFSET`: 12px (gap between line end and node center).
- **Layout Algorithm**:
    - **Grid Snapping**: All nodes are positioned on a fixed grid.
    - **Auto-Layout**: A heuristic algorithm places nodes based on connectivity, prioritizing the longest scenario as the "main line".
    - **BFS Expansion**: Remaining nodes are placed via breadth-first search from already-placed neighbors.
    - **Orthogonal Routing**: Links are drawn with corner radius arcs at 45-degree or 90-degree angles.
- **Interactivity**:
    - **Manual Adjustment**: Users can drag nodes to snap them to new grid positions.
    - **History**: Drag operations are saved in an Undo stack (`useHistory` hook), allowing users to revert layout changes.
    - **Zoom/Pan**: Standard D3 zoom behavior (0.1x to 4x scale).
    - **Auto-Fit**: Initial zoom is calculated to fit all nodes in view.

## 3. Table View
A data-centric view for bulk management.

- **Interface**: Spreadsheet-like grid using `shadcn/ui` Table component.
- **Features**:
    - **Bulk Editing**: Edit names, bug status, and details inline.
    - **Scenario Definition**: Scenarios are displayed as text strings (e.g., "Login, Dashboard; Login, Forgot Password").
    - **Parsing**: Editing the scenario text string automatically parses and updates the underlying Element references.
    - **Quick Actions**: Delete buttons for rows.
