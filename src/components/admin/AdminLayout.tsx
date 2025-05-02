import React, { useEffect, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/common/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Home, FileUp, Files, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type AdminLayoutProps = {
  children: React.ReactNode;
  title: string;
};

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const { logout, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect non-admin users or non-authenticated users
  useEffect(() => {
    if (!user) {
      toast({
        title: "Access Denied",
        description: "Please log in to access the admin area",
        variant: "destructive"
      });
      navigate("/login");
      return;
    }
    
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this area",
        variant: "destructive"
      });
      navigate("/");
      return;
    }
  }, [isAdmin, user, navigate]);

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: "Dashboard", to: "/admin" },
    { icon: <FileUp size={20} />, label: "Upload", to: "/admin/upload" },
    { icon: <Files size={20} />, label: "Files", to: "/admin/files" },
  ];

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true); // Always show sidebar on desktop
      } else {
        setSidebarOpen(false); // Hide by default on mobile
      }
    };

    // Set initial state based on screen size
    handleResize();
    
    // Update on resize
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (!user || !isAdmin) {
    return null; // Don't render anything while redirecting
  }

  return (
    <section className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar - Desktop and Mobile with overlay */}
      <aside 
        className={`fixed md:relative z-20 h-full transition-all duration-300 ease-in-out transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${
          sidebarOpen ? "w-64" : "md:w-20"
        } bg-white dark:bg-gray-800 border-r flex flex-col`}
      >
        <section className="p-4 border-b flex justify-between items-center">
          <section className={`transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "md:opacity-0"}`}>
            <section className="text-2xl font-bold text-cicada-primary">CICADA</section>
            <section className="text-xs text-gray-500 dark:text-gray-400">Admin Portal</section>
          </section>
        </section>
        
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-4 py-3 rounded-md text-sm ${
                      isActive 
                        ? "bg-cicada-primary bg-opacity-10 text-cicada-primary"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`
                  }
                  end={item.to === "/admin"}
                >
                  {item.icon}
                  <span className={`transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "md:opacity-0 md:hidden"}`}>
                    {item.label}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        <section className="p-4 border-t mt-auto">
          <section className="flex items-center justify-between mb-4">
            <NavLink 
              to="/" 
              className={`flex items-center text-sm text-gray-700 dark:text-gray-300 hover:text-cicada-primary ${
                sidebarOpen ? "" : "md:justify-center w-full"
              }`}
            >
              <Home size={16} className="mr-2" /> 
              <span className={`transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "md:opacity-0 md:hidden"}`}>Go to App</span>
            </NavLink>
            {/* Remove className prop from ThemeToggle */}
            <section className={sidebarOpen ? "" : "md:hidden"}>
              <ThemeToggle />
            </section>
          </section>
          
          <Button 
            variant="outline"
            className={`w-full flex items-center justify-center gap-2 ${sidebarOpen ? "" : "md:p-2"} hover:bg-red-600 hover:text-white transition-colors`}
            onClick={() => logout()}
          >
            <LogOut size={16} />
            <span className={`transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "md:opacity-0 md:hidden"}`}>Sign Out</span>
          </Button>
        </section>
      </aside>

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <section 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <section className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        {/* Header */}
        <header className="flex items-center justify-between p-5 bg-white dark:bg-gray-800 border-b">
          <section className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden mr-2"
              onClick={toggleSidebar}
            >
              <Menu size={20} />
            </Button>
            <h1 className="text-xl font-bold">{title}</h1>
          </section>
          <section className="flex items-center gap-2">
            {/* Remove className prop from ThemeToggle */}
            <section className="hidden md:block">
              <ThemeToggle />
            </section>
          </section>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <section className="max-w-6xl mx-auto">
            {children}
          </section>
        </main>
      </section>
    </section>
  );
};

export default AdminLayout;
