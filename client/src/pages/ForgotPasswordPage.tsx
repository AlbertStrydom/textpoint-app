import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const forgotPasswordMutation = trpc.auth.requestPasswordReset.useMutation();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            Request a password reset link for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <Button
            className="w-full"
            disabled={forgotPasswordMutation.isPending || submitted}
            onClick={async () => {
              try {
                await forgotPasswordMutation.mutateAsync({
                  email: email.trim(),
                });
                setSubmitted(true);
                toast.success("If that email exists, a reset link has been sent.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Failed to request password reset");
              }
            }}
          >
            {forgotPasswordMutation.isPending ? "Sending link..." : "Request Reset"}
          </Button>
          {submitted ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              If an account exists for that email, a reset link has been sent. Check your inbox
              and follow the link to choose a new password.
            </div>
          ) : null}
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => setLocation("/login")}
          >
            Back to sign in
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
