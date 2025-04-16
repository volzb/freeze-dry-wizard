
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-64px)] py-10">
      <h1 className="text-4xl font-bold mb-4 text-center">Freeze Dryer Calculator</h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-2xl text-center">
        Optimize your freeze drying process with our advanced calculator. 
        Save your settings and terpene preferences for future use.
      </p>

      <div className="flex gap-4">
        <Button asChild size="lg">
          <Link to="/calculator">Go to Calculator</Link>
        </Button>
        
        {!isAuthenticated && (
          <Button asChild size="lg" variant="outline">
            <Link to="/login">Sign In</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
