// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ auth: { me: { setData: vi.fn(), invalidate: vi.fn() } } }),
    auth: {
      login: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      me: { useQuery: () => ({ data: null, isLoading: false, error: null, refetch: vi.fn() }) },
      logout: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }) },
    },
  },
}));

vi.mock("@/const", () => ({
  clearLoginIntent: vi.fn(),
  getClientLoginUrl: () => "/client-login",
  getLoginIntent: vi.fn(() => null),
  getLoginUrl: () => "/login",
  setLoginIntent: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/login", vi.fn()],
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: (props: Record<string, unknown>) => <label {...props} />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: ReactNode }) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("lucide-react", () => ({
  Eye: () => <span>EyeIcon</span>,
  EyeOff: () => <span>EyeOffIcon</span>,
}));

vi.mock("@/routes", () => ({
  preloadRouteModule: vi.fn(),
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

import LoginPage from "../LoginPage";

describe("LoginPage", () => {
  it("renders the brand heading at least once", () => {
    render(<LoginPage />);
    expect(screen.getAllByText("TextPoint").length).toBeGreaterThanOrEqual(1);
  });

  it("renders sign-in heading at least once", () => {
    render(<LoginPage />);
    expect(screen.getAllByText("Sign In").length).toBeGreaterThanOrEqual(1);
  });

  it("renders email placeholder at least once", () => {
    render(<LoginPage />);
    expect(screen.getAllByPlaceholderText("name@example.com").length).toBeGreaterThanOrEqual(1);
  });

  it("renders password placeholder at least once", () => {
    render(<LoginPage />);
    expect(screen.getAllByPlaceholderText("Enter your password").length).toBeGreaterThanOrEqual(1);
  });

  it("renders internal login buttons", () => {
    render(<LoginPage />);
    const buttons = screen.getAllByText("Open Internal Login");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders client login buttons", () => {
    render(<LoginPage />);
    const buttons = screen.getAllByText("Open Client Login");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders forgot password link at least once", () => {
    render(<LoginPage />);
    expect(screen.getAllByText("Forgot password?").length).toBeGreaterThanOrEqual(1);
  });

  it("renders at least one sign-in button", () => {
    render(<LoginPage />);
    const buttons = screen.getAllByRole("button");
    const signInButtons = buttons.filter((b) => b.textContent === "Sign In");
    expect(signInButtons.length).toBeGreaterThanOrEqual(1);
  });
});
