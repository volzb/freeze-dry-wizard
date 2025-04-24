
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, Save } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NavBar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6 text-lg font-semibold">
          <Link to="/" className="hover:text-primary">Freeze Dryer Calculator</Link>
        </div>
        <nav className="flex items-center gap-4">
          <Link to="/" className="text-sm font-medium hover:text-primary">
            Home
          </Link>
          
          {isAuthenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  <span>Save/Load</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-pointer" onClick={() => document.getElementById('save-settings-trigger')?.click()}>
                  Save Current Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => document.getElementById('load-settings-trigger')?.click()}>
                  Load Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">{user?.name || user?.email}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </Button>
            </div>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/login")}
              className="flex items-center gap-2"
            >
              <User size={16} />
              <span>Login</span>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
