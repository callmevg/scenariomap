
export interface UIElement {
  id: string;
  name: string;
  isBuggy: boolean;
  bugDetails: string;
  mediaLink: string;
  createdAt: string; // Changed from Timestamp
  x?: number; // For D3 simulation
  y?: number; // For D3 simulation
  fx?: number | null; // For D3 fixed position
  fy?: number | null; // For D3 fixed position
}

export interface UIScenario {
  id: string;
  name: string;
  methods: string[][];
  group?: string;
}

export interface GraphData {
  name: string;
  elements: UIElement[];
  scenarios: UIScenario[];
}
