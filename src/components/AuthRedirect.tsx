
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
      // Parse the hash parameters
      const hashParams = new URLSearchParams(hash.substring(1));
      const type = hashParams.get("type");
      
      console.log("Auth redirect - token type:", type);
      
      if (type === "recovery") {
        // For password recovery, redirect to update-password with the full hash
        console.log("Redirecting to update password page with token");
        navigate(`/update-password${hash}`);
      } else {
        // For other auth types (signup, login), redirect to calculator
        console.log("Redirecting to calculator page");
        navigate("/calculator");
      }
    } else {
      // If no hash or token, fallback to home
      console.log("No valid auth tokens found in URL");
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
