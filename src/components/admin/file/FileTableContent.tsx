import React from "react";
import { Table, TableBody } from "@/components/ui/table";
import { FileTableContentProps } from "@/types/file-types";
import { FileTableHeader } from "./TableHeader";
import { FileRow } from "./FileRow";
import { SearchBar } from "./SearchBar";
import { EmptyState, LoadingTable, EmptyTableMessage } from "./EmptyState";
import CurrentFolderDisplay from "./CurrentFolderDisplay";
import FilePagination from "./FilePagination";

export const FileTableContent: React.FC<FileTableContentProps> = ({
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
  fileSystemType,
  handleViewFile,
  handleEditFile,
  handleDeleteFile,
  isMobile,
  onNavigateToParent
}) => {
  return (
    <section className={isMobile ? "space-y-3" : "md:col-span-3 space-y-3"}>
      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        currentFolder={currentFolder}
        onNavigateToParent={onNavigateToParent}
      />

      <CurrentFolderDisplay currentFolder={currentFolder} />

      {/* Table container */}
      <section className="rounded-md border overflow-hidden">
        <div className="w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]">
          <Table className={isMobile ? "table-fixed" : "min-w-full"}>
            <FileTableHeader
              sortConfig={sortConfig}
              onSort={requestSort}
              fileSystemType={fileSystemType}
              isMobile={isMobile}
            />
            <TableBody>
              {loading ? (
                <LoadingTable isMobile={isMobile} />
              ) : filteredFiles.length === 0 ? (
                <EmptyTableMessage isMobile={isMobile} />
              ) : (
                paginatedFiles.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    isMobile={isMobile}
                    fileSystemType={fileSystemType}
                    onRowClick={() => handleViewFile(file)}
                    onEditFile={handleEditFile}
                    onDeleteFile={handleDeleteFile}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-2">
        <section className="text-sm text-gray-500 dark:text-gray-400 px-2 pb-2">
          Showing {paginatedFiles.length} of {filteredFiles.length} files
        </section>
        
        <FilePagination 
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
          isMobile={isMobile}
        />
      </section>
    </section>
  );
};

export default FileTableContent;