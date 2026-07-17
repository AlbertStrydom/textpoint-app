import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clearLoginIntent,
  getClientLoginUrl,
  getLoginIntent,
  getLoginUrl,
  setLoginIntent,
} from "@/const";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { preloadRouteModule } from "@/routes";
import { Eye, EyeOff } from "lucide-react";

type LoginMode = "internal" | "client";

function resolveLoginMode(pathname: string, search = ""): LoginMode {
  if (pathname === "/client-login") {
    return "client";
  }

  if (pathname === "/login") {
    return new URLSearchParams(search).get("portal") === "client"
      ? "client"
      : "internal";
  }

  if (typeof window !== "undefined" && getLoginIntent() === "client") {
    return "client";
  }

  return "internal";
}

function getRouteForMode(mode: LoginMode) {
  return mode === "client" ? getClientLoginUrl() : getLoginUrl();
}

function LoginPageContent() {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const loginMutation = trpc.auth.login.useMutation();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>(() =>
    typeof window === "undefined"
      ? resolveLoginMode(location)
      : resolveLoginMode(window.location.pathname, window.location.search)
  );

  const switchLoginMode = (nextMode: LoginMode) => {
    const nextRoute = getRouteForMode(nextMode);

    if (nextMode === "client") {
      setLoginIntent("client");
      preloadRouteModule("/client-portal");
    } else {
      clearLoginIntent();
    }

    setLoginMode(nextMode);

    if (typeof window === "undefined") {
      setLocation(nextRoute);
      return;
    }

    const currentPath = window.location.pathname;
    if (currentPath === nextRoute) {
      const url = new URL(window.location.href);
      if (nextMode === "client") {
        url.searchParams.set("portal", "client");
      } else {
        url.searchParams.delete("portal");
      }
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      return;
    }

    const nextUrl =
      nextMode === "client" ? `${nextRoute}?portal=client` : nextRoute;
    window.location.assign(nextUrl);
  };

  useEffect(() => {
    if (!loading && user) {
      if (loginMode === "client") {
        setLoginIntent("client");
        preloadRouteModule("/client-portal");
        setLocation("/client-portal");
        return;
      }

      clearLoginIntent();
      setLocation("/");
    }
  }, [loading, loginMode, setLocation, user]);

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoginMode(resolveLoginMode(location));
      return;
    }

    const nextMode = resolveLoginMode(window.location.pathname, window.location.search);
    setLoginMode(nextMode);
    if (nextMode === "client") {
      setLoginIntent("client");
      preloadRouteModule("/client-portal");
      return;
    }

    clearLoginIntent();
  }, [location]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    if (window.location.pathname === "/client-login" || loginMode === "client") {
      url.searchParams.set("portal", "client");
    } else {
      url.searchParams.delete("portal");
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [loginMode]);

  useEffect(() => {
    if (loginMode === "client") {
      preloadRouteModule("/client-portal");
    }
  }, [loginMode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-slate-200 bg-slate-950 text-white shadow-xl">
          <CardHeader className="space-y-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl font-semibold">
              TP
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl text-white">TextPoint</CardTitle>
              <CardDescription className="text-slate-300">
                A single login for your internal team and your allocated client portal users.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-200">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="font-medium">Internal Team Login</p>
              <p className="mt-1 text-slate-300">
                Use this when you are working in the full TextPoint CRM, training, documents, and operations modules.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="font-medium">Client Portal Login</p>
              <p className="mt-1 text-slate-300">
                Allocated client users can sign in here to view technician compliance, client documents, and requests.
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Share the dedicated portal link: <span className="font-medium text-white">/client-login</span>
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant={loginMode === "internal" ? "secondary" : "outline"}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                onClick={() => switchLoginMode("internal")}
              >
                Open Internal Login
              </Button>
              <Button
                type="button"
                variant={loginMode === "client" ? "secondary" : "outline"}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                onClick={() => switchLoginMode("client")}
              >
                Open Client Login
              </Button>
            </div>
            <p className="pt-4 text-xs text-slate-400">Designed by A.Strydom</p>
          </CardContent>
        </Card>

        <Card className="w-full shadow-xl border-slate-200">
          <CardHeader className="space-y-4">
            <div className="inline-flex rounded-lg border bg-slate-50 p-1">
              <button
                type="button"
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  loginMode === "internal"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
                onClick={() => switchLoginMode("internal")}
              >
                Internal Login
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  loginMode === "client"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
                onClick={() => switchLoginMode("client")}
              >
                Client Portal Login
              </button>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">
                {loginMode === "client" ? "Client Portal Sign In" : "Sign In"}
              </CardTitle>
              <CardDescription>
                {loginMode === "client"
                  ? "Access your allocated client portal with the account assigned to your company."
                  : "Access TextPoint with your internal account."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-slate-950">
                {loginMode === "client" ? "Level III Client Portal" : "Looking for the Level III client portal?"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {loginMode === "client"
                  ? "You are on the dedicated client login. Use the account allocated to your company to access only your client portal information."
                  : "Client users should use the dedicated portal login so they only see their own Level III client information."}
              </p>
              <Button
                type="button"
                variant={loginMode === "client" ? "outline" : "default"}
                className="mt-3"
                onClick={() => switchLoginMode(loginMode === "client" ? "internal" : "client")}
              >
                {loginMode === "client" ? "Open Internal Login" : "Open Client Portal Login"}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="pr-12"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-900"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              className="w-full"
              disabled={loginMutation.isPending}
              onClick={async () => {
                try {
                  const signedInUser = await loginMutation.mutateAsync({
                    email: email.trim(),
                    password,
                  });
                  utils.auth.me.setData(undefined, signedInUser);
                  await utils.auth.me.invalidate();
                  toast.success("Signed in successfully");
                  if (loginMode === "client") {
                    setLoginIntent("client");
                    preloadRouteModule("/client-portal");
                  } else {
                    clearLoginIntent();
                  }
                  setLocation(loginMode === "client" ? "/client-portal" : "/");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to sign in");
                }
              }}
            >
              {loginMutation.isPending
                ? "Signing in..."
                : loginMode === "client"
                  ? "Sign In to Client Portal"
                  : "Sign In"}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setLocation("/forgot-password")}
              >
                Forgot password?
              </button>
              <span className="text-muted-foreground">TextPoint</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {loginMode === "client"
                ? "If your company has been allocated portal access, use the email and password issued for your client account."
                : "If you have been using local bypass, set your password first from your profile or use forgot password after the bypass is disabled."}
            </p>
            <div className="rounded-lg border bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">
                {loginMode === "client" ? "Need the internal team login?" : "Need the client portal login?"}
              </p>
              <p className="mt-1 text-slate-600">
                {loginMode === "client"
                  ? "Switch back to the full TextPoint sign-in for staff access."
                  : "Use the dedicated client portal route if you are signing in for a Level III client."}
              </p>
              <Button
                type="button"
                variant="link"
                className="mt-1 h-auto px-0"
                onClick={() => switchLoginMode(loginMode === "client" ? "internal" : "client")}
              >
                {loginMode === "client" ? "Go to Internal Login" : "Go to Client Portal Login"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <LoginPageContent />;
}

export function ClientLoginPage() {
  return <LoginPageContent />;
}
