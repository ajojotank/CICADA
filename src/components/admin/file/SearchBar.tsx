import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Search, SearchIcon } from "lucide-react";

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  currentFolder: string;
  onNavigateToParent: () => void;
}

export const SearchBar = ({ 
  searchTerm, 
  onSearchChange,
  currentFolder,
  onNavigateToParent
}: SearchBarProps) => {
  return (
    <section className="w-full p-4">
      {/* Mobile view: "Back to Parent" button when in a folder */}
      {currentFolder && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="mb-2 md:hidden items-center text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 px-2"
          onClick={onNavigateToParent}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      )}
      
      {/* Search bar and button - responsive layout */}
      <section className="flex items-center w-full gap-2">
        <section className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search files or tags..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-2 h-10 w-full"
          />
        </section>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="h-10 whitespace-nowrap flex-shrink-0"
        >
          <SearchIcon className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Search</span>
        </Button>
        
        {/* Desktop view: "Back to Parent" button when in a folder */}
        {currentFolder && (
          <Button 
            variant="outline" 
            size="sm" 
            className="hidden md:flex h-10 whitespace-nowrap"
            onClick={onNavigateToParent}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Parent
          </Button>
        )}
      </section>
    </section>
  );
};
