import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { FilePaginationProps } from "@/types/file-types";

const renderPaginationItems = (
  currentPage: number, 
  totalPages: number, 
  setCurrentPage: (page: number) => void
) => {
  if (totalPages <= 7) {
    // Show all pages if 7 or fewer
    return Array.from({ length: totalPages }, (_, i) => (
      <PaginationItem key={i + 1}>
        <PaginationLink 
          href="#"
          isActive={currentPage === i + 1}
          onClick={(e) => {
            e.preventDefault();
            setCurrentPage(i + 1);
          }}
        >
          {i + 1}
        </PaginationLink>
      </PaginationItem>
    ));
  }
  
  // For more than 7 pages, show first, last, current and some pages around current
  const items = [];
  
  // Always add first page
  items.push(
    <PaginationItem key={1}>
      <PaginationLink 
        href="#"
        isActive={currentPage === 1}
        onClick={(e) => {
          e.preventDefault();
          setCurrentPage(1);
        }}
      >
        1
      </PaginationLink>
    </PaginationItem>
  );
  
  // Add ellipsis if needed
  if (currentPage > 3) {
    items.push(
      <PaginationItem key="ellipsis-start">
        <PaginationEllipsis />
      </PaginationItem>
    );
  }
  
  // Add pages around current page
  const startPage = Math.max(2, currentPage - 1);
  const endPage = Math.min(totalPages - 1, currentPage + 1);
  
  for (let i = startPage; i <= endPage; i++) {
    items.push(
      <PaginationItem key={i}>
        <PaginationLink 
          href="#"
          isActive={currentPage === i}
          onClick={(e) => {
            e.preventDefault();
            setCurrentPage(i);
          }}
        >
          {i}
        </PaginationLink>
      </PaginationItem>
    );
  }
  
  // Add ellipsis if needed
  if (currentPage < totalPages - 2) {
    items.push(
      <PaginationItem key="ellipsis-end">
        <PaginationEllipsis />
      </PaginationItem>
    );
  }
  
  // Always add last page
  items.push(
    <PaginationItem key={totalPages}>
      <PaginationLink 
        href="#"
        isActive={currentPage === totalPages}
        onClick={(e) => {
          e.preventDefault();
          setCurrentPage(totalPages);
        }}
      >
        {totalPages}
      </PaginationLink>
    </PaginationItem>
  );
  
  return items;
};

export const FilePagination: React.FC<FilePaginationProps> = ({ 
  currentPage, 
  totalPages, 
  setCurrentPage, 
  isMobile 
}) => {
  // Skip rendering pagination if only one page
  if (totalPages <= 1) return null;
  
  return (
    <Pagination className="w-full sm:w-auto mb-2">
      <PaginationContent className="flex-wrap justify-center">
        <PaginationItem className="mr-1">
          <PaginationPrevious 
            onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
            className={`${currentPage === 1 ? "pointer-events-none opacity-50" : ""} h-8 w-8 sm:h-9 sm:w-auto sm:px-3`}
            href="#"
          />
        </PaginationItem>
        
        {/* Mobile view shows simple indicator */}
        {isMobile ? (
          <PaginationItem className="flex items-center flex-1 justify-center">
            <span className="text-sm font-medium px-3 py-1.5 whitespace-nowrap ml-3">
              {currentPage} / {totalPages}
            </span>
          </PaginationItem>
        ) : (
          // Desktop view shows page numbers with ellipsis
          renderPaginationItems(currentPage, totalPages, setCurrentPage)
        )}
        
        <PaginationItem className="ml-1">
          <PaginationNext 
            onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
            className={`${currentPage === totalPages ? "pointer-events-none opacity-50" : ""} h-8 w-8 sm:h-9 sm:w-auto sm:px-3`}
            href="#"
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default FilePagination;