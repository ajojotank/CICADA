import React from "react";
import { FolderOpen } from "lucide-react";

interface CurrentFolderDisplayProps {
  currentFolder: string;
}

export const CurrentFolderDisplay: React.FC<CurrentFolderDisplayProps> = ({ currentFolder }) => {
  if (!currentFolder) return null;
  
  return (
    <section className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded flex items-center text-sm">
      <FolderOpen className="h-4 w-4 mr-2 text-yellow-500" />
      <span className="truncate">
        {currentFolder.split("/").join(" / ")}
      </span>
    </section>
  );
};

export default CurrentFolderDisplay;