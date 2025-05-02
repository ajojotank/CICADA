import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { History, Trash2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

type SearchHistoryItem = {
  id: string;
  query: string;
  timestamp: number;
};

interface SearchSidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

const SearchSidebar: React.FC<SearchSidebarProps> = ({ isOpen, onClose }) => {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Load search history from localStorage
    const loadSearchHistory = () => {
      const savedHistory = localStorage.getItem("searchHistory");
      if (savedHistory) {
        try {
          setSearchHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error("Error loading search history:", e);
          setSearchHistory([]);
        }
      }
    };

    loadSearchHistory();
  }, []);

  const clearHistory = () => {
    localStorage.removeItem("searchHistory");
    setSearchHistory([]);
  };

  const deleteHistoryItem = (id: string) => {
    const updatedHistory = searchHistory.filter((item) => item.id !== id);
    setSearchHistory(updatedHistory);
    localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
  };

  // For mobile devices, use the Sheet component
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose ? () => onClose() : undefined}>
        <SheetContent side="left" className="p-0 w-4/5 max-w-sm">
          <section className="h-full flex flex-col">
            <section className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-medium">Search History</h2>
              <section className="hidden md:flex items-center gap-2">
                {searchHistory.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    title="Clear all history"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                )}
              </section>
            </section>

            <ScrollArea className="flex-1">
              {searchHistory.length > 0 ? (
                <section className="p-2">
                  {searchHistory.map((item) => (
                    <section
                      key={item.id}
                      className="p-3 hover:bg-muted rounded-md mb-1 group flex justify-between items-start cursor-pointer"
                      onClick={() => {
                        const event = new CustomEvent("loadSearchQuery", {
                          detail: item.query,
                        });
                        window.dispatchEvent(event);
                        if (onClose) onClose();
                      }}
                    >
                      <span className="text-sm line-clamp-2">{item.query}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 hover:bg-red-600 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoryItem(item.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </section>
                  ))}
                </section>
              ) : (
                <section className="p-4 text-sm text-gray-500 dark:text-gray-400">
                  <p className="mb-2">No search history yet</p>
                </section>
              )}
            </ScrollArea>
            <section className="p-4 border-t">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Chats are automatically deleted after 30 days to protect your privacy.
              </p>
            </section>
          </section>
        </SheetContent>
      </Sheet>
    );
  }

  // For desktop devices, return the original sidebar
  if (!isOpen) return null;

  return (
    <section className="w-64 h-full border-r bg-background overflow-hidden flex flex-col">
      <section className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-medium">Search History</h2>
        {searchHistory.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            title="Clear all history"
          >
            <History className="h-4 w-4" />
          </Button>
        )}
      </section>

      <ScrollArea className="flex-1">
        {searchHistory.length > 0 ? (
          <section className="p-2">
            {searchHistory.map((item) => (
              <section
                key={item.id}
                className="p-3 hover:bg-muted rounded-md mb-1 group flex justify-between items-start cursor-pointer"
                onClick={() => {
                  // We'll implement this in the ChatWindow component
                  const event = new CustomEvent("loadSearchQuery", {
                    detail: item.query,
                  });
                  window.dispatchEvent(event);
                }}
              >
                <span className="text-sm line-clamp-2">{item.query}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 hover:bg-red-600 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteHistoryItem(item.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </section>
            ))}
          </section>
        ) : (
          <section className="p-4 text-sm text-gray-500 dark:text-gray-400">
            <p className="mb-2">No search history yet</p>
          </section>
        )}
      </ScrollArea>
      <section className="p-4 border-t">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Chats are automatically deleted after 30 days to protect your privacy.
        </p>
      </section>
    </section>
  );
};

export default SearchSidebar;
