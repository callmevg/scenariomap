# Core Features Specifications

## 1. Multi-Graph Workspace
The application supports multiple independent workspaces (Graphs).

- **Tabs Interface**: Users navigate between graphs using a tab bar in the header.
- **Create Graph**: Users can add new empty graphs.
- **Rename Graph**: Double-clicking a tab allows renaming the graph.
- **Delete Graph**: Users can delete a graph (with confirmation). The system prevents deleting the last remaining graph.

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
- **Import**: Users can upload a `.json` file to merge into the current graph.
    - **Duplicate Detection**: The import logic checks for existing elements by name (case-insensitive) to prevent duplicates.
    - **ID Remapping**: Imported element IDs are remapped to existing IDs if names match, or new IDs are generated.
    - **Scenario Merge**: Imported scenarios are added only if no scenario with the same name exists.
    - **Backward Compatibility**: Supports legacy formats (`paths`, `elementIds`, `flows`).

## 5. Sample Data & Migration
- **First Run**: If no data exists, sample data is auto-generated with 5 elements and 3 scenarios.
- **Legacy Migration**: Automatically migrates data from old keys (`flowverse-elements`, `flowverse-flows`) to new format.
