
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";

export default function AuthRedirect() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Redirecting you to the appropriate page...");

  useEffect(() => {
    // Check if there's a hash in the URL that contains auth tokens
    const hash = window.location.hash;
    
    if (hash && hash.includes("access_token")) {
      // Check if it's a recovery (password reset)
      const hashParams = new URLSearchParams(hash.substring(1));
      const type = hashParams.get("type");
      
      if (type === "recovery") {
        // Preserve the hash and redirect to update-password
        navigate(`/update-password${hash}`);
      } else {
        // For other auth types, redirect to calculator
        navigate("/calculator");
      }
    } else {
      // If no hash or token, fallback to home
      setMessage("No valid authentication parameters found. Redirecting to home...");
      setTimeout(() => navigate("/"), 2000);
    }
  }, [navigate]);

  return (
    <div className="container flex items-center justify-center min-h-screen py-10">
      <Card className="w-full max-w-md p-6 text-center">
        <p>{message}</p>
      </Card>
    </div>
  );
}
