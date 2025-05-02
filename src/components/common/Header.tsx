import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { PanelRight, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UserProfile from "@/components/auth/UserProfile";

const Header = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
  const { user, isAdmin } = useAuth();

  return (
    <header className="w-full py-3 px-4 sm:px-6 flex justify-between items-center border-b">
      <section className="flex items-center gap-2 sm:gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar} 
          title="Toggle History"
          className="h-8 w-8 sm:h-9 sm:w-9"
        >
          <PanelRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <Link to="/" className="text-xl sm:text-2xl font-bold text-cicada-primary">
          CICADA
        </Link>
      </section>

      <section className="flex items-center gap-2 sm:gap-4">
        <ThemeToggle />
        
        {user ? (
          <section className="flex items-center gap-2">
            {/* User profile dropdown - works on both mobile and desktop */}
            <UserProfile />
          </section>
        ) : (
          <Link to="/login">
            <Button variant="outline">Sign In</Button>
          </Link>
        )}
      </section>
    </header>
  );
};

export default Header;
