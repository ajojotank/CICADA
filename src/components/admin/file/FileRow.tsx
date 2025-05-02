import { TableCell, TableRow } from "@/components/ui/table";
import { Document } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Edit, FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileRowProps {
  file: Document;
  isMobile: boolean;
  fileSystemType: 'private' | 'public';
  onRowClick: (file: Document) => void;
  onEditFile: (id: string, event?: React.MouseEvent) => void;
  onDeleteFile: (id: string, event?: React.MouseEvent) => void;
}

export const FileRow = ({
  file,
  isMobile,
  fileSystemType,
  onRowClick,
  onEditFile,
  onDeleteFile,
}: FileRowProps) => {
  // Check if file is public (can't be edited or deleted)
  const isPublic = fileSystemType === 'public';

  return (
    <TableRow 
      onClick={() => onRowClick(file)}
      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    >
      <TableCell className="font-medium">
        <section className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-purple-500" />
          <section className="flex flex-col">
            <span className="truncate max-w-[150px] sm:max-w-[250px]">{file.title}</span>
            {isMobile && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(file.date).toLocaleDateString()} • {file.size}
              </span>
            )}
          </section>
        </section>
        {isMobile && file.tags.length > 0 && (
          <section className="flex flex-wrap gap-1 mt-1 ml-6">
            {file.tags.slice(0, 2).map((tag: string, i: number) => (
              <span
                key={i}
                className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs"
              >
                {tag}
              </span>
            ))}
            {file.tags.length > 2 && (
              <span className="text-xs text-gray-500">+{file.tags.length - 2}</span>
            )}
          </section>
        )}
      </TableCell>

      {!isMobile && (
        <>
          <TableCell>{new Date(file.date).toLocaleDateString()}</TableCell>
          <TableCell>
            <section className="flex flex-wrap gap-1">
              {file.tags.map((tag: string, i: number) => (
                <span
                  key={i}
                  className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </section>
          </TableCell>
          <TableCell>{file.size}</TableCell>
          {!isMobile && (
            <TableCell>{file.source}</TableCell>
          )}
        </>
      )}
      
      {/* Actions column - more compact and always at the end */}
      <TableCell className="text-right">
        {/* Only show edit/delete actions for private files */}
        {!isPublic && (
          <section 
            className="flex justify-end" 
            onClick={(e) => e.stopPropagation()}
          >
            {isMobile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={(e) => onEditFile(file.id, e)} className="cursor-pointer">
                    <Pencil className="h-4 w-4 mr-2" />
                    <span>Edit Details</span>
                  </DropdownMenuItem>
                  {isMobile && (
                    <DropdownMenuItem className="cursor-pointer text-xs text-gray-500">
                      Source: {file.source || "Local Repository"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={(e) => onDeleteFile(file.id, e)} 
                    className="cursor-pointer text-red-500 hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    <span>Delete File</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <section className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => onEditFile(file.id, e)}
                  title="Edit File Details"
                >
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => onDeleteFile(file.id, e)}
                  className="hover:bg-red-500 hover:text-white"
                  title="Delete File"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </section>
            )}
          </section>
        )}
        {/* For public files, show a message or leave empty */}
        {isPublic && isMobile && (
          <section className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="cursor-pointer text-xs text-gray-500">
                  Source: {file.source || "Public Repository"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </section>
        )}
      </TableCell>
    </TableRow>
  );
};
