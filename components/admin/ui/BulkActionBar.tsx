"use client";

import { useState } from "react";
import { Mail, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface BulkActionBarProps {
  selectedCount: number;
  onMessage: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export function BulkActionBar({ selectedCount, onMessage, onExport, onDelete }: BulkActionBarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="bg-surface-elevated border border-accent-red/30 rounded-lg p-4 flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
        <span className="text-text-primary font-medium">
          {selectedCount} student{selectedCount > 1 ? "s" : ""} selected
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onMessage}
            className="border-border-custom"
          >
            <Mail className="h-4 w-4 mr-2" />
            Message All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="border-border-custom"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="border-accent-red/50 text-accent-red hover:bg-accent-red/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-surface border-border-custom">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} Students</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected student accounts and remove all their data from the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border-custom">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-accent-red text-white hover:bg-accent-red/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
