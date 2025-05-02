import { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchDocuments,
  fetchFolderStructure,
  Document,
  FolderStructure,
  updateDocument,
  createFolder,
  updateFolder,
  deleteFolder,
  deleteDocument,
} from "@/services/api";
import { toast } from "@/hooks/use-toast";
import FileEditDialog from "./FileEditDialog";
import FolderDialog from "./FolderDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { FolderTree } from "./file/FolderTree";
import SourceModal from "@/components/chat/SourceModal";
import { DeleteTarget } from "@/types/file-types";
import DeleteConfirmationDialog from "./file/DeleteConfirmationDialog";
import FileTableContent from "./file/FileTableContent";
import { usePagination } from "@/hooks/use-pagination";
import { useSorting } from "@/hooks/use-sorting";
import { useFolderNavigation } from "@/hooks/use-folder-navigation";

// Main FileTable component
const FileTable = () => {
  const isMobile = useIsMobile();
  const [files, setFiles] = useState<Document[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<Document[]>([]);
  const [folders, setFolders] = useState<FolderStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [fileSystemType, setFileSystemType] = useState<"private" | "public">("private");
  
  // Set items per page based on device size
  const ITEMS_PER_PAGE = isMobile ? 5 : 10;
  
  // Custom hooks for pagination, sorting, and folder navigation
  const { 
    currentFolder, 
    expandedFolders, 
    setExpandedFolders, 
    navigateToParent, 
    navigateToFolder,
    setCurrentFolder 
  } = useFolderNavigation();
  
  const { sortConfig, requestSort, sortItems } = useSorting();
  
  const { currentPage, setCurrentPage, totalPages, paginatedFiles } = 
    usePagination(filteredFiles, ITEMS_PER_PAGE);

  // Modal states
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<Document | null>(null);
  const [editFileDialogOpen, setEditFileDialogOpen] = useState(false);
  const [currentEditFile, setCurrentEditFile] = useState<Document | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderDialogMode, setFolderDialogMode] = useState<"create" | "edit">("create");
  const [currentEditFolder, setCurrentEditFolder] = useState<FolderStructure | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // Fetch data effect
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [documentsData, foldersData] = await Promise.all([
          fetchDocuments(fileSystemType),
          fetchFolderStructure(fileSystemType),
        ]);
        setFiles(documentsData);
        setFilteredFiles(documentsData);
        setFolders(foldersData);
        setCurrentFolder(""); // Reset to root folder when switching file systems
        setExpandedFolders({}); // Reset expanded folders state
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load documents and folders",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fileSystemType, setCurrentFolder, setExpandedFolders]);

  // Filter files effect
  useEffect(() => {
    const filtered = files.filter((file) => {
      const matchesSearch =
        searchTerm === "" ||
        file.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (file.tags && file.tags.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        ));

      const matchesFolder =
        currentFolder === "" ||
        file.folder === currentFolder ||
        (file.folder && file.folder.startsWith(`${currentFolder}/`));

      return matchesSearch && matchesFolder;
    });
    
    // Sort the filtered results
    const sortedFiles = sortItems(filtered, sortConfig.key, sortConfig.direction);
    setFilteredFiles(sortedFiles);
  }, [searchTerm, files, currentFolder, sortConfig.key, sortConfig.direction, sortItems]);

  // Memoized event handlers
  const handleViewFile = useCallback((file: Document) => {
    setSelectedFile(file);
    setSourceModalOpen(true);
  }, []);

  const handleEditFile = useCallback((id: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    const file = files.find((file) => file.id === id);
    if (file) {
      setCurrentEditFile(file);
      setEditFileDialogOpen(true);
    }
  }, [files]);

  const handleSaveFileEdit = useCallback(async (updatedFile: Document) => {
    try {
      await updateDocument(updatedFile);

      setFiles(prevFiles => 
        prevFiles.map((file) => (file.id === updatedFile.id ? updatedFile : file))
      );

      toast({
        title: "Success",
        description: "File updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update file",
        variant: "destructive",
      });
    }
  }, []);

  const handleDeleteFile = useCallback((id: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    const file = files.find((file) => file.id === id);
    if (file) {
      setDeleteTarget({ type: "file", item: file });
      setDeleteDialogOpen(true);
    }
  }, [files]);

  const confirmDeleteFile = useCallback(async () => {
    if (deleteTarget?.type === "file") {
      const file = deleteTarget.item as Document;
      try {
        await deleteDocument(file.id, fileSystemType);
        setFiles(prevFiles => prevFiles.filter((f) => f.id !== file.id));
        toast({
          title: "Success",
          description: "File deleted successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete file",
          variant: "destructive",
        });
      }
    }
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  }, [deleteTarget, fileSystemType]);

  const handleDeleteFolder = useCallback((folder: FolderStructure) => {
    setDeleteTarget({ type: "folder", item: folder });
    setDeleteDialogOpen(true);
  }, []);

  const confirmDeleteFolder = useCallback(async () => {
    if (deleteTarget?.type === "folder") {
      const folder = deleteTarget.item as FolderStructure;
      try {
        await deleteFolder(folder.path, fileSystemType);

        const updateFolders = (
          folders: FolderStructure[],
          path: string
        ): FolderStructure[] => {
          return folders.filter((f) => {
            if (f.path === path) return false;
            if (f.children) {
              f.children = updateFolders(f.children, path);
            }
            return true;
          });
        };

        setFolders(prevFolders => updateFolders([...prevFolders], folder.path));

        if (
          currentFolder === folder.path ||
          currentFolder.startsWith(folder.path + "/")
        ) {
          const parts = folder.path.split("/");
          parts.pop();
          setCurrentFolder(parts.join("/"));
        }

        toast({
          title: "Success",
          description: "Folder deleted successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete folder",
          variant: "destructive",
        });
      }
    }
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  }, [deleteTarget, fileSystemType, currentFolder, setCurrentFolder]);

  const handleEditFolder = useCallback((folder: FolderStructure) => {
    setCurrentEditFolder(folder);
    setFolderDialogMode("edit");
    setFolderDialogOpen(true);
  }, []);

  const handleSaveFileSystemChange = useCallback((type: "private" | "public") => {
    setFileSystemType(type);
  }, []);

  const handleSaveFolderEdit = useCallback(async (newName: string) => {
    if (!currentEditFolder) return;

    try {
      await updateFolder(
        currentEditFolder.path,
        newName,
        fileSystemType
      );

      const updateFolderName = (
        folders: FolderStructure[],
        path: string,
        newName: string
      ): FolderStructure[] => {
        return folders.map((folder) => {
          if (folder.path === path) {
            const pathParts = folder.path.split("/");
            pathParts[pathParts.length - 1] = newName;
            const newPath = pathParts.join("/");
            return { ...folder, name: newName, path: newPath };
          }
          if (folder.children) {
            folder.children = updateFolderName(folder.children, path, newName);
          }
          return folder;
        });
      };

      setFolders(prevFolders => updateFolderName([...prevFolders], currentEditFolder.path, newName));

      toast({
        title: "Success",
        description: "Folder renamed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rename folder",
        variant: "destructive",
      });
    }
  }, [currentEditFolder, fileSystemType]);

  const handleCreateFolder = useCallback(() => {
    setCurrentEditFolder(null);
    setFolderDialogMode("create");
    setFolderDialogOpen(true);
  }, []);

  const handleCreateSubfolder = useCallback((parentFolder: FolderStructure) => {
    setFolderDialogMode("create");
    setCurrentEditFolder(parentFolder);
    setFolderDialogOpen(true);
  }, []);

  const handleSaveNewFolder = useCallback(async (folderName: string) => {
    try {
      const parentPath = currentEditFolder
        ? currentEditFolder.path
        : currentFolder;
      const path = parentPath ? `${parentPath}/${folderName}` : folderName;

      const newFolder = await createFolder(path, folderName, fileSystemType);

      const addNewFolder = (
        folders: FolderStructure[],
        parentPath: string,
        newFolder: FolderStructure
      ): FolderStructure[] => {
        return folders.map((folder) => {
          if (folder.path === parentPath) {
            return {
              ...folder,
              children: [...(folder.children || []), newFolder],
            };
          }
          if (folder.children) {
            folder.children = addNewFolder(
              folder.children,
              parentPath,
              newFolder
            );
          }
          return folder;
        });
      };

      if (parentPath) {
        setFolders(prevFolders => addNewFolder([...prevFolders], parentPath, newFolder));
        setExpandedFolders((prev) => ({
          ...prev,
          [parentPath]: true,
        }));
      } else {
        setFolders(prevFolders => [...prevFolders, newFolder]);
      }

      toast({
        title: "Success",
        description: "Folder created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
    }
  }, [currentEditFolder, currentFolder, fileSystemType, setExpandedFolders]);

  // Memoized folders tree props
  const folderTreeProps = useMemo(() => ({
    folders, 
    currentFolder, 
    expandedFolders,
    onFolderClick: setCurrentFolder,
    onToggleExpand: (path: string) => setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] })),
    onCreateFolder: handleCreateFolder,
    onEditFolder: handleEditFolder, 
    onDeleteFolder: handleDeleteFolder, 
    onCreateSubfolder: handleCreateSubfolder,
    fileSystemType,
    onChangeFileSystemType: handleSaveFileSystemChange,
    isMobile
  }), [folders, currentFolder, expandedFolders, setCurrentFolder, handleCreateFolder, handleEditFolder, handleDeleteFolder, handleCreateSubfolder, fileSystemType, handleSaveFileSystemChange, isMobile, setExpandedFolders]);

  // Handle confirmation actions
  const handleConfirmDelete = useCallback(() => {
    if (deleteTarget?.type === "folder") {
      return confirmDeleteFolder();
    } else {
      return confirmDeleteFile();
    }
  }, [deleteTarget?.type, confirmDeleteFolder, confirmDeleteFile]);

  // Memoized file table content props
  const fileTableContentProps = useMemo(() => ({
    currentFolder,
    searchTerm,
    setSearchTerm,
    loading,
    filteredFiles,
    paginatedFiles,
    totalPages,
    currentPage,
    setCurrentPage,
    sortConfig,
    requestSort: (key: string) => {
      const newSortConfig = requestSort(key);
      const sortedFiles = sortItems(filteredFiles, newSortConfig.key, newSortConfig.direction);
      setFilteredFiles(sortedFiles);
    },
    fileSystemType,
    handleViewFile,
    handleEditFile,
    handleDeleteFile,
    isMobile,
    onNavigateToParent: navigateToParent
  }), [
    currentFolder,
    searchTerm,
    setSearchTerm,
    loading,
    filteredFiles,
    paginatedFiles,
    totalPages,
    currentPage,
    setCurrentPage,
    sortConfig,
    requestSort,
    sortItems,
    fileSystemType,
    handleViewFile,
    handleEditFile,
    handleDeleteFile,
    isMobile,
    navigateToParent
  ]);

  return (
    <section className="space-y-4">
      {/* Mobile layout - stacked with folder tree above files */}
      {isMobile && (
        <div className="space-y-4">
          <div className="mb-4">
            <FolderTree {...folderTreeProps} />
          </div>
          <div>
            <FileTableContent {...fileTableContentProps} />
          </div>
        </div>
      )}

      {/* Desktop layout */}
      {!isMobile && (
        <section className="grid md:grid-cols-4 gap-4">
          <FolderTree {...folderTreeProps} />
          <FileTableContent {...fileTableContentProps} />
        </section>
      )}

      {/* Dialogs */}
      <FolderDialog
        isOpen={folderDialogOpen}
        onClose={() => setFolderDialogOpen(false)}
        onSave={folderDialogMode === "create" ? handleSaveNewFolder : handleSaveFolderEdit}
        title={folderDialogMode === "create" ? "Create New Folder" : "Rename Folder"}
        description={
          folderDialogMode === "create"
            ? "Enter a name for the new folder"
            : "Enter a new name for this folder"
        }
        confirmLabel={folderDialogMode === "create" ? "Create" : "Rename"}
        initialValue={
          folderDialogMode === "edit" && currentEditFolder
            ? currentEditFolder.name
            : ""
        }
      />

      <FileEditDialog
        isOpen={editFileDialogOpen}
        onClose={() => setEditFileDialogOpen(false)}
        onSave={handleSaveFileEdit}
        file={currentEditFile}
      />

      {selectedFile && (
        <SourceModal
          isOpen={sourceModalOpen}
          onClose={() => setSourceModalOpen(false)}
          source={selectedFile ? {
            id: selectedFile.id,
            title: selectedFile.title,
            domain: selectedFile.source || (fileSystemType === "private" ? "Local Repository" : "Public Repository"),
            preview: selectedFile.content || "No preview available for this document.",
            date: new Date(selectedFile.date).toLocaleDateString(),
            size: selectedFile.size,
            tags: selectedFile.tags || [],
            type: selectedFile.type || "Document",
            pdfUrl: selectedFile.url,
            isPublic: fileSystemType === "public",
            ai_summary: selectedFile.ai_summary || null,
            ai_key_sections: selectedFile.ai_key_sections || null,
            ai_citations: selectedFile.ai_citations || null
          } : null}
        />
      )}

      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        deleteTarget={deleteTarget}
        onConfirmDelete={handleConfirmDelete}
      />
    </section>
  );
};

export default FileTable;
