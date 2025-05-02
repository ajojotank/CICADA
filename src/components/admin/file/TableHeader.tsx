import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown } from "lucide-react";

interface SortConfig {
  key: string;
  direction: "ascending" | "descending";
}

interface TableHeaderProps {
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  fileSystemType: 'private' | 'public';
  isMobile: boolean;
}

export const FileTableHeader = ({ sortConfig, onSort, fileSystemType, isMobile }: TableHeaderProps) => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead
          className="cursor-pointer"
          onClick={() => onSort("title")}
        >
          <section className="flex items-center gap-1">
            Document
            {sortConfig.key === "title" && (
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  sortConfig.direction === "ascending" ? "rotate-180" : ""
                }`}
              />
            )}
          </section>
        </TableHead>
        
        {!isMobile && (
          <>
            <TableHead
              className="cursor-pointer whitespace-nowrap"
              onClick={() => onSort("date")}
            >
              <section className="flex items-center gap-1">
                Date
                {sortConfig.key === "date" && (
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      sortConfig.direction === "ascending" ? "rotate-180" : ""
                    }`}
                  />
                )}
              </section>
            </TableHead>
            
            <TableHead className="whitespace-nowrap">Tags</TableHead>
            
            <TableHead
              className="cursor-pointer whitespace-nowrap"
              onClick={() => onSort("size")}
            >
              <section className="flex items-center gap-1">
                Size
                {sortConfig.key === "size" && (
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      sortConfig.direction === "ascending" ? "rotate-180" : ""
                    }`}
                  />
                )}
              </section>
            </TableHead>
            
            <TableHead className="whitespace-nowrap">Source</TableHead>
          </>
        )}
        
        {/* Empty header for actions column without label */}
        <TableHead className="w-[60px]"></TableHead>
      </TableRow>
    </TableHeader>
  );
};
