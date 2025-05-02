import React, { useState, useRef, useEffect } from "react";
import { Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type ChatInputProps = {
  onSubmit: (message: string) => void;
  placeholder?: string;
  isSearchMode?: boolean;
  isLoading?: boolean;
  exampleQueries?: string[];
};

const MAX_CHAR_LIMIT = 1024;

const ChatInput: React.FC<ChatInputProps> = ({
  onSubmit,
  placeholder = "Search or ask a constitutional question…",
  isSearchMode = true,
  isLoading = false,
  exampleQueries = [],
}) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSubmit(input.trim());
      setInput("");
    }
  };

  const handleExampleClick = (query: string) => {
    onSubmit(query);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHAR_LIMIT) {
      setInput(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        onSubmit(input.trim());
        setInput('');
      }
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";

      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 160; // ≈ 6-7 lines depending on font size

      if (scrollHeight <= maxHeight) {
        textareaRef.current.style.height = `${scrollHeight}px`;
      } else {
        textareaRef.current.style.height = `${maxHeight}px`;
        textareaRef.current.style.overflowY = "auto";
      }
    }
  }, [input]);

  const charactersRemaining = MAX_CHAR_LIMIT - input.length;

  return (
    <section
      className={`w-full ${
        isSearchMode
          ? ""
          : "fixed bottom-0 left-0 right-0 bg-background border-t p-2 sm:p-4"
      }`}
    >
      <form onSubmit={handleSubmit} className="relative w-full max-w-3xl mx-auto">
        <div className="flex flex-col">
          {/* Textarea with rounded top */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className={`search-input w-full max-h-70 border-2 border-gray-200 dark:border-gray-700 rounded-t-xl border-b-0 py-3 pl-3 sm:pl-4 pr-4 bg-white dark:bg-gray-800 focus:outline-none focus:border-primary dark:focus:border-primary transition-shadow text-sm sm:text-base resize-none overflow-hidden ${
              isLoading ? "opacity-70 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
            maxLength={MAX_CHAR_LIMIT}
          />
          
          {/* Controls div with rounded bottom */}
          <div className="flex justify-between items-center px-3 py-2 border-2 border-t-1 border-gray-200 dark:border-gray-700 rounded-b-xl bg-white dark:bg-gray-800">
            <div className="text-xs text-gray-500">
              <span className={charactersRemaining < 100 ? "text-amber-500" : ""}>
                {charactersRemaining} characters left
              </span>
            </div>
            
            <Button
              type="submit"
              className="rounded-full aspect-square shadow-sm hover:shadow-md transition-shadow"
              disabled={!input.trim() || isLoading}
              size="sm"
            >
              {isSearchMode ? <Search size={16} /> : <Send size={16} />}
            </Button>
          </div>
        </div>

        {isSearchMode && exampleQueries.length > 0 && (
          <section className="flex flex-wrap gap-2 mt-2 justify-center">
            {exampleQueries.map((query, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(query)}
                className="text-xs sm:text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-1 sm:px-3 sm:py-1 rounded-full transition-colors mb-1 max-w-full overflow-hidden whitespace-nowrap flex items-center justify-center"
              >
                {query}
              </button>
            ))}
          </section>
        )}
      </form>
    </section>
  );
};

export default ChatInput;