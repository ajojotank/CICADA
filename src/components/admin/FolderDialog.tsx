import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, FolderPlus } from "lucide-react";

interface FolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (folderName: string) => void;
  title: string;
  description: string;
  confirmLabel: string;
  initialValue?: string;
}

const FolderDialog: React.FC<FolderDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  description,
  confirmLabel,
  initialValue = "",
}) => {
  const [folderName, setFolderName] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setFolderName(initialValue);
    }
  }, [isOpen, initialValue]);

  const handleSave = () => {
    if (folderName.trim()) {
      onSave(folderName.trim());
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && folderName.trim()) {
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="flex flex-row items-start gap-4 text-left">
          <div className="h-10 w-10 rounded-full bg-cicada-secondary/20 dark:bg-cicada-primary/20 flex items-center justify-center flex-shrink-0">
            {title.includes("Create") ? (
              <FolderPlus className="h-5 w-5 text-cicada-secondary dark:text-cicada-primary" />
            ) : (
              <Folder className="h-5 w-5 text-cicada-secondary dark:text-cicada-primary" />
            )}
          </div>
          <div>
            <DialogTitle className="text-cicada-secondary dark:text-cicada-primary">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
        </DialogHeader>
        <section className="py-4">
          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter folder name"
            className="w-full focus-visible:ring-cicada-secondary dark:focus-visible:ring-cicada-primary"
            autoFocus
          />
        </section>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-gray-200 dark:border-gray-700">
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!folderName.trim()}
            className="bg-cicada-secondary hover:bg-cicada-primary text-white"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FolderDialog;
