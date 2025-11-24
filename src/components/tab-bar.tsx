
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
      <div className="flex items-center border-b bg-background px-2">
        {graphIds.map((graphId) => (
          <div
            key={graphId}
            onClick={() => onSelectTab(graphId)}
            onDoubleClick={() => handleStartEditing(graphId, graphs[graphId].name)}
            className={cn(
              'flex items-center h-10 px-3 border-r cursor-pointer group relative',
              activeGraphId === graphId
                ? 'bg-muted border-b-2 border-b-primary -mb-px'
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
                className="h-6 w-32 px-1 text-sm"
              />
            ) : (
              <span className="text-sm">{graphs[graphId].name}</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 ml-2 opacity-0 group-hover:opacity-100"
              onClick={(e) => handleDeleteClick(e, graphId)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="icon" className="h-8 w-8 ml-1" onClick={onAddGraph}>
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
