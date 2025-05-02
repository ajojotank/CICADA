import React, { useState, useEffect, useRef, useCallback } from "react";
import { fetchChatResponse } from "@/services/api";
import { fetchDocumentById } from "@/services/api/documentService";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import SourceCard from "./SourceCard";
import SourceModal from "./SourceModal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  isStreaming?: boolean;
};

type Source = {
  id: string;
  title: string;
  domain: string;
  snippet: string;
  preview: string;
  date?: string;
  size?: string;
  tags?: string[];
  type?: string;
  pdfUrl?: string;
  url?: string;
  isPublic?: boolean;
  ai_summary?: string;
  ai_key_sections?: string;
  ai_citations?: string;
};

type SearchHistoryItem = {
  id: string;
  query: string;
  timestamp: number;
};

// Helper function to format snippet into key sections if none provided
const formatKeySections = (snippet?: string): string => {
  if (!snippet) return '';
  return `* **Key Content:** ${snippet}`;
};

const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSourceLoading, setIsSourceLoading] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(true);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const exampleQueries = [
    "What is freedom of speech?",
    "How is due process defined?",
    "What are the Bill of Rights?",
    "How does the electoral college work?",
  ];

  useEffect(() => {
    // Scroll to bottom when messages change
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveToSearchHistory = (query: string, isInitialQuery: boolean) => {
    if (!isInitialQuery) return; // Only save if it's the initial query
    
    try {
      const existingHistory = localStorage.getItem('searchHistory');
      let history: SearchHistoryItem[] = existingHistory ? JSON.parse(existingHistory) : [];
      
      const newItem: SearchHistoryItem = {
        id: `search_${Date.now()}`,
        query,
        timestamp: Date.now()
      };
      
      history = [newItem, ...history.filter(item => item.query !== query)].slice(0, 20);
      localStorage.setItem('searchHistory', JSON.stringify(history));
    } catch (e) {
      console.error("Error saving to search history:", e);
    }
  };

  const handleSendMessage = useCallback(async (text: string) => {
    const messageId = `msg_${Date.now()}`;
    const userMessage = { id: messageId, text, isUser: true };
    
    const isInitialQuery = isSearchMode;
    if (isInitialQuery) {
      setIsSearchMode(false);
      setMessages([userMessage]);
    } else {
      setMessages((prevMessages) => [...prevMessages, userMessage]);
    }
    
    saveToSearchHistory(text, isInitialQuery);
    setIsLoading(true);
    
    try {
      // Create a placeholder for the AI response
      const responseId = `resp_${messageId}`;
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: responseId, text: '', isUser: false, isStreaming: true }
      ]);
      
      // Stream the response
      await fetchChatResponse(
        text,
        messages.map((message) => ({ key: message.id, value: message.text })),
        {
          onData: (data) => {
            setMessages((prevMessages) => {
              const lastMessage = prevMessages[prevMessages.length - 1];
              if (lastMessage.id === responseId) {
                return [
                  ...prevMessages.slice(0, -1),
                  { ...lastMessage, text: lastMessage.text + data }
                ];
              }
              return prevMessages;
            });
          },
          onSources: (newSources) => {
            setSources(newSources);
          },
          onComplete: (response) => {
            setMessages((prevMessages) => {
              const lastMessage = prevMessages[prevMessages.length - 1];
              if (lastMessage.id === responseId) {
                return [
                  ...prevMessages.slice(0, -1),
                  { ...lastMessage, text: response.text, isStreaming: false }
                ];
              }
              return prevMessages;
            });
            setSources(response.sources);
          },
          onError: (error) => {
            setMessages((prevMessages) => [
              ...prevMessages,
              {
                id: `err_${messageId}`,
                text: `Sorry, an error occurred: ${error}`,
                isUser: false
              }
            ]);
          }
        }
      );
    } catch (error) {
      console.error("Error fetching response:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: `err_${messageId}`,
          text: "Sorry, I couldn't process your request. Please try again.",
          isUser: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isSearchMode, messages, setIsSearchMode, setMessages, setSources, setIsLoading]);

  useEffect(() => {
    // Listen for search query loading from sidebar
    const handleLoadSearchQuery = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail) {
        handleSendMessage(customEvent.detail);
      }
    };

    window.addEventListener('loadSearchQuery', handleLoadSearchQuery as EventListener);
    
    return () => {
      window.removeEventListener('loadSearchQuery', handleLoadSearchQuery as EventListener);
    };
  }, [handleSendMessage]);

  const handleSelectSource = useCallback(async (sourceId: string) => {
    try {
      const source = sources.find((s) => s.id === sourceId);
      if (!source) return;

      console.log('Selected source:', source);
      setIsSourceLoading(true);
      
      // Check if this is a database document (UUID format) or RAG source
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourceId);
      console.log('Is UUID format:', isUUID);
      
      if (isUUID) {
        // Let the service determine if it's public or private
        const fullDocument = await fetchDocumentById(source.id);
        console.log('Retrieved document:', fullDocument);
        
        if (fullDocument) {
          // Format the source object to match the FileTable implementation
          const formattedSource = {
            id: fullDocument.id,
            title: fullDocument.title,
            domain: fullDocument.source || (fullDocument.isPublic ? 'Public Repository' : 'Local Repository'),
            snippet: source.snippet,  // Keep the relevant snippet from search
            preview: fullDocument.content || source.snippet,
            date: new Date(fullDocument.date || Date.now()).toLocaleDateString(),
            size: fullDocument.size,
            tags: fullDocument.tags || [],
            type: fullDocument.type || 'Document',
            pdfUrl: fullDocument.url,  // Use the URL directly from the document
            isPublic: fullDocument.isPublic,
            ai_summary: fullDocument.ai_summary || null,
            ai_key_sections: fullDocument.ai_key_sections || formatKeySections(source.snippet),
            ai_citations: fullDocument.ai_citations || null
          };
          
          console.log('Formatted source for modal:', formattedSource);
          setSelectedSource(formattedSource);
        }
      } else {
        // For RAG sources that aren't in the database, use the source info directly
        setSelectedSource({
          ...source,
          preview: source.preview || source.snippet,
          type: source.pdfUrl?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Document',
          isPublic: true,
          domain: source.domain || 'Constitutional Repository',
          date: source.date || new Date().toLocaleDateString(),
          tags: source.tags || [],
          ai_key_sections: source.ai_key_sections || formatKeySections(source.snippet)
        });
      }
    } catch (error) {
      console.error('Error fetching document details:', error);
      toast({
        title: "Error",
        description: "Failed to load document details",
        variant: "destructive",
      });
      // Fall back to basic source info on error
      const source = sources.find((s) => s.id === sourceId);
      if (source) {
        setSelectedSource({
          ...source,
          preview: source.preview || source.snippet,
          type: source.pdfUrl?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Document',
          isPublic: true,
          domain: source.domain || 'Constitutional Repository',
          date: source.date || new Date().toLocaleDateString(),
          tags: source.tags || [],
          ai_key_sections: source.ai_key_sections || formatKeySections(source.snippet)
        });
      }
    } finally {
      setIsSourceLoading(false);
    }
  }, [sources]);

  return (
    <section className="h-full flex flex-col">
      {isSearchMode ? (
        <section className="flex-1 flex flex-col items-center justify-center p-4">
          <section className="mb-6 sm:mb-8 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 text-cicada-primary">
              CICADA
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400">
              Constitutional Inquiry and Compliance Archival Data Assistant
            </p>
          </section>
          
          <section className="w-full max-w-2xl">
            <ChatInput 
              onSubmit={handleSendMessage} 
              isSearchMode={true}
              exampleQueries={exampleQueries}
            />
          </section>
        </section>
      ) : (
        <>
          <ScrollArea className="flex-1 p-2 mb-40 sm:p-4">
            <section className="max-w-4xl mx-auto">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message.text}
                  isUser={message.isUser}
                  isStreaming={message.isStreaming}
                />
              ))}

              {!isLoading && sources.length > 0 && (
                <section className="mb-6 sm:mb-8 mt-2">
                  <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Sources
                  </h3>
                  <section className="flex flex-wrap gap-3 sm:gap-4 pb-4 max-w-full">
                    {sources.map((source) => (
                      <SourceCard
                        key={source.id}
                        source={source}
                        onClick={() => handleSelectSource(source.id)}
                      />
                    ))}
                  </section>
                </section>
              )}
              
              <div ref={messageEndRef} />
            </section>
          </ScrollArea>
          
          <section className="p-2 sm:p-4 pb-safe">
            <ChatInput
              onSubmit={handleSendMessage}
              isSearchMode={false}
              isLoading={isLoading}
              placeholder="Ask a follow-up question..."
            />
          </section>
          
          <SourceModal
            isOpen={!!selectedSource}
            onClose={() => setSelectedSource(null)}
            source={selectedSource}
          />
        </>
      )}
    </section>
  );
};

export default ChatWindow;
