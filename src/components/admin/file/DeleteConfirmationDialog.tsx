import React from "react";
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
import { AlertTriangle, Trash2 } from "lucide-react";
import { DeleteConfirmationDialogProps } from "@/types/file-types";

export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  onClose,
  deleteTarget,
  onConfirmDelete,
}) => {
  if (!deleteTarget) return null;

  const isFolder = deleteTarget.type === "folder";
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader className="flex flex-row items-start gap-4 text-left">
          <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <AlertDialogTitle className="text-red-600 dark:text-red-400">
              {isFolder ? "Delete Folder" : "Delete File"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isFolder
                ? "Are you sure you want to delete this folder? This will also delete all files and subfolders within it."
                : "Are you sure you want to delete this file? This action cannot be undone."}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-gray-200 dark:border-gray-700">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmDelete}
            className="bg-red-500 hover:bg-red-600 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmationDialog;