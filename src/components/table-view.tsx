
"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { UIElement, UIScenario } from '@/lib/types';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import { Textarea } from './ui/textarea';

// Resizable Table Header Component
interface ResizableHeaderProps {
    children: React.ReactNode;
    width: number;
    onResize: (width: number) => void;
    className?: string;
    minWidth?: number;
}

function ResizableHeader({ children, width, onResize, className = '', minWidth = 50 }: ResizableHeaderProps) {
    const headerRef = useRef<HTMLTableCellElement>(null);
    const isResizing = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(0);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        startX.current = e.clientX;
        startWidth.current = width;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing.current) return;
            const diff = e.clientX - startX.current;
            const newWidth = Math.max(minWidth, startWidth.current + diff);
            onResize(newWidth);
        };

        const handleMouseUp = () => {
            isResizing.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [width, onResize, minWidth]);

    return (
        <TableHead 
            ref={headerRef} 
            className={`relative ${className}`} 
            style={{ width: `${width}px`, minWidth: `${minWidth}px` }}
        >
            {children}
            <div
                className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary"
                onMouseDown={handleMouseDown}
            />
        </TableHead>
    );
}

interface TableViewProps {
    elements: UIElement[];
    scenarios: UIScenario[];
    onBulkUpdate: (type: 'elements' | 'scenarios', data: any[]) => Promise<void>;
    onDeleteElement: (id: string) => void;
    onDeleteScenario: (id: string) => void;
}

export function TableView({ elements, scenarios, onBulkUpdate, onDeleteElement, onDeleteScenario }: TableViewProps) {
    const { toast } = useToast();
    const [editableElements, setEditableElements] = useState<UIElement[]>([]);
    const [editableScenarios, setEditableScenarios] = useState<UIScenario[]>([]);
    
    // Column widths for Elements table
    const [elementColWidths, setElementColWidths] = useState({
        name: 200,
        isBuggy: 80,
        bugDetails: 250,
        actions: 70
    });
    
    // Column widths for Scenarios table
    const [scenarioColWidths, setScenarioColWidths] = useState({
        name: 180,
        group: 120,
        methods: 300,
        actions: 70
    });

    useEffect(() => {
        setEditableElements(elements.map(e => ({...e})));
    }, [elements]);

    useEffect(() => {
        setEditableScenarios(scenarios.map(f => ({
            ...f,
            methods: [...(f.methods || [])]
        })));
    }, [scenarios]);
    
    const handleElementChange = (id: string, field: keyof UIElement, value: string | boolean) => {
        setEditableElements(prev =>
            prev.map(el => (el.id === id ? { ...el, [field]: value } : el))
        );
    };

    const handleScenarioChange = (id: string, field: keyof UIScenario, value: string) => {
        setEditableScenarios(prev =>
            prev.map(scenario => (scenario.id === id ? { ...scenario, [field]: value } : scenario))
        );
    };

    const handleScenarioMethodsChange = (id: string, value: string) => {
        const methodsAsString = value.split(';').map(p => p.trim());
        const methodsAsElementNames = methodsAsString.map(p => p.split(',').map(name => name.trim()));
        setEditableScenarios(prev =>
            // @ts-ignore
            prev.map(scenario => (scenario.id === id ? { ...scenario, methods: methodsAsElementNames } : scenario))
        );
    };

    const handleSaveChanges = (type: 'elements' | 'scenarios') => {
        try {
            if (type === 'elements') {
                const elementsToUpdate = editableElements.map(el => ({
                    id: el.id,
                    name: el.name,
                    isBuggy: el.isBuggy,
                    bugDetails: el.bugDetails || '',
                    mediaLink: el.mediaLink || ''
                }));
                onBulkUpdate('elements', elementsToUpdate);
            } else { // scenarios
                const scenariosToUpdate = editableScenarios.map(scenario => {
                     const methods = scenario.methods.map((method) => {
                        return method.map(name => {
                            const element = elements.find(el => el.name.toLowerCase() === name.toLowerCase());
                            return element ? element.id : name; // Keep name if not found, let parent handle it
                        });
                    });

                    return {
                        id: scenario.id,
                        name: scenario.name,
                        group: scenario.group || '',
                        methods: methods,
                    };
                });
                 onBulkUpdate('scenarios', scenariosToUpdate);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Save Error', description: 'Failed to save changes.' });
        }
    };
    
    const handleAddElement = () => {
        const newId = `new-${Date.now()}`;
        const newElement: UIElement = {
            id: newId,
            name: 'New Element',
            isBuggy: false,
            bugDetails: '',
            mediaLink: '',
            createdAt: new Date().toISOString()
        };
        setEditableElements(prev => [...prev, newElement]);
    };

    const handleAddScenario = () => {
        const newId = `new-${Date.now()}`;
        const newScenario: UIScenario = {
            id: newId,
            name: 'New Scenario',
            methods: [[]],
            group: ''
        };
        setEditableScenarios(prev => [...prev, newScenario]);
    };


    return (
        <div className="space-y-2">
            <Card className="shadow-none">
                <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm">Elements</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="border-t overflow-x-auto">
                        <Table className="table-fixed">
                            <TableHeader>
                                <TableRow>
                                    <ResizableHeader
                                        width={elementColWidths.name}
                                        onResize={(w) => setElementColWidths(prev => ({ ...prev, name: w }))}
                                    >
                                        Name
                                    </ResizableHeader>
                                    <ResizableHeader
                                        width={elementColWidths.isBuggy}
                                        onResize={(w) => setElementColWidths(prev => ({ ...prev, isBuggy: w }))}
                                        minWidth={60}
                                    >
                                        Is Buggy?
                                    </ResizableHeader>
                                    <ResizableHeader
                                        width={elementColWidths.bugDetails}
                                        onResize={(w) => setElementColWidths(prev => ({ ...prev, bugDetails: w }))}
                                    >
                                        Bug Details
                                    </ResizableHeader>
                                    <ResizableHeader
                                        width={elementColWidths.actions}
                                        onResize={(w) => setElementColWidths(prev => ({ ...prev, actions: w }))}
                                        className="text-right"
                                        minWidth={50}
                                    >
                                        Actions
                                    </ResizableHeader>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {editableElements.map(el => (
                                    <TableRow key={el.id} className="h-8">
                                        <TableCell style={{ width: elementColWidths.name }}>
                                            <Input
                                                value={el.name}
                                                onChange={(e) => handleElementChange(el.id, 'name', e.target.value)}
                                                className="h-6 text-xs px-1.5 border-0 bg-transparent focus-visible:bg-background focus-visible:border"
                                            />
                                        </TableCell>
                                        <TableCell style={{ width: elementColWidths.isBuggy }}>
                                            <div className="flex items-center justify-center h-full">
                                                <Checkbox
                                                    checked={el.isBuggy}
                                                    onCheckedChange={(checked) => handleElementChange(el.id, 'isBuggy', !!checked)}
                                                    className="h-3.5 w-3.5"
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell style={{ width: elementColWidths.bugDetails }}>
                                            <Input
                                                value={el.bugDetails || ''}
                                                onChange={(e) => handleElementChange(el.id, 'bugDetails', e.target.value)}
                                                className="h-6 text-xs px-1.5 border-0 bg-transparent focus-visible:bg-background focus-visible:border"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right" style={{ width: elementColWidths.actions }}>
                                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onDeleteElement(el.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between py-1.5 px-3">
                     <Button onClick={handleAddElement} variant="outline" size="sm" className="h-6 text-xs">
                        <Plus className="mr-1 h-3 w-3" /> Add
                    </Button>
                    <Button onClick={() => handleSaveChanges('elements')} size="sm" className="h-6 text-xs">Save Changes</Button>
                </CardFooter>
            </Card>

            <Card className="shadow-none">
                <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm">Scenarios</CardTitle>
                    <CardDescription className="text-xs">
                        Comma-separated elements per method, semicolon-separated methods.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="border-t overflow-x-auto">
                        <Table className="table-fixed">
                            <TableHeader>
                                <TableRow>
                                    <ResizableHeader
                                        width={scenarioColWidths.name}
                                        onResize={(w) => setScenarioColWidths(prev => ({ ...prev, name: w }))}
                                    >
                                        Name
                                    </ResizableHeader>
                                    <ResizableHeader
                                        width={scenarioColWidths.group}
                                        onResize={(w) => setScenarioColWidths(prev => ({ ...prev, group: w }))}
                                    >
                                        Group
                                    </ResizableHeader>
                                    <ResizableHeader
                                        width={scenarioColWidths.methods}
                                        onResize={(w) => setScenarioColWidths(prev => ({ ...prev, methods: w }))}
                                    >
                                        Methods (e.g. A, B, C; X, B)
                                    </ResizableHeader>
                                    <ResizableHeader
                                        width={scenarioColWidths.actions}
                                        onResize={(w) => setScenarioColWidths(prev => ({ ...prev, actions: w }))}
                                        className="text-right"
                                        minWidth={50}
                                    >
                                        Actions
                                    </ResizableHeader>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {editableScenarios.map(scenario => (
                                    <TableRow key={scenario.id} className="h-8">
                                        <TableCell style={{ width: scenarioColWidths.name }}>
                                            <Input
                                                value={scenario.name}
                                                onChange={(e) => handleScenarioChange(scenario.id, 'name', e.target.value)}
                                                className="h-6 text-xs px-1.5 border-0 bg-transparent focus-visible:bg-background focus-visible:border"
                                            />
                                        </TableCell>
                                        <TableCell style={{ width: scenarioColWidths.group }}>
                                            <Input
                                                value={scenario.group || ''}
                                                onChange={(e) => handleScenarioChange(scenario.id, 'group', e.target.value)}
                                                className="h-6 text-xs px-1.5 border-0 bg-transparent focus-visible:bg-background focus-visible:border"
                                            />
                                        </TableCell>
                                        <TableCell style={{ width: scenarioColWidths.methods }}>
                                            <Input
                                                value={scenario.methods.map(method => method.map(id => elements.find(el => el.id === id)?.name || id).join(', ')).join('; ')}
                                                onChange={(e) => handleScenarioMethodsChange(scenario.id, e.target.value)}
                                                className="h-6 text-xs px-1.5 border-0 bg-transparent focus-visible:bg-background focus-visible:border"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right" style={{ width: scenarioColWidths.actions }}>
                                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onDeleteScenario(scenario.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-between py-1.5 px-3">
                    <Button onClick={handleAddScenario} variant="outline" size="sm" className="h-6 text-xs">
                        <Plus className="mr-1 h-3 w-3" /> Add
                    </Button>
                    <Button onClick={() => handleSaveChanges('scenarios')} size="sm" className="h-6 text-xs">Save Changes</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
