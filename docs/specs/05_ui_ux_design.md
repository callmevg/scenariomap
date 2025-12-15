# UI/UX Design Specifications

## 1. Layout Structure
The application uses a classic "IDE-like" layout.

### Header
- **Branding**: Logo and App Name.
- **Tab Bar**: Scrollable list of open graphs.
- **Global Actions**: Export, Import, Theme Toggle.

### Sidebar (Left Panel)
- **Purpose**: Primary navigation and management of Scenarios.
- **Components**:
    - **Header**: "Scenarios" title and "Add Scenario" button.
    - **List**: Accordion component grouping scenarios by their `group` property.
    - **Scenario Item**:
        - Color indicator (matching the graph link color).
        - Name.
        - Visibility Toggle (Eye icon).
        - Edit Button.
    - **Footer**: "Add Element" button.

### Main Content Area
- **Tabs**: Sub-navigation to switch between views:
    1.  **Graph**: D3 Force-Directed.
    2.  **Map**: Metro Map.
    3.  **Table**: Data Grid.
- **Canvas**: The visualization renders here, taking up remaining height/width.

## 2. Modals & Dialogs

### Element Modal
- **Modes**:
    - **Add**: Empty form.
    - **Edit**: Pre-filled form.
    - **View**: Read-only details view with "Edit" and "Delete" actions.
- **Content**:
    - Name Input (min 2 characters, required).
    - "Mark as Buggy" Checkbox (styled with border, descriptive text).
    - Bug Details Textarea.
    - Media Link Input (validated as URL).
    - Image Preview (uses placeholder image system if `bug-placeholder` ID is set).
- **Validation**: Zod schema ensures name length and URL format.

### Scenario Modal
- **Layout**: Split view or wide modal.
- **Left Column (Available Elements)**:
    - Searchable/Scrollable list of all elements.
    - "Quick Add" input to create new elements instantly.
    - "Add to Method X" buttons for each element.
- **Right Column (Selected Methods)**:
    - List of methods (paths).
    - Ordered list of elements within each method.
    - Reordering controls (Up/Down arrows).
    - Remove element button.

## 3. Styling System
- **Theme**: System-aware Dark/Light mode using `next-themes`.
- **Color Palette** (CSS Variables in HSL):
    - **Primary**: Indigo (`#6366F1` / `239 84% 67%`) - Active states, primary buttons, ring focus.
    - **Destructive**: Red (`0 84.2% 60.2%`) - Bugs, delete actions.
    - **Accent**: Amber (`#F59E0B` / `38 92% 51%`) - Warnings, highlights.
    - **Background**:
        - Light: `#F9FAFB` (`220 17% 97%`)
        - Dark: `#020817` (`240 10% 3.9%`)
    - **Chart Colors**: 5 predefined colors for scenario visualization.
- **Typography**:
    - **Body/Headline**: 'Inter' (Sans-serif).
    - **Code/Technical**: 'Source Code Pro' (Monospace).
- **Border Radius**: Uses CSS variable `--radius: 0.5rem` with `lg`, `md`, `sm` variants.
- **Animations**: Accordion open/close animations via `tailwindcss-animate`.
