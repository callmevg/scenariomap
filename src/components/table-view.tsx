
"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { UIElement, UIScenario } from '@/lib/types';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import { Textarea } from './ui/textarea';

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
        <div className="space-y-4">
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle>Elements</CardTitle>
                    <CardDescription>View and edit your UI elements directly in the table.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="w-[100px]">Is Buggy?</TableHead>
                                    <TableHead>Bug Details</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {editableElements.map(el => (
                                    <TableRow key={el.id}>
                                        <TableCell className="p-2">
                                            <Input
                                                value={el.name}
                                                onChange={(e) => handleElementChange(el.id, 'name', e.target.value)}
                                                className="h-8"
                                            />
                                        </TableCell>
                                        <TableCell className="text-center p-2">
                                            <Checkbox
                                                checked={el.isBuggy}
                                                onCheckedChange={(checked) => handleElementChange(el.id, 'isBuggy', !!checked)}
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <Input
                                                value={el.bugDetails || ''}
                                                onChange={(e) => handleElementChange(el.id, 'bugDetails', e.target.value)}
                                                className="h-8"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDeleteElement(el.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-4">
                     <Button onClick={handleAddElement} variant="outline">
                        <Plus className="mr-2 h-4 w-4" /> Add Element
                    </Button>
                    <Button onClick={() => handleSaveChanges('elements')}>Save Element Changes</Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader className="pb-4">
                    <CardTitle>Scenarios</CardTitle>
                        <CardDescription>
                        View and edit your user scenarios. Use comma-separated names for elements within a method, and semicolon-separated for different methods.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-md border">
                            <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Group</TableHead>
                                    <TableHead>Methods (e.g. A, B, C; X, B)</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {editableScenarios.map(scenario => (
                                    <TableRow key={scenario.id}>
                                        <TableCell className="p-2">
                                            <Input
                                                value={scenario.name}
                                                onChange={(e) => handleScenarioChange(scenario.id, 'name', e.target.value)}
                                                className="h-8"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <Input
                                                value={scenario.group || ''}
                                                onChange={(e) => handleScenarioChange(scenario.id, 'group', e.target.value)}
                                                className="h-8"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <Textarea
                                                value={scenario.methods.map(method => method.map(id => elements.find(el => el.id === id)?.name || id).join(', ')).join('; ')}
                                                onChange={(e) => handleScenarioMethodsChange(scenario.id, e.target.value)}
                                                className="h-8"
                                                rows={1}
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDeleteScenario(scenario.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-between pt-4">
                    <Button onClick={handleAddScenario} variant="outline">
                        <Plus className="mr-2 h-4 w-4" /> Add Scenario
                    </Button>
                    <Button onClick={() => handleSaveChanges('scenarios')}>Save Scenario Changes</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
