# Core Features Specifications

## 1. Multi-Graph Workspace
The application supports multiple independent workspaces (Graphs).

- **Tabs Interface**: Users navigate between graphs using a tab bar in the header.
- **Create Graph**: Users can add new empty graphs.
- **Rename Graph**: Double-clicking a tab allows renaming the graph.
- **Close Tab**: Closing a tab removes it from view but preserves the graph data (non-destructive). The graph can be reopened via the Open dialog.
- **Delete Graph**: Users can permanently delete a graph via the Open file dialog (with confirmation).
- **Last Tab Protection**: The system prevents closing the last remaining tab.

## 2. Element Management
Elements are the nodes in the graph, representing UI states.

- **Creation**:
    - Via "Add Element" button in the sidebar.
    - Via "Quick Add" input within the Scenario Modal (allows creating elements while defining a flow).
- **Properties**:
    - Name (Must be unique within the graph).
    - Bug Status (Visual indicator for problematic screens).
    - Bug Details (Text description).
    - Media Link (URL to image/video).
- **Deletion**:
    - Deleting an element removes it from the graph.
    - **Cascade Delete**: The element is automatically removed from all scenarios that reference it.

## 3. Scenario Management
Scenarios are the edges/paths in the graph, representing user flows.

- **Structure**: A scenario consists of one or more "methods". A method is a linear sequence of Elements.
- **Grouping**: Scenarios can be assigned a "Group" (e.g., "Auth", "Settings"). The sidebar automatically groups scenarios by this property.
- **Visibility**:
    - Users can toggle visibility of individual scenarios.
    - Users can toggle visibility of entire groups.
    - Hidden scenarios are dimmed or removed from visualizations.
- **Editing**:
    - Reorder elements within a method.
    - Add multiple methods to a single scenario (e.g., success path vs. failure path).
    - Drag-and-drop reordering (implemented via Up/Down buttons in modal).

## 4. Data Portability
- **Export**: Users can download the currently active graph as a `.json` file.
    - File format: `{graphName}-scenariomap.json`.
    - Content: `{ name, elements, scenarios }` (D3 coordinates stripped).
- **Import**: Users can upload a `.json` file which opens as a **new tab**.
    - The imported graph opens in a new tab (non-destructive to existing tabs).
    - Graph name is derived from the imported file's `name` property or filename.
    - **Backward Compatibility**: Supports legacy formats (`paths`, `elementIds`, `flows`).

## 5. File Storage (Save/Open)
The application supports server-side file persistence for graphs.

- **Save to File**:
    - Users can save the current graph to a server-side JSON file.
    - File naming: User provides a filename, stored as `{filename}.json` in `data/graphs/`.
    - Saving updates existing files or creates new ones.
- **Open from File**:
    - Users can browse saved files via the Open dialog.
    - Files are listed with names and last modified timestamps.
    - Opening a file loads the graph into a new tab.
- **Delete File**:
    - Users can delete saved files directly from the Open dialog (with confirmation).
- **API Endpoints**:
    - `GET /api/files` - List all saved files.
    - `GET /api/files?filename=X` - Read specific file.
    - `POST /api/files` - Save/update a file.
    - `DELETE /api/files?filename=X` - Delete a file.

## 6. Sample Data & Migration
- **First Run**: If no data exists, sample data is auto-generated with 5 elements and 3 scenarios.
- **Legacy Migration**: Automatically migrates data from old keys (`flowverse-elements`, `flowverse-flows`) to new format.
