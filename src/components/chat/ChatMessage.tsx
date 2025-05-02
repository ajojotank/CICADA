import React, { useState, useEffect } from "react";
import { User, Bot } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

  // Update displayed message when props change
  useEffect(() => {
    setDisplayedMessage(message);
  }, [message]);

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
          <p className="flex items-center">
            {displayedMessage}
            {isStreaming && (
              <span className="ml-2 flex items-center h-4">
                <span className="loading-dot w-1.5 h-1.5 mx-0.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-[bounce_1.4s_infinite_ease-in-out]" />
                <span className="loading-dot w-1.5 h-1.5 mx-0.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-[bounce_1.4s_infinite_ease-in-out]" />
                <span className="loading-dot w-1.5 h-1.5 mx-0.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-[bounce_1.4s_infinite_ease-in-out]" />
              </span>
            )}
          </p>
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
