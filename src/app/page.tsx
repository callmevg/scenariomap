
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import {
  getGraphs,
  saveGraphs,
  addElement,
  updateElement,
  addScenario,
  updateScenario,
  addSampleData,
  exportData as exportDataFromLocalStorage,
  importData as importDataFromLocalStorage,
  deleteScenario,
  deleteElement,
  deleteGraph,
  renameGraph,
} from '@/lib/localStorage';
import type { UIElement, UIScenario, GraphData } from '@/lib/types';
import D3Graph from '@/components/d3-graph';
import { Header } from '@/components/header';
import { Dashboard } from '@/components/dashboard';
import ElementModal from '@/components/modals/element-modal';
import ScenarioModal from '@/components/modals/scenario-modal';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TableView } from '@/components/table-view';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { TabBar } from '@/components/tab-bar';
import MetroMap from '@/components/metro-map';


type ModalState<T> = { open: boolean; data?: T | null; mode?: 'add' | 'edit' | 'view' };
type DeleteDialogState = { open: boolean; id?: string | null; type: 'scenario' | 'element' };


export default function Home() {
  const [hasMounted, setHasMounted] = useState(false);
  const [graphs, setGraphs] = useState<Record<string, GraphData>>({});
  const [activeGraphId, setActiveGraphId] = useState<string | null>(null);
  const [hoveredScenarioId, setHoveredScenarioId] = useState<string | null>(null);
  const [hiddenScenarioIds, setHiddenScenarioIds] = useState<Set<string>>(new Set());

  const { toast } = useToast();

  const [elementModal, setElementModal] = useState<ModalState<UIElement>>({ open: false, mode: 'add' });
  const [scenarioModal, setScenarioModal] = useState<ModalState<UIScenario>>({ open: false, mode: 'add' });
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({ open: false, type: 'scenario' });

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const loadData = useCallback(() => {
    let currentGraphs = getGraphs();
    if (Object.keys(currentGraphs).length === 0) {
      currentGraphs = addSampleData();
      toast({ title: "Welcome!", description: "We've added a sample graph to get you started." });
    }
    setGraphs(currentGraphs);
    const firstGraphId = Object.keys(currentGraphs)[0];
    setActiveGraphId(firstGraphId);
  }, [toast]);

  useEffect(() => {
    if (hasMounted) {
      loadData();

      const handleStorageChange = () => {
        setGraphs(getGraphs());
      };

      window.addEventListener('storage', handleStorageChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [hasMounted, loadData]);


  const activeGraph = useMemo(() => {
    if (!activeGraphId || !graphs[activeGraphId]) {
      return { elements: [], scenarios: [] };
    }
    return graphs[activeGraphId];
  }, [graphs, activeGraphId]);

  const elements = activeGraph.elements;
  const scenarios = activeGraph.scenarios;

  const handleNodeClick = useCallback((element: UIElement) => {
    setElementModal({ open: true, data: element, mode: 'view' });
  }, []);

  const handleExportData = () => {
    if (!activeGraphId || !activeGraph) return;
    exportDataFromLocalStorage(activeGraph);
    toast({ title: "Success", description: "Active graph exported successfully." });
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && activeGraphId) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const json = e.target?.result as string;
          await importDataFromLocalStorage(json, activeGraphId);
          setGraphs(getGraphs()); // Re-fetch all graphs to reflect the merge
          toast({ title: "Success", description: "Data merged into the current graph." });
        } catch (error: any) {
          toast({ variant: "destructive", title: "Import Error", description: error.message });
        }
      };
      reader.readAsText(file);
      event.target.value = ''; // Reset file input
    } else if (!activeGraphId) {
        toast({ variant: "destructive", title: "Import Error", description: "No active graph to import into." });
    }
  };

  const handleEditScenario = (scenario: UIScenario) => {
    setScenarioModal({ open: true, data: scenario, mode: 'edit' });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id || !activeGraphId) return;

    if (deleteDialog.type === 'scenario') {
      try {
        await deleteScenario(activeGraphId, deleteDialog.id);
        toast({ title: "Success", description: "Scenario deleted." });
        setScenarioModal({ open: false });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
    } else if (deleteDialog.type === 'element') {
      try {
        await deleteElement(activeGraphId, deleteDialog.id);
        toast({ title: "Success", description: "Element deleted." });
        setElementModal({ open: false });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
    }
    setDeleteDialog({ open: false, type: 'scenario' });
    setGraphs(getGraphs()); // Refresh graphs
  };


  const handleDeleteScenario = (scenarioId: string) => {
    setDeleteDialog({ open: true, id: scenarioId, type: 'scenario' });
  };

  const handleDeleteElement = (elementId: string) => {
    setDeleteDialog({ open: true, id: elementId, type: 'element' });
  };


  const handleQuickAddElement = async (name: string) => {
    if (!activeGraphId) return;
    const isNameTaken = elements.some(
      (element) => element.name.toLowerCase() === name.toLowerCase()
    );

    if (isNameTaken) {
      toast({
        variant: "destructive",
        title: "Duplicate Name",
        description: `An element with the name "${name}" already exists.`,
      });
      return;
    }
    
    try {
      await addElement(activeGraphId, { name, isBuggy: false, bugDetails: '', mediaLink: '' });
      toast({ title: "Success", description: `Element "${name}" added.` });
      setGraphs(getGraphs());
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleBulkUpdate = async (type: 'elements' | 'scenarios', data: any[]) => {
     if (!activeGraphId) return;
     if (type === 'elements') {
        const updates = data.map(item => {
            const existing = elements.find(e => e.id === item.id);
            const payload = {
                name: item.name,
                isBuggy: item.isBuggy || false,
                bugDetails: item.bugDetails || '',
                mediaLink: item.mediaLink || ''
            };
            if (existing) {
                return updateElement(activeGraphId, existing.id, payload);
            } else {
                return addElement(activeGraphId, payload);
            }
        });
        await Promise.all(updates);
        toast({ title: 'Success', description: 'Elements updated.' });
    } else if (type === 'scenarios') {
        const updates = data.map(item => {
            const existing = scenarios.find(f => f.id === item.id);

             const methods = item.methods.map((method: string[]) => {
                return method.map((nameOrId: string) => {
                    const el = elements.find(e => e.name.toLowerCase() === nameOrId.toLowerCase().trim() || e.id === nameOrId);
                    return el ? el.id : null;
                }).filter((id): id is string => id !== null);
            }).filter((method: string[]) => method.length > 0);

            if (methods.length === 0 && item.methods.length > 0) {
                 toast({ variant: 'destructive', title: 'Scenario Error', description: `Could not find elements for scenario "${item.name}". Please check element names.` });
                 return Promise.resolve(); // Skip this one
            }
            
            const payload = {
                name: item.name,
                group: item.group || '',
                methods: methods,
            };

            if (existing) {
                return updateScenario(activeGraphId, existing.id, payload);
            } else {
                return addScenario(activeGraphId, payload);
            }
        });
        await Promise.all(updates);
        toast({ title: 'Success', description: 'Scenarios updated.' });
    }
    setGraphs(getGraphs());
  };

  const visibleScenarios = useMemo(() => {
    return scenarios.filter(s => !hiddenScenarioIds.has(s.id));
  }, [scenarios, hiddenScenarioIds]);

  const scenarioColorScale = useMemo(() => {
    return d3.scaleOrdinal(d3.schemeCategory10).domain(scenarios.map(f => f.id));
  }, [scenarios]);

  const scenarioColors = useMemo(() => {
    const colors: { [key: string]: string } = {};
    scenarios.forEach(scenario => {
      colors[scenario.id] = scenarioColorScale(scenario.id);
    });
    return colors;
  }, [scenarios, scenarioColorScale]);

  const toggleScenarioVisibility = (scenarioId: string) => {
    setHiddenScenarioIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(scenarioId)) {
            newSet.delete(scenarioId);
        } else {
            newSet.add(scenarioId);
        }
        return newSet;
    });
  };

  const toggleGroupVisibility = (scenariosToToggle: UIScenario[]) => {
    setHiddenScenarioIds(prev => {
        const newSet = new Set(prev);
        const groupIds = scenariosToToggle.map(s => s.id);
        const allHidden = groupIds.every(id => newSet.has(id));

        if (allHidden) {
            groupIds.forEach(id => newSet.delete(id));
        } else {
            groupIds.forEach(id => newSet.add(id));
        }
        return newSet;
    });
  };
  
  const handleAddNewGraph = () => {
    const allGraphs = getGraphs();
    const newGraphId = `graph-${Date.now()}`;
    const newGraphName = `Untitled Graph ${Object.keys(allGraphs).length + 1}`;
    allGraphs[newGraphId] = {
      name: newGraphName,
      elements: [],
      scenarios: [],
    };
    saveGraphs(allGraphs);
    setGraphs(allGraphs);
    setActiveGraphId(newGraphId);
    setHiddenScenarioIds(new Set()); // Reset visibility for new tab
  };
  
  const handleDeleteGraph = (graphId: string) => {
    deleteGraph(graphId);
    const remainingGraphs = getGraphs();
    setGraphs(remainingGraphs);
    if (activeGraphId === graphId) {
      const nextGraphId = Object.keys(remainingGraphs)[0] || null;
      setActiveGraphId(nextGraphId);
    }
  };

  const handleRenameGraph = (graphId: string, newName: string) => {
    renameGraph(graphId, newName);
    setGraphs(getGraphs());
  };

  const handleSelectTab = (graphId: string) => {
    setActiveGraphId(graphId);
    setHiddenScenarioIds(new Set()); // Reset visibility on tab change
  };


  const renderContent = () => {
    if (!hasMounted || !activeGraphId) {
        return (
          <div className="flex items-center justify-center h-full">
             <Skeleton className="w-[80%] h-[80%] rounded-lg" />
          </div>
        );
    }

    return (
        <Tabs defaultValue="graph" className="w-full h-full flex flex-col">
            <div className="flex justify-center border-b">
                <TabsList>
                    <TabsTrigger value="graph">Graph</TabsTrigger>
                    <TabsTrigger value="map">Map</TabsTrigger>
                    <TabsTrigger value="table">Table</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="graph" className="flex-1 overflow-hidden relative">
                 <D3Graph 
                    elements={elements} 
                    scenarios={visibleScenarios} 
                    onNodeClick={handleNodeClick} 
                    hoveredScenarioId={hoveredScenarioId} 
                    scenarioColorScale={scenarioColorScale}
                />
            </TabsContent>
            <TabsContent value="map" className="flex-1 overflow-hidden relative">
              <MetroMap 
                  elements={elements}
                  scenarios={visibleScenarios}
                  onNodeClick={handleNodeClick}
                  scenarioColorScale={scenarioColorScale}
              />
            </TabsContent>
            <TabsContent value="table" className="flex-1 overflow-auto p-4">
                <TableView 
                    elements={elements} 
                    scenarios={scenarios} 
                    onBulkUpdate={handleBulkUpdate}
                    onDeleteElement={handleDeleteElement}
                    onDeleteScenario={handleDeleteScenario}
                />
            </TabsContent>
        </Tabs>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header onExport={handleExportData} onImport={handleImportData}>
        {hasMounted && (
            <TabBar
                graphs={graphs}
                activeGraphId={activeGraphId}
                onSelectTab={handleSelectTab}
                onAddGraph={handleAddNewGraph}
                onDeleteGraph={handleDeleteGraph}
                onRenameGraph={handleRenameGraph}
            />
        )}
      </Header>
      <main className="flex flex-1 overflow-hidden">
        {hasMounted && (
            <Dashboard
              scenarios={scenarios}
              scenarioColors={scenarioColors}
              hiddenScenarioIds={hiddenScenarioIds}
              onAddScenario={() => setScenarioModal({ open: true, data: null, mode: 'add' })}
              onEditScenario={handleEditScenario}
              onAddElement={() => setElementModal({ open: true, data: null, mode: 'add' })}
              onScenarioHover={setHoveredScenarioId}
              onToggleScenario={toggleScenarioVisibility}
              onToggleGroup={toggleGroupVisibility}
              disabled={!activeGraphId}
            />
        )}
        <div className="flex-1 relative bg-background/50">
          {renderContent()}
        </div>
      </main>

      {elementModal.open && activeGraphId && (
        <ElementModal
          isOpen={elementModal.open}
          setIsOpen={(open) => setElementModal({ ...elementModal, open })}
          element={elementModal.data}
          elements={elements}
          mode={elementModal.mode}
          onSave={async (data, id) => {
            if (!activeGraphId) return;
            const isNameTaken = elements.some(
              (element) => element.name.toLowerCase() === data.name.toLowerCase() && element.id !== id
            );
    
            if (isNameTaken) {
              toast({
                variant: "destructive",
                title: "Duplicate Name",
                description: `An element with the name "${data.name}" already exists.`,
              });
              return;
            }

            try {
              if (id) {
                await updateElement(activeGraphId, id, data);
                toast({ title: "Success", description: "Element updated." });
              } else {
                await addElement(activeGraphId, data as Omit<UIElement, 'id' | 'createdAt'>);
                toast({ title: "Success", description: "Element added." });
              }
              setElementModal({ open: false });
              setGraphs(getGraphs());
            } catch (error: any) {
              toast({ variant: "destructive", title: "Error", description: error.message });
            }
          }}
          onDelete={handleDeleteElement}
        />
      )}

      {scenarioModal.open && activeGraphId && (
        <ScenarioModal
          isOpen={scenarioModal.open}
          setIsOpen={(open) => setScenarioModal({ ...scenarioModal, open })}
          scenario={scenarioModal.data}
          elements={elements}
          scenarios={scenarios}
          onSave={async (data, id) => {
            if (!activeGraphId) return;
            const isNameTaken = scenarios.some(
                (scenario) => scenario.name.toLowerCase() === data.name.toLowerCase() && scenario.id !== id
            );

            if (isNameTaken) {
              toast({
                variant: "destructive",
                title: "Duplicate Name",
                description: `A scenario with the name "${data.name}" already exists.`,
              });
              return;
            }
            try {
              if (id) {
                await updateScenario(activeGraphId, id, data);
                toast({ title: "Success", description: "Scenario updated." });
              } else {
                await addScenario(activeGraphId, data);
                toast({ title: "Success", description: "Scenario added." });
              }
              setScenarioModal({ open: false });
              setGraphs(getGraphs());
            } catch (error: any) {
              toast({ variant: "destructive", title: "Error", description: error.message });
            }
          }}
          onQuickAddElement={handleQuickAddElement}
          onDelete={handleDeleteScenario}
        />
      )}

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {deleteDialog.type}
              {deleteDialog.type === 'element' && ' and remove it from all scenarios.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    

    