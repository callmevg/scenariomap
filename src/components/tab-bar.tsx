
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Edit, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GraphData } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from './ui/separator';

interface TabBarProps {
  graphs: Record<string, GraphData>;
  activeGraphId: string | null;
  onSelectTab: (graphId: string) => void;
  onAddGraph: () => void;
  onDeleteGraph: (graphId: string) => void;
  onRenameGraph: (graphId: string, newName: string) => void;
}

export function TabBar({
  graphs,
  activeGraphId,
  onSelectTab,
  onAddGraph,
  onDeleteGraph,
  onRenameGraph,
}: TabBarProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const graphIds = Object.keys(graphs);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const handleStartEditing = (graphId: string, currentName: string) => {
    setEditingTabId(graphId);
    setEditingName(currentName);
  };

  const handleFinishEditing = () => {
    if (editingTabId && editingName.trim()) {
      onRenameGraph(editingTabId, editingName.trim());
    }
    setEditingTabId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleFinishEditing();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
      setEditingName('');
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, graphId: string) => {
    e.stopPropagation(); // Prevent tab selection
    if (graphIds.length > 1) {
        setDeleteConfirmation(graphId);
    } else {
        alert("You cannot delete the last graph.");
    }
  };

  const confirmDelete = () => {
    if (deleteConfirmation) {
        onDeleteGraph(deleteConfirmation);
        setDeleteConfirmation(null);
    }
  };

  return (
    <>
      <div className="flex items-center border bg-background rounded-lg p-1 overflow-x-auto">
        <div className="flex items-center flex-nowrap">
          {graphIds.map((graphId, index) => (
            <React.Fragment key={graphId}>
                {index > 0 && <Separator orientation="vertical" className="h-4" />}
                <div
                onClick={() => onSelectTab(graphId)}
                onDoubleClick={() => handleStartEditing(graphId, graphs[graphId].name)}
                className={cn(
                    'flex items-center h-8 px-3 rounded-md cursor-pointer group relative transition-colors flex-shrink-0',
                    activeGraphId === graphId
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted/50'
                )}
                >
                {editingTabId === graphId ? (
                    <Input
                    ref={inputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleFinishEditing}
                    onKeyDown={handleKeyDown}
                    className="h-6 w-32 px-1 text-sm bg-background text-foreground"
                    />
                ) : (
                    <span className="text-sm max-w-[150px] truncate" title={graphs[graphId].name}>
                        {graphs[graphId].name}
                    </span>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-5 w-5 ml-2 opacity-0 group-hover:opacity-100 flex-shrink-0", activeGraphId === graphId && "hover:bg-primary/80")}
                    onClick={(e) => handleDeleteClick(e, graphId)}
                >
                    <X className="h-3 w-3" />
                </Button>
                </div>
            </React.Fragment>
          ))}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 ml-1 flex-shrink-0" onClick={onAddGraph}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

       <AlertDialog open={!!deleteConfirmation} onOpenChange={(open) => !open && setDeleteConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the graph and all its content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmation(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
