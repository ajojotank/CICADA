import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FolderOpen, FolderPlus, FileLock2, FileCheck, FolderX } from "lucide-react";
import { FolderStructure } from "@/services/api";
import FileContextMenu from "../FileContextMenu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FolderTreeProps {
  folders: FolderStructure[];
  currentFolder: string;
  expandedFolders: Record<string, boolean>;
  onFolderClick: (path: string) => void;
  onToggleExpand: (path: string) => void;
  onCreateFolder: () => void;
  onEditFolder: (folder: FolderStructure) => void;
  onDeleteFolder: (folder: FolderStructure) => void;
  onCreateSubfolder: (folder: FolderStructure) => void;
  fileSystemType: 'private' | 'public';
  onChangeFileSystemType: (type: 'private' | 'public') => void;
  isMobile: boolean;
}

export const FolderTree = ({
  folders,
  currentFolder,
  expandedFolders,
  onFolderClick,
  onToggleExpand,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  onCreateSubfolder,
  fileSystemType,
  onChangeFileSystemType,
  isMobile
}: FolderTreeProps) => {
  const renderFolderTree = (folders: FolderStructure[], depth = 0) => {
    if (!folders || folders.length === 0) {
      return null;
    }
    
    return folders.map((folder) => (
      <FileContextMenu
        key={folder.path}
        folder={folder}
        onEdit={onEditFolder}
        onDelete={onDeleteFolder}
        onCreateSubfolder={onCreateSubfolder}
      >
        <section className="mb-1">
          <section 
            className={`flex items-center py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer ${
              currentFolder === folder.path ? "bg-gray-100 dark:bg-gray-800" : ""
            }`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {folder.children && folder.children.length > 0 ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 p-0 mr-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(folder.path);
                }}
              >
                {expandedFolders[folder.path] ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
              </Button>
            ) : (
              <section className="w-5 mr-1"></section>
            )}
            
            <section 
              className="flex items-center flex-1 text-sm"
              onClick={() => onFolderClick(folder.path)}
            >
              <FolderOpen className="h-4 w-4 mr-2 text-yellow-500" />
              <span className="truncate">{folder.name}</span>
            </section>
          </section>
          
          {folder.children && expandedFolders[folder.path] && (
            <section>
              {renderFolderTree(folder.children, depth + 1)}
            </section>
          )}
        </section>
      </FileContextMenu>
    ));
  };

  return (
    <section className="md:col-span-1 bg-white dark:bg-gray-800 p-3 md:p-4 rounded-md border flex flex-col h-full max-h-[90vh] md:max-h-[calc(100vh-160px)]">
      {/* File System Type Selector - Fixed at top */}
      <section className="mb-4 border-b pb-2 flex-shrink-0">
        <h3 className="font-medium mb-2 text-sm text-gray-600 dark:text-gray-400">File Type</h3>
        <Tabs value={fileSystemType} onValueChange={(value) => onChangeFileSystemType(value as 'private' | 'public')}>
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700/50 p-1 h-auto">
            <TabsTrigger 
              value="private" 
              className="flex items-center gap-1.5 py-1.5 text-xs"
            >
              <FileLock2 className="h-3.5 w-3.5" />
              Private
            </TabsTrigger>
            <TabsTrigger 
              value="public" 
              className="flex items-center gap-1.5 py-1.5 text-xs"
            >
              <FileCheck className="h-3.5 w-3.5" />
              Public
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </section>

      {/* Folders Header - Fixed */}
      <section className="flex justify-between items-center mb-2 flex-shrink-0">
        <h3 className="font-medium">Folders</h3>
        {fileSystemType === "private" && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2" 
            onClick={onCreateFolder}
          >
            <FolderPlus className="h-4 w-4 mr-1" />
            New
          </Button>
        )}
      </section>
      
      {/* All content below this will be scrollable */}
      <ScrollArea className="flex-grow pr-3 -mr-3">
        <section 
          className={`flex items-center py-1 px-2 mb-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
            currentFolder === "" ? "bg-gray-100 dark:bg-gray-700" : ""
          }`}
          onClick={() => onFolderClick("")}
        >
          <FolderOpen className="h-4 w-4 mr-2 text-yellow-500" />
          <span className="text-sm">All Documents</span>
        </section>

        <section className="border-t my-2"></section>
        
        <section className="mt-2">
          {folders && folders.length > 0 ? (
            renderFolderTree(folders)
          ) : (
            <section className="py-4 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
              <FolderX className="h-10 w-10 mb-2 opacity-50" />
              <p>No folders or files</p>
            </section>
          )}
        </section>
      </ScrollArea>
    </section>
  );
};
