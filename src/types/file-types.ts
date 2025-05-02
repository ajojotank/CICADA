import { Document, FolderStructure } from "@/services/api";

export interface SortConfig {
  key: string;
  direction: "ascending" | "descending";
}

export interface DeleteTarget {
  type: "file" | "folder";
  item: Document | FolderStructure;
}

export interface FileTableContentProps {
  currentFolder: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  loading: boolean;
  filteredFiles: Document[];
  paginatedFiles: Document[];
  totalPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  sortConfig: SortConfig;
  requestSort: (key: string) => void;
  fileSystemType: "private" | "public";
  handleViewFile: (file: Document) => void;
  handleEditFile: (id: string, event?: React.MouseEvent) => void;
  handleDeleteFile: (id: string, event?: React.MouseEvent) => void;
  isMobile: boolean;
  onNavigateToParent: () => void;
}

export interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  deleteTarget: DeleteTarget | null;
  onConfirmDelete: () => void;
}

export interface FilePaginationProps {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  isMobile: boolean;
}

export interface EmptyStateProps {
  isMobile: boolean;
  type: "loading" | "empty";
}