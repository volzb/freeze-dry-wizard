
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";

const updatePasswordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .max(72, "Password cannot exceed 72 characters"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type UpdatePasswordValues = z.infer<typeof updatePasswordSchema>;

export default function UpdatePassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingUrl, setIsProcessingUrl] = useState(true);
  const navigate = useNavigate();

  const form = useForm<UpdatePasswordValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  });

  useEffect(() => {
    const processUrlParams = async () => {
      setIsProcessingUrl(true);
      
      // Check if we're on the update-password page directly
      if (window.location.pathname === '/update-password') {
        // Check if there's a valid hash in the URL
        const hash = window.location.hash;
        if (!hash || !hash.includes("access_token")) {
          setError("Invalid or expired reset link. Please try requesting a new password reset.");
          setIsProcessingUrl(false);
          return;
        }

        try {
          // Parse the hash and set the session
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          const type = hashParams.get("type");
          
          if (accessToken && refreshToken) {
            console.log("Found valid tokens in URL, type:", type);
            
            // Set the session with the tokens from the URL
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (error) {
              console.error("Error setting session:", error);
              setError("Failed to authenticate with the provided token. Please try requesting a new password reset.");
            }
          } else {
            setError("Invalid reset link parameters. Please try requesting a new password reset.");
          }
        } catch (error) {
          console.error("Error processing URL parameters:", error);
          setError("An unexpected error occurred. Please try again.");
        }
      }
      
      setIsProcessingUrl(false);
    };

    processUrlParams();
  }, []);

  async function onSubmit(data: UpdatePasswordValues) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password updated successfully!");
      navigate("/login");
    } catch (error) {
      console.error("Password update error:", error);
      toast.error("Failed to update password.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Update password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isProcessingUrl ? (
            <div className="text-center py-4">
              <p>Processing your reset link...</p>
            </div>
          ) : error ? (
            <div className="text-center space-y-4">
              <p className="text-destructive">{error}</p>
              <Button 
                variant="outline" 
                onClick={() => navigate("/reset-password")}
              >
                Request new reset link
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter new password" 
                          type="password" 
                          {...field} 
                          autoComplete="new-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Confirm your password" 
                          type="password" 
                          {...field} 
                          autoComplete="new-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Updating..." : "Update password"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-center text-muted-foreground">
            Remember your password?{" "}
            <Button 
              variant="link" 
              className="p-0" 
              onClick={() => navigate("/login")}
            >
              Back to login
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
