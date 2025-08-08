import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavigationProps {
  onHomeClick?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ onHomeClick }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isOnGenerator = location.pathname.startsWith("/generator");
  const isSettings = location.pathname === "/settings";
  const isMyEmails = location.pathname === "/my-emails";

  const handleHomeClick = () => {
    if (onHomeClick) {
      onHomeClick();
    } else {
      navigate("/");
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Home Button */}
        <Button
          onClick={handleHomeClick}
          variant={isOnGenerator ? "secondary" : "ghost"}
          size="sm"
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Home
        </Button>

        {/* Center Title */}
        <div className="text-lg font-semibold text-foreground">Sendai</div>

        {/* Profile Dropdown (click to open) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={isSettings || isMyEmails ? "secondary" : "ghost"}
              size="sm"
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Profile
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-background border border-border shadow-lg"
          >
            <DropdownMenuItem asChild>
              <Link to="/settings" className="w-full cursor-pointer">
                Profile Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/my-emails" className="w-full cursor-pointer">
                My Emails
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};

export default Navigation;
