
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";

const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address")
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: ""
    }
  });

  async function onSubmit(data: ResetPasswordValues) {
    setIsLoading(true);
    try {
      const currentUrl = window.location.origin;
      
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${currentUrl}/auth-redirect`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setEmailSent(true);
      toast.success("Password reset email sent. Please check your inbox.");
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error("Failed to send password reset email.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Reset password</CardTitle>
          <CardDescription>
            Enter your email to receive a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailSent ? (
            <div className="text-center space-y-4">
              <p>Reset instructions sent to your email.</p>
              <p className="text-sm text-muted-foreground">
                Please check your inbox and follow the link to reset your password.
              </p>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="name@example.com" 
                          type="email" 
                          {...field} 
                          autoComplete="email"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send reset instructions"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-center text-muted-foreground">
            Remember your password?{" "}
            <Link to="/login" className="font-medium text-primary">
              Back to login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
