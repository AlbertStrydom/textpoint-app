import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const resetPasswordMutation = trpc.auth.resetPassword.useMutation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") ?? "";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Choose a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="reset-password">New Password</Label>
            <Input
              id="reset-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 8 characters"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-confirm">Confirm Password</Label>
            <Input
              id="reset-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat the password"
            />
          </div>
          <Button
            className="w-full"
            disabled={resetPasswordMutation.isPending}
            onClick={async () => {
              if (!token) {
                toast.error("This password reset link is invalid.");
                return;
              }

              if (password.length < 8) {
                toast.error("Password must be at least 8 characters long.");
                return;
              }

              if (password !== confirmPassword) {
                toast.error("Passwords do not match.");
                return;
              }

              try {
                await resetPasswordMutation.mutateAsync({
                  token,
                  newPassword: password,
                });
                toast.success("Password reset successfully");
                setLocation("/login");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Failed to reset password");
              }
            }}
          >
            {resetPasswordMutation.isPending ? "Saving..." : "Reset Password"}
          </Button>
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
