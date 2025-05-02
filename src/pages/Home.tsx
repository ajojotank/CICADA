import Header from "@/components/common/Header";
import ChatWindow from "@/components/chat/ChatWindow";
import SearchSidebar from "@/components/chat/SearchSidebar";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

// Constants for cookie handling
const SIDEBAR_COOKIE_NAME = "sidebar:state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const Home = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const isMobile = useIsMobile();
  
  // Function to get cookie value
  const getCookieValue = (name: string): boolean | null => {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) {
      return match[2] === 'true';
    }
    return null;
  };

  // Function to set cookie
  const setCookie = (name: string, value: boolean) => {
    document.cookie = `${name}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
  };

  // Initialize sidebar state from cookie on component mount
  useEffect(() => {
    const savedState = getCookieValue(SIDEBAR_COOKIE_NAME);
    if (savedState !== null) {
      setIsSidebarOpen(savedState);
    } else {
      // Default to open on desktop, closed on mobile if no cookie exists
      setIsSidebarOpen(!isMobile);
    }
  }, [isMobile]);
  
  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    setCookie(SIDEBAR_COOKIE_NAME, newState);
  };

  return (
    <section className="h-screen flex flex-col overflow-hidden">
      <Header toggleSidebar={toggleSidebar} />
      <section className="flex-1 relative overflow-hidden flex">
        <SearchSidebar 
          isOpen={isSidebarOpen} 
          onClose={() => {
            setIsSidebarOpen(false);
            setCookie(SIDEBAR_COOKIE_NAME, false);
          }}
          data-testid="search-sidebar"
        />
        <section className="flex-1 overflow-hidden" data-testid="chat-window-container">
          <ChatWindow data-testid="chat-window" />
        </section>
      </section>
    </section>
  );
};

export default Home;
