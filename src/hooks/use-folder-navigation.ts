import { useState, useCallback } from "react";

interface UseFolderNavigationReturn {
  currentFolder: string;
  setCurrentFolder: (path: string) => void;
  expandedFolders: Record<string, boolean>;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  navigateToFolder: (path: string) => void;
  navigateToParent: () => void;
  toggleFolderExpanded: (path: string) => void;
}

export const useFolderNavigation = (): UseFolderNavigationReturn => {
  const [currentFolder, setCurrentFolder] = useState<string>("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  
  const navigateToFolder = useCallback((path: string) => {
    setCurrentFolder(path);
  }, []);
  
  const navigateToParent = useCallback(() => {
    const parts = currentFolder.split("/");
    parts.pop();
    setCurrentFolder(parts.join("/"));
  }, [currentFolder]);
  
  const toggleFolderExpanded = useCallback((path: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path],
    }));
  }, []);
  
  return {
    currentFolder,
    setCurrentFolder,
    expandedFolders,
    setExpandedFolders,
    navigateToFolder,
    navigateToParent,
    toggleFolderExpanded
  };
};