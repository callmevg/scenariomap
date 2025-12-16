"use client";

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderOpen, Save, FileJson, Trash2, RefreshCw } from 'lucide-react';
import type { GraphData } from '@/lib/types';

interface FileInfo {
    filename: string;
    name: string;
    modifiedAt: string;
    size: number;
}

interface FileModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'save' | 'open';
    currentGraphName?: string;
    currentGraphData?: GraphData;
    onFileOpen: (data: GraphData, filename: string) => void;
    onFileSave: (filename: string) => void;
}

export function FileModal({
    open,
    onOpenChange,
    mode,
    currentGraphName = '',
    currentGraphData,
    onFileOpen,
    onFileSave,
}: FileModalProps) {
    const [files, setFiles] = useState<FileInfo[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [filename, setFilename] = useState(currentGraphName);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load files when modal opens
    useEffect(() => {
        if (open) {
            loadFiles();
            setFilename(currentGraphName);
            setSelectedFile(null);
            setError(null);
        }
    }, [open, currentGraphName]);

    const loadFiles = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/files');
            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(`Server error: ${text.substring(0, 100)}`);
            }
            if (!response.ok) throw new Error(data.error || 'Failed to load files');
            setFiles(data.files || []);
        } catch (err: any) {
            setError(err.message);
            setFiles([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!filename.trim() || !currentGraphData) return;
        
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: filename.trim(),
                    data: currentGraphData,
                }),
            });

            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch {
                throw new Error(`Server error: ${text.substring(0, 100)}`);
            }

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save file');
            }

            onFileSave(result.filename);
            onOpenChange(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOpen = async () => {
        if (!selectedFile) return;

        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/files?filename=${encodeURIComponent(selectedFile)}`);
            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch {
                throw new Error(`Server error: ${text.substring(0, 100)}`);
            }
            if (!response.ok) throw new Error(result.error || 'Failed to open file');

            onFileOpen(result.data, selectedFile);
            onOpenChange(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (fileToDelete: string) => {
        if (!confirm(`Are you sure you want to delete "${fileToDelete}"?`)) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/files?filename=${encodeURIComponent(fileToDelete)}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete file');

            await loadFiles();
            if (selectedFile === fileToDelete) {
                setSelectedFile(null);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString();
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {mode === 'save' ? (
                            <>
                                <Save className="h-5 w-5" />
                                Save to File
                            </>
                        ) : (
                            <>
                                <FolderOpen className="h-5 w-5" />
                                Open from File
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'save'
                            ? 'Save the current graph to a file on the server.'
                            : 'Open a previously saved graph file.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* File list */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Saved Files</Label>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={loadFiles}
                                disabled={loading}
                                className="h-7 px-2"
                            >
                                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                        <ScrollArea className="h-[200px] border rounded-md">
                            {files.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">
                                    {loading ? 'Loading...' : 'No saved files found'}
                                </div>
                            ) : (
                                <div className="p-1">
                                    {files.map((file) => (
                                        <div
                                            key={file.filename}
                                            className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted/50 ${
                                                selectedFile === file.filename ? 'bg-muted' : ''
                                            }`}
                                            onClick={() => {
                                                setSelectedFile(file.filename);
                                                if (mode === 'save') {
                                                    setFilename(file.name);
                                                }
                                            }}
                                        >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <FileJson className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{file.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDate(file.modifiedAt)} · {formatSize(file.size)}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(file.filename);
                                                }}
                                            >
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Filename input (only for save mode) */}
                    {mode === 'save' && (
                        <div className="space-y-2">
                            <Label htmlFor="filename">File Name</Label>
                            <Input
                                id="filename"
                                value={filename}
                                onChange={(e) => setFilename(e.target.value)}
                                placeholder="Enter file name..."
                            />
                            <p className="text-xs text-muted-foreground">
                                File will be saved as: {filename.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'untitled'}.json
                            </p>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    {mode === 'save' ? (
                        <Button onClick={handleSave} disabled={!filename.trim() || loading}>
                            <Save className="mr-2 h-4 w-4" />
                            Save
                        </Button>
                    ) : (
                        <Button onClick={handleOpen} disabled={!selectedFile || loading}>
                            <FolderOpen className="mr-2 h-4 w-4" />
                            Open
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
