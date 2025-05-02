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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Document } from "@/services/api";
import { Switch } from "@/components/ui/switch";
import { FileText, Calendar, Tag, Plus, Lock, Unlock } from "lucide-react";

interface FileEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedFile: Document) => void;
  file: Document | null;
}

const FileEditDialog: React.FC<FileEditDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  file,
}) => {
  const [editedFile, setEditedFile] = useState<Document | null>(null);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (file && isOpen) {
      setEditedFile({ ...file });
    }
  }, [file, isOpen]);

  if (!editedFile) return null;

  const handleChange = (key: keyof Document, value: Document[keyof Document]) => {
    setEditedFile({ ...editedFile, [key]: value });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !editedFile.tags.includes(tagInput.trim())) {
      const newTags = [...editedFile.tags, tagInput.trim()];
      setEditedFile({ ...editedFile, tags: newTags });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = editedFile.tags.filter(tag => tag !== tagToRemove);
    setEditedFile({ ...editedFile, tags: newTags });
  };

  const handleSave = () => {
    onSave(editedFile);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader className="flex flex-row items-start gap-4 text-left">
          <div className="h-10 w-10 rounded-full bg-cicada-secondary/20 dark:bg-cicada-primary/20 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-cicada-secondary dark:text-cicada-primary" />
          </div>
          <div>
            <DialogTitle className="text-cicada-secondary dark:text-cicada-primary">Edit Document</DialogTitle>
            <DialogDescription>
              Update the document's information and metadata.
            </DialogDescription>
          </div>
        </DialogHeader>
        <section className="grid gap-4 py-4">
          <section className="grid gap-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Title
            </Label>
            <Input
              id="title"
              value={editedFile.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className="focus-visible:ring-cicada-secondary dark:focus-visible:ring-cicada-primary"
            />
          </section>
          
          <section className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={editedFile.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
              className="focus-visible:ring-cicada-secondary dark:focus-visible:ring-cicada-primary"
            />
          </section>
          
          <section className="grid gap-2">
            <Label htmlFor="date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Date
            </Label>
            <Input
              id="date"
              type="date"
              value={editedFile.date.split('T')[0]}
              onChange={(e) => handleChange("date", e.target.value)}
              className="focus-visible:ring-cicada-secondary dark:focus-visible:ring-cicada-primary"
            />
          </section>
          
          <section className="grid gap-2">
            <Label htmlFor="source">Source</Label>
            <Input
              id="source"
              value={editedFile.source}
              onChange={(e) => handleChange("source", e.target.value)}
              className="focus-visible:ring-cicada-secondary dark:focus-visible:ring-cicada-primary"
            />
          </section>
          
          <section>
            <Label className="mb-2 block flex items-center gap-2">
              <Tag className="h-4 w-4" /> Tags
            </Label>
            <section className="flex flex-wrap gap-1 mb-2">
              {editedFile.tags.map((tag) => (
                <section
                  key={tag}
                  className="bg-cicada-secondary/10 dark:bg-cicada-primary/10 px-2 py-1 rounded flex items-center gap-1"
                >
                  <span className="text-xs">{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    ×
                  </button>
                </section>
              ))}
            </section>
            <section className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag"
                className="flex-1 focus-visible:ring-cicada-secondary dark:focus-visible:ring-cicada-primary"
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              />
              <Button 
                type="button" 
                onClick={handleAddTag} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add
              </Button>
            </section>
          </section>
        </section>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-gray-200 dark:border-gray-700">
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-cicada-secondary hover:bg-cicada-primary text-white"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FileEditDialog;
