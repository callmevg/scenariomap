
"use client";

import type { UIElement, UIScenario, GraphData } from './types';

const STORAGE_KEY = 'scenario-map-data';

// --- De-duplication Logic ---
const deduplicateData = (graphs: Record<string, GraphData>): Record<string, GraphData> => {
    const newGraphs = JSON.parse(JSON.stringify(graphs)); // Deep copy to avoid mutation issues

    for (const graphId in newGraphs) {
        let graph = newGraphs[graphId];
        let scenarios = graph.scenarios;

        // --- 0. De-duplicate scenarios by NAME ---
        const seenNames = new Set<string>();
        scenarios = scenarios.filter(scenario => {
            const nameLower = scenario.name.toLowerCase();
            if (seenNames.has(nameLower)) {
                return false; // Remove duplicate
            }
            seenNames.add(nameLower);
            return true; // Keep first one
        });

        // --- 1. De-duplicate methods within the SAME scenario ---
        scenarios.forEach(scenario => {
            const seenMethods = new Set<string>();
            scenario.methods = scenario.methods.filter(method => {
                const methodKey = JSON.stringify(method); // Don't sort, sequence matters
                if (seenMethods.has(methodKey)) {
                    return false;
                }
                seenMethods.add(methodKey);
                return true;
            });
        });

        // --- 2. De-duplicate methods across DIFFERENT scenarios ---
        const methodToScenariosMap = new Map<string, string[]>();
        scenarios.forEach(scenario => {
            scenario.methods.forEach(method => {
                const methodKey = JSON.stringify(method); // Key is the exact sequence
                if (!methodToScenariosMap.has(methodKey)) {
                    methodToScenariosMap.set(methodKey, []);
                }
                methodToScenariosMap.get(methodKey)!.push(scenario.id);
            });
        });

        methodToScenariosMap.forEach((scenarioIds, methodKey) => {
            if (scenarioIds.length > 1) {
                const scenariosWithMethod = scenarios
                    .filter(s => scenarioIds.includes(s.id))
                    .sort((a, b) => a.name.localeCompare(b.name));

                const firstScenario = scenariosWithMethod[0];
                const otherScenarios = scenariosWithMethod.slice(1);

                otherScenarios.forEach(otherScenario => {
                    otherScenario.methods = otherScenario.methods.filter(m => JSON.stringify(m) !== methodKey);
                });
            }
        });
        
        // Remove scenarios that became empty after method removal
        scenarios = scenarios.filter(s => s.methods.length > 0);


        // --- 3. De-duplicate entire scenarios by content ---
        const scenarioToIdsMap = new Map<string, string[]>();
        scenarios.forEach(scenario => {
            // A scenario's signature is its stringified, sorted list of methods
            const scenarioKey = JSON.stringify(scenario.methods.map(m => JSON.stringify(m)).sort());
            if (!scenarioToIdsMap.has(scenarioKey)) {
                scenarioToIdsMap.set(scenarioKey, []);
            }
            scenarioToIdsMap.get(scenarioKey)!.push(scenario.id);
        });

        const scenariosToRemove = new Set<string>();
        scenarioToIdsMap.forEach((ids) => {
            if (ids.length > 1) {
                const duplicateScenarios = scenarios
                    .filter(s => ids.includes(s.id))
                    .sort((a, b) => {
                        const groupCompare = (a.group || '').localeCompare(b.group || '');
                        if (groupCompare !== 0) return groupCompare;
                        return a.name.localeCompare(b.name);
                    });
                
                // Mark all but the first one for removal
                duplicateScenarios.slice(1).forEach(s => scenariosToRemove.add(s.id));
            }
        });

        graph.scenarios = scenarios.filter(s => !scenariosToRemove.has(s.id));
        newGraphs[graphId] = graph;
    }

    return newGraphs;
};


// --- Helper Functions ---
export const getGraphs = (): Record<string, GraphData> => {
  if (typeof window === 'undefined') return {};
  const data = localStorage.getItem(STORAGE_KEY);
  // Apply de-duplication on load to clean up existing data
  return data ? deduplicateData(JSON.parse(data)) : {};
};

export const saveGraphs = (graphs: Record<string, GraphData>) => {
  if (typeof window === 'undefined') return;
  const deduplicatedGraphs = deduplicateData(graphs);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicatedGraphs));
  window.dispatchEvent(new Event('storage'));
};


// These are now legacy and should be used for migration/sample data only.
const getElementsFromStorage = (): UIElement[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('flowverse-elements');
  return data ? JSON.parse(data) : [];
};

const getScenariosFromStorage = (): UIScenario[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('flowverse-flows'); // Use 'flows' for backward compatibility
  const scenarios = data ? JSON.parse(data) : [];
  return scenarios.map((scenario: any) => {
    if (scenario.elementIds && !scenario.methods) {
      return { ...scenario, methods: [scenario.elementIds], elementIds: undefined };
    }
    if (scenario.paths && !scenario.methods) { // Still handle 'paths' for migration
      return { ...scenario, methods: scenario.paths, paths: undefined };
    }
    return scenario;
  });
};


// --- New Multi-Graph API ---

export const getElements = (graphId: string, callback: (elements: UIElement[]) => void) => {
    const graphs = getGraphs();
    const elements = graphs[graphId]?.elements || [];
    callback(elements);
    // Note: This doesn't auto-update on storage change for a specific graph's elements,
    // the main component handles re-fetching.
};

export const getScenarios = (graphId: string, callback: (scenarios: UIScenario[]) => void) => {
    const graphs = getGraphs();
    const scenarios = graphs[graphId]?.scenarios || [];
    callback(scenarios);
};


export const addElement = (graphId: string, elementData: Omit<UIElement, 'id' | 'createdAt'>) => {
  const graphs = getGraphs();
  if (!graphs[graphId]) return Promise.reject("Graph not found");

  const newElement: UIElement = {
    ...elementData,
    id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString()
  };

  graphs[graphId].elements.push(newElement);
  saveGraphs(graphs);
  return Promise.resolve();
};


export const updateElement = (graphId: string, id: string, elementData: Partial<Omit<UIElement, 'id'>>) => {
  const graphs = getGraphs();
  if (!graphs[graphId]) return Promise.reject("Graph not found");
  
  const elements = graphs[graphId].elements;
  const updatedElements = elements.map(el => el.id === id ? { ...el, ...elementData } : el);
  graphs[graphId].elements = updatedElements;

  saveGraphs(graphs);
  return Promise.resolve();
};

export const deleteElement = (graphId: string, id: string) => {
  const graphs = getGraphs();
  if (!graphs[graphId]) return Promise.reject("Graph not found");

  // Remove element
  graphs[graphId].elements = graphs[graphId].elements.filter(el => el.id !== id);

  // Remove from scenarios
  graphs[graphId].scenarios = graphs[graphId].scenarios.map(scenario => ({
    ...scenario,
    methods: scenario.methods.map(method => method.filter(elId => elId !== id)).filter(method => method.length > 0)
  })).filter(scenario => scenario.methods.length > 0);
  
  saveGraphs(graphs);
  return Promise.resolve();
};

export const addScenario = (graphId: string, scenarioData: Omit<UIScenario, 'id'>) => {
  const graphs = getGraphs();
  if (!graphs[graphId]) return Promise.reject("Graph not found");

  const newScenario: UIScenario = {
    ...scenarioData,
    id: `sc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  graphs[graphId].scenarios.push(newScenario);
  saveGraphs(graphs);
return Promise.resolve();
};

export const updateScenario = (graphId: string, id: string, scenarioData: Partial<Omit<UIScenario, 'id'>>) => {
  const graphs = getGraphs();
  if (!graphs[graphId]) return Promise.reject("Graph not found");

  const scenarios = graphs[graphId].scenarios;
  const updatedScenarios = scenarios.map(f => f.id === id ? { ...f, ...scenarioData } : f);
  graphs[graphId].scenarios = updatedScenarios;

  saveGraphs(graphs);
  return Promise.resolve();
};

export const deleteScenario = (graphId: string, id: string) => {
  const graphs = getGraphs();
  if (!graphs[graphId]) return Promise.reject("Graph not found");
  
  graphs[graphId].scenarios = graphs[graphId].scenarios.filter(f => f.id !== id);
  saveGraphs(graphs);

  return Promise.resolve();
};

export const deleteGraph = (graphId: string) => {
  const graphs = getGraphs();
  if (Object.keys(graphs).length <= 1) {
    alert("You cannot delete the last graph.");
    return;
  }
  delete graphs[graphId];
  saveGraphs(graphs);
};

export const renameGraph = (graphId: string, newName: string) => {
    const graphs = getGraphs();
    if(graphs[graphId]) {
        graphs[graphId].name = newName;
        saveGraphs(graphs);
    }
};


// --- Data Portability ---

export const exportData = (graphData: GraphData) => {
    const serializableElements = graphData.elements.map(({ x, y, fx, fy, ...el }) => {
        const { createdAt, ...rest } = el;
        const serializableCreatedAt = createdAt || new Date().toISOString();
        return { ...rest, createdAt: serializableCreatedAt };
    });

    const data = {
        name: graphData.name, // Include graph name in export
        elements: serializableElements,
        scenarios: graphData.scenarios,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${graphData.name.replace(/\s+/g, '_')}-scenariomap.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const importData = async (jsonData: string, activeGraphId: string): Promise<void> => {
    const importedData = JSON.parse(jsonData);
    const graphs = getGraphs();
    const activeGraph = graphs[activeGraphId];

    if (!activeGraph) {
        throw new Error("Active graph not found to merge into.");
    }
    
    const importedElements = importedData.elements || [];
    const importedScenarios = importedData.scenarios || importedData.flows || [];

    if (!Array.isArray(importedElements) || !Array.isArray(importedScenarios)) {
        throw new Error("Invalid JSON format");
    }

    const idMap: { [key: string]: string } = {};
    const newElements: UIElement[] = [];

    // Create a map of existing element names to their IDs for quick lookup
    const existingElementNames = new Map(activeGraph.elements.map(el => [el.name.toLowerCase(), el.id]));
    const existingScenarioNames = new Set(activeGraph.scenarios.map(sc => sc.name.toLowerCase()));


    importedElements.forEach((el: any) => {
        const oldId = el.id;
        const elementNameLower = el.name.toLowerCase();
        
        // Check if an element with the same name already exists
        if (existingElementNames.has(elementNameLower)) {
            // If it exists, map the old ID to the existing ID
            idMap[oldId] = existingElementNames.get(elementNameLower)!;
        } else {
            // If it doesn't exist, create a new element with a new ID
            const newId = `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            idMap[oldId] = newId;
            newElements.push({ 
                ...el, 
                id: newId,
                createdAt: el.createdAt || new Date().toISOString()
            });
            // Add the new element to the map to handle duplicates within the imported file itself
            existingElementNames.set(elementNameLower, newId);
        }
    });

    const newScenarios: UIScenario[] = importedScenarios.map((scenario: any) => {
        // Skip if a scenario with the same name already exists
        if (existingScenarioNames.has(scenario.name.toLowerCase())) {
            return null;
        }

        let methods: string[][];
        const sourceMethods = scenario.methods || scenario.paths || (scenario.elementIds ? [scenario.elementIds] : []);
        
        methods = (sourceMethods || []).map((method: string[]) => 
            method.map((oldId: string) => idMap[oldId]).filter(Boolean)
        );

        return {
            ...scenario,
            id: `sc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            methods: methods.filter(method => method.length > 0),
        }
    }).filter((scenario): scenario is UIScenario => {
        return scenario !== null && scenario.methods.length > 0;
    });

    // Merge new elements and scenarios into the active graph
    activeGraph.elements.push(...newElements);
    activeGraph.scenarios.push(...newScenarios);

    graphs[activeGraphId] = activeGraph;
    
    saveGraphs(graphs);
    return Promise.resolve();
};



export const addSampleData = (): Record<string, GraphData> => {
    // Check if there's legacy data to migrate
    const legacyElements = getElementsFromStorage();
    const legacyScenarios = getScenariosFromStorage();

    if (legacyElements.length > 0 || legacyScenarios.length > 0) {
        const migratedGraph: GraphData = {
            name: "My First Graph",
            elements: legacyElements.map(el => ({...el, createdAt: el.createdAt || new Date().toISOString()})),
            scenarios: legacyScenarios,
        };
        const graphs = { 'graph-1': migratedGraph };
        saveGraphs(graphs);
        localStorage.removeItem('flowverse-elements');
        localStorage.removeItem('flowverse-flows');
        return graphs;
    }
    
    // If no legacy data, create fresh sample data
    const loginEl: UIElement = { id: '1', name: 'Login Dialog', isBuggy: false, bugDetails: '', mediaLink: '', createdAt: new Date().toISOString() };
    const dashboardEl: UIElement = { id: '2', name: 'Dashboard', isBuggy: true, bugDetails: 'Metrics not loading correctly.', mediaLink: 'bug-placeholder', createdAt: new Date().toISOString() };
    const settingsEl: UIElement = { id: '3', name: 'Settings Page', isBuggy: false, bugDetails: '', mediaLink: '', createdAt: new Date().toISOString() };
    const profileEl: UIElement = { id: '4', name: 'User Profile', isBuggy: false, bugDetails: '', mediaLink: '', createdAt: new Date().toISOString() };
    const forgotPasswordEl: UIElement = { id: '5', name: 'Forgot Password', isBuggy: false, bugDetails: '', mediaLink: '', createdAt: new Date().toISOString() };

    const sampleElements = [loginEl, dashboardEl, settingsEl, profileEl, forgotPasswordEl];
    const sampleScenarios: UIScenario[] = [
        { id: '101', name: 'User Login', methods: [[loginEl.id, dashboardEl.id], [forgotPasswordEl.id, loginEl.id]], group: "Onboarding" },
        { id: '102', name: 'Profile Update', methods: [[dashboardEl.id, settingsEl.id, profileEl.id]], group: "User Management" },
        { id: '103', name: 'View Settings', methods: [[dashboardEl.id, settingsEl.id]], group: "User Management" },
    ];
    
    const sampleGraph: GraphData = {
        name: "Sample Graph",
        elements: sampleElements,
        scenarios: sampleScenarios,
    };
    
    const graphs = { 'sample-graph-1': sampleGraph };
    saveGraphs(graphs);
    return graphs;
};


// We don't need sign-in for local storage
export const signIn = async () => {
  return Promise.resolve();
};

    