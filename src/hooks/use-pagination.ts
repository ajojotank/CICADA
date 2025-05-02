import { useState, useEffect, useMemo } from "react";
import { Document } from "@/services/api";

interface UsePaginationReturn {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  paginatedFiles: Document[];
}

export const usePagination = (filteredFiles: Document[], itemsPerPage: number): UsePaginationReturn => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = useMemo(() => 
    Math.max(1, Math.ceil(filteredFiles.length / itemsPerPage)),
  [filteredFiles.length, itemsPerPage]);
  
  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [filteredFiles]);
  
  const paginatedFiles = useMemo(() => {
    const indexOfLastFile = currentPage * itemsPerPage;
    const indexOfFirstFile = indexOfLastFile - itemsPerPage;
    return filteredFiles.slice(indexOfFirstFile, indexOfLastFile);
  }, [currentPage, filteredFiles, itemsPerPage]);
  
  return {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedFiles
  };
};