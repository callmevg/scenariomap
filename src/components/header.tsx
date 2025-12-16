
import React, { useRef } from 'react';
import { Logo } from "@/components/icons";
import { Button } from '@/components/ui/button';
import { FileJson, Upload } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

interface HeaderProps {
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function Header({ onExport, onImport, disabled, children }: HeaderProps) {
  const importInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center">
          <Logo className="h-6 w-6 mr-2 text-primary" />
          <span className="font-bold text-lg">ScenarioMap</span>
        </div>
        <div className="flex-1 flex justify-center mx-4">
          {children}
        </div>
        <div className="flex items-center space-x-2">
            <Button onClick={onExport} variant="outline" size="sm" disabled={disabled}>
              <FileJson className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button onClick={() => importInputRef.current?.click()} variant="outline" size="sm" disabled={disabled}>
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
            <input
              type="file"
              ref={importInputRef}
              className="hidden"
              accept=".json"
              onChange={onImport}
              disabled={disabled}
              aria-label="Import JSON file"
            />
            <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
