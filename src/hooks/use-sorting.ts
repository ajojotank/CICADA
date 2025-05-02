import { useState, useCallback } from "react";
import { Document } from "@/services/api";
import { SortConfig } from "@/types/file-types";

interface UseSortingReturn {
  sortConfig: SortConfig;
  requestSort: (key: string) => SortConfig;
  sortItems: (items: Document[], key: string, direction: "ascending" | "descending") => Document[];
}

export const useSorting = (
  initialKey = "date", 
  initialDirection: "ascending" | "descending" = "descending"
): UseSortingReturn => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: initialKey,
    direction: initialDirection,
  });

  const sortItems = useCallback((items: Document[], key: string, direction: "ascending" | "descending") => {
    return [...items].sort((a, b) => {
      const valueA = a[key as keyof Document];
      const valueB = b[key as keyof Document];
      
      // Handle null/undefined values
      if (valueA === null || valueA === undefined) return direction === "ascending" ? -1 : 1;
      if (valueB === null || valueB === undefined) return direction === "ascending" ? 1 : -1;
      
      if (valueA < valueB) {
        return direction === "ascending" ? -1 : 1;
      }
      if (valueA > valueB) {
        return direction === "ascending" ? 1 : -1;
      }
      return 0;
    });
  }, []);

  const requestSort = useCallback((key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    const newConfig = { key, direction };
    setSortConfig(newConfig);
    return newConfig;
  }, [sortConfig.key, sortConfig.direction]);

  return {
    sortConfig,
    requestSort,
    sortItems
  };
};