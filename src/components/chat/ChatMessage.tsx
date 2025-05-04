import React, { useState, useEffect, useRef } from "react";
import { User, Bot, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from 'react-markdown';

type ChatMessageProps = {
  message: string;
  isUser: boolean;
  isLoading?: boolean;
  isStreaming?: boolean;
};

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  isUser, 
  isLoading = false,
  isStreaming = false 
}) => {
  const [displayedMessage, setDisplayedMessage] = useState("");
  const [showRetrieval, setShowRetrieval] = useState(false);
  const lastUpdateRef = useRef<number>(Date.now());
  const messageRef = useRef<string>("");
  const streamStartedRef = useRef<boolean>(false);
  
  // Update displayed message and check for retrieval state
  useEffect(() => {
    if (!message) return;
    
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    
    // Mark when we first start receiving the stream
    if (isStreaming && !streamStartedRef.current) {
      streamStartedRef.current = true;
    }
    
    // Only consider showing retrieval state if:
    // 1. We're currently streaming
    // 2. The message is longer than a greeting (to avoid triggering on initial response)
    // 3. There's been a significant pause
    // 4. The message doesn't already have citations
    if (isStreaming && 
        timeSinceLastUpdate > 1000 && 
        !message.includes("[1]") && 
        message !== messageRef.current) {
      setDisplayedMessage(message);
      setShowRetrieval(true);
    } else {
      setDisplayedMessage(message);
      // Only hide retrieval state if we're getting new content or stream ended
      if (message !== messageRef.current || !isStreaming) {
        setShowRetrieval(false);
      }
    }
    
    messageRef.current = message;
    lastUpdateRef.current = now;
    
    // Reset stream started ref when streaming ends
    if (!isStreaming) {
      streamStartedRef.current = false;
    }
  }, [message, isStreaming]);

  return (
    <section className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"} mb-6`}>
      {!isUser && (
        <section className="w-8 h-8 rounded-full bg-cicada-primary text-white flex items-center justify-center flex-shrink-0">
          <Bot size={16} />
        </section>
      )}

      <section
        className={`p-4 rounded-2xl max-w-3xl ${
          isUser
            ? "bg-cicada-primary text-white message-user"
            : "bg-gray-100 dark:bg-gray-800 message-ai"
        }`}
      >
        {isLoading ? (
          <section className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </section>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-3 [&>p:last-child]:mb-0">
            {displayedMessage && <ReactMarkdown>{displayedMessage}</ReactMarkdown>}
            
            {showRetrieval && (
              <div className="flex items-center gap-2 mt-3 text-sm text-gray-500 dark:text-gray-400 border-t pt-3">
                <div className="relative">
                  <Search size={14} className="relative z-10" />
                  <div className="absolute inset-0 bg-gray-500/20 dark:bg-gray-400/20 rounded-full animate-ping" />
                  <div className="absolute inset-0 bg-gray-500/10 dark:bg-gray-400/10 rounded-full animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Retrieving documents</span>
                  <span className="flex space-x-1">
                    <span className="w-1 h-1 bg-gray-500 dark:bg-gray-400 rounded-full animate-[bounce_1.4s_infinite_ease-in-out_-0.32s]" />
                    <span className="w-1 h-1 bg-gray-500 dark:bg-gray-400 rounded-full animate-[bounce_1.4s_infinite_ease-in-out_-0.16s]" />
                    <span className="w-1 h-1 bg-gray-500 dark:bg-gray-400 rounded-full animate-[bounce_1.4s_infinite_ease-in-out]" />
                  </span>
                </div>
              </div>
            )}

            {isStreaming && !showRetrieval && (
              <span className="ml-1 inline-flex items-center h-4 align-middle">
                <span className="loading-dot w-1.5 h-1.5 mx-0.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-[bounce_1.4s_infinite_ease-in-out]" />
                <span className="loading-dot w-1.5 h-1.5 mx-0.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-[bounce_1.4s_infinite_ease-in-out]" />
                <span className="loading-dot w-1.5 h-1.5 mx-0.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-[bounce_1.4s_infinite_ease-in-out]" />
              </span>
            )}
          </div>
        )}
      </section>

      {isUser && (
        <section className="w-8 h-8 rounded-full bg-cicada-secondary text-white flex items-center justify-center flex-shrink-0">
          <User size={16} />
        </section>
      )}
    </section>
  );
};

export default ChatMessage;
