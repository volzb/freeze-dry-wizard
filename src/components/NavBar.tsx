
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User } from "lucide-react";
import { useState } from "react";
import { FreezeDryerSettings, DryingStep } from "@/utils/freezeDryerCalculations";
import { ConfigManager } from "@/components/freeze-dryer/ConfigManager";

export function NavBar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentSettings, setCurrentSettings] = useState<Partial<FreezeDryerSettings>>({});
  const [currentSteps, setCurrentSteps] = useState<DryingStep[]>([]);
  
  // Load current settings and steps from hidden inputs when they change
  useState(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && 
            (mutation.attributeName === "value" || mutation.attributeName === "data-ready")) {
          updateCurrentData();
        }
      });
    });
    
    const updateCurrentData = () => {
      const settingsElem = document.getElementById('current-settings') as HTMLInputElement;
      const stepsElem = document.getElementById('current-steps') as HTMLInputElement;
      
      if (settingsElem?.value && stepsElem?.value) {
        try {
          setCurrentSettings(JSON.parse(settingsElem.value));
          setCurrentSteps(JSON.parse(stepsElem.value));
        } catch (error) {
          console.error("Error parsing settings/steps:", error);
        }
      }
    };
    
    const settingsElem = document.getElementById('current-settings');
    const stepsElem = document.getElementById('current-steps');
    
    if (settingsElem && stepsElem) {
      observer.observe(settingsElem, { attributes: true });
      observer.observe(stepsElem, { attributes: true });
      updateCurrentData();
    }
    
    return () => observer.disconnect();
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleLoadSettings = (settings: Partial<FreezeDryerSettings>, steps: DryingStep[]) => {
    try {
      const loadTriggerElem = document.getElementById('load-config-trigger') as HTMLButtonElement;
      
      if (!loadTriggerElem) {
        console.error("Load trigger element not found");
        return;
      }
      
      loadTriggerElem.setAttribute('data-settings', JSON.stringify(settings));
      loadTriggerElem.setAttribute('data-steps', JSON.stringify(steps));
      loadTriggerElem.click();
    } catch (error) {
      console.error("Error in handleLoadSettings:", error);
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
            <div className="flex items-center gap-2">
              <ConfigManager 
                currentSettings={currentSettings} 
                currentSteps={currentSteps}
                onLoadSettings={handleLoadSettings}
              />
            </div>
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
