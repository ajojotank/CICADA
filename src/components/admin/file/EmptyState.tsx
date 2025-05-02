import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyStateProps } from "@/types/file-types";

export const LoadingTable: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={`loading-${index}`}>
          <td colSpan={isMobile ? 2 : 6}>
            <Skeleton className="h-12 w-full" />
          </td>
        </tr>
      ))}
    </>
  );
};

export const EmptyTableMessage: React.FC<{ isMobile: boolean }> = ({ isMobile }) => (
  <tr>
    <td colSpan={isMobile ? 2 : 6} className="text-center py-8">
      No files found.
    </td>
  </tr>
);

export const EmptyState: React.FC<EmptyStateProps> = ({ isMobile, type }) => {
  if (type === "loading") {
    return <LoadingTable isMobile={isMobile} />;
  }
  
  return <EmptyTableMessage isMobile={isMobile} />;
};

export default EmptyState;