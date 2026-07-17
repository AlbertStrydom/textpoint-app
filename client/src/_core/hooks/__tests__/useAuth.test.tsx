// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";

const MockTRPCClientError = vi.hoisted(() => {
  return class MockTRPCClientError extends Error {
    data?: Record<string, unknown>;
    constructor(message: string, data?: Record<string, unknown>) {
      super(message);
      this.data = data;
      this.name = "TRPCClientError";
    }
  };
});

const mockSetData = vi.hoisted(() => vi.fn());
const mockInvalidate = vi.hoisted(() => vi.fn());
const mockRefetch = vi.hoisted(() => vi.fn());
const mockMutateAsync = vi.hoisted(() => vi.fn());

const mockQueryResult = vi.hoisted(() => ({
  data: null as Record<string, unknown> | null,
  isLoading: false,
  error: null as Error | null,
  refetch: mockRefetch,
}));

const mockMutationResult = vi.hoisted(() => ({
  mutateAsync: mockMutateAsync,
  isPending: false,
  error: null as Error | null,
}));



vi.mock("@trpc/client", () => ({
  TRPCClientError: MockTRPCClientError,
}));

vi.mock("@/lib/trpc", () => {
  // Capture references from hoisted scope
  const msd = mockSetData;
  const minv = mockInvalidate;
  const mqr = mockQueryResult;
  const mmr = mockMutationResult;
  return {
    trpc: {
      useUtils: () => ({
        auth: { me: { setData: msd, invalidate: minv } },
      }),
      auth: {
        me: { useQuery: () => mqr },
        logout: { useMutation: () => mmr },
      },
    },
  };
});

vi.mock("@/const", () => ({
  clearLoginIntent: vi.fn(),
  getLoginUrl: () => "/login",
}));

import { useAuth } from "../useAuth";

describe("useAuth", () => {
  beforeEach(() => {
    mockSetData.mockClear();
    mockInvalidate.mockClear();
    mockRefetch.mockClear();
    mockMutateAsync.mockClear();
    mockMutateAsync.mockResolvedValue(undefined);
    Object.assign(mockQueryResult, { data: null, isLoading: false, error: null });
    Object.assign(mockMutationResult, { isPending: false, error: null });
  });

  function render() {
    return renderHook(() => useAuth());
  }

  function renderWithOptions(opts: { redirectOnUnauthenticated?: boolean; redirectPath?: string }) {
    return renderHook(() => useAuth(opts));
  }

  it("returns unauthenticated when no user", () => {
    const { result } = render();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("returns authenticated when user data present", () => {
    const user = { id: 1, name: "Test", email: "test@example.com", role: "admin" };
    mockQueryResult.data = user;
    const { result } = render();
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(user);
  });

  it("shows loading state", () => {
    mockQueryResult.isLoading = true;
    const { result } = render();
    expect(result.current.loading).toBe(true);
  });

  it("shows mutation pending state", () => {
    mockMutationResult.isPending = true;
    const { result } = render();
    expect(result.current.loading).toBe(true);
  });

  it("returns error from query", () => {
    mockQueryResult.error = new Error("Network error");
    const { result } = render();
    expect(result.current.error).toBeDefined();
    expect(result.current.error!.message).toBe("Network error");
  });

  it("returns error from mutation", () => {
    mockMutationResult.error = new Error("Logout failed");
    const { result } = render();
    expect(result.current.error).toBeDefined();
    expect(result.current.error!.message).toBe("Logout failed");
  });

  it("refresh calls refetch", () => {
    const { result } = render();
    result.current.refresh();
    expect(mockRefetch).toHaveBeenCalledOnce();
  });

  describe("logout", () => {
    it("calls mutateAsync and clears data", async () => {
      mockQueryResult.data = { id: 1, name: "Test" };
      const { result } = render();
      await act(async () => {
        await result.current.logout();
      });
      expect(mockMutateAsync).toHaveBeenCalledOnce();
      expect(mockSetData).toHaveBeenCalledWith(undefined, null);
      expect(mockInvalidate).toHaveBeenCalledOnce();
    });

    it("handles UNAUTHORIZED error gracefully", async () => {
      const err = new MockTRPCClientError("UNAUTHORIZED", { code: "UNAUTHORIZED" });
      mockMutateAsync.mockRejectedValue(err);
      const { result } = render();
      await act(async () => {
        await expect(result.current.logout()).resolves.toBeUndefined();
      });
    });

    it("rethrows non-UNAUTHORIZED errors", async () => {
      mockMutateAsync.mockRejectedValue(new Error("Server error"));
      const { result } = render();
      await act(async () => {
        await expect(result.current.logout()).rejects.toThrow("Server error");
      });
    });
  });

  describe("redirectOnUnauthenticated", () => {
    let savedHref: string;

    beforeEach(() => {
      savedHref = window.location.href;
      Object.defineProperty(window, "location", {
        value: { pathname: "/some-path", href: savedHref, assign: vi.fn() },
        writable: true,
      });
    });

    it("does not redirect when user is present", () => {
      mockQueryResult.data = { id: 1, name: "Test" };
      renderWithOptions({ redirectOnUnauthenticated: true });
      expect(window.location.pathname).toBe("/some-path");
    });

    it("does not redirect when still loading", () => {
      mockQueryResult.isLoading = true;
      renderWithOptions({ redirectOnUnauthenticated: true });
      expect(window.location.pathname).toBe("/some-path");
    });

    it("redirects to login when unauthenticated", () => {
      Object.defineProperty(window, "location", {
        value: { pathname: "/some-path", href: "/some-path", assign: vi.fn() },
        writable: true,
      });
      renderWithOptions({ redirectOnUnauthenticated: true });
      expect(window.location.href).toBe("/login");
    });

    it("does not redirect if already on login page", () => {
      Object.defineProperty(window, "location", {
        value: { pathname: "/login", href: "/login", assign: vi.fn() },
        writable: true,
      });
      renderWithOptions({ redirectOnUnauthenticated: true });
      expect(window.location.href).toBe("/login");
    });

    it("redirects to custom redirectPath", () => {
      Object.defineProperty(window, "location", {
        value: { pathname: "/some-path", href: "/some-path", assign: vi.fn() },
        writable: true,
      });
      renderWithOptions({ redirectOnUnauthenticated: true, redirectPath: "/custom-login" });
      expect(window.location.href).toBe("/custom-login");
    });
  });
});
