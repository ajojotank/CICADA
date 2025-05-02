
import { useRef } from "react";
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from "@/components/ui/context-menu";
import { FolderEdit, FolderPlus, Trash2 } from "lucide-react";
import { FolderStructure } from "@/services/api";

type FileContextMenuProps = {
  children: React.ReactNode;
  folder: FolderStructure;
  onEdit: (folder: FolderStructure) => void;
  onDelete: (folder: FolderStructure) => void;
  onCreateSubfolder: (parentFolder: FolderStructure) => void;
};

const FileContextMenu = ({ 
  children, 
  folder, 
  onEdit, 
  onDelete,
  onCreateSubfolder 
}: FileContextMenuProps) => {
  const triggerRef = useRef<HTMLOptionElement>(null);

  return (
    <ContextMenu>
      <ContextMenuTrigger ref={triggerRef} asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => onEdit(folder)}
        >
          <FolderEdit className="h-4 w-4" />
          <span>Rename Folder</span>
        </ContextMenuItem>
        
        <ContextMenuItem 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => onCreateSubfolder(folder)}
        >
          <FolderPlus className="h-4 w-4" />
          <span>Create Subfolder</span>
        </ContextMenuItem>
        
        <ContextMenuItem 
          className="flex items-center gap-2 cursor-pointer text-red-500"
          onClick={() => onDelete(folder)}
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete Folder</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default FileContextMenu;
