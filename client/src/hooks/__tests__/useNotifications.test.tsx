// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
const mockInvalidate = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ notifications: { list: { invalidate: mockInvalidate } } }),
    notifications: {
      checkEscalation: { useMutation: () => ({ mutateAsync: mockMutateAsync, isPending: false }) },
      checkDocumentSignatures: { useMutation: () => ({ mutateAsync: mockMutateAsync, isPending: false }) },
      checkQualityReminders: { useMutation: () => ({ mutateAsync: mockMutateAsync, isPending: false }) },
      checkClientPortalReminders: { useMutation: () => ({ mutateAsync: mockMutateAsync, isPending: false }) },
      checkPlannerTimesheetReminders: { useMutation: () => ({ mutateAsync: mockMutateAsync, isPending: false }) },
    },
    auth: {
      me: { useQuery: () => ({ data: { role: "admin" }, isLoading: false }) },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

import { useNotifications, useEscalationCheck } from "../useNotifications";

describe("useNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns triggerCheck function", () => {
    const { result } = renderHook(() => useNotifications({ enabled: false }));
    expect(typeof result.current.triggerCheck).toBe("function");
  });

  it("does not call mutations when disabled", () => {
    renderHook(() => useNotifications({ enabled: false }));
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("triggerCheck calls invalidate when allowAdminChecks is false", async () => {
    const { result } = renderHook(() => useNotifications({ enabled: false }));
    await act(async () => {
      result.current.triggerCheck();
    });
    expect(mockInvalidate).toHaveBeenCalled();
  });

  it("triggerCheck calls mutations when allowAdminChecks is true", async () => {
    const { result } = renderHook(() => useNotifications({ enabled: false, allowAdminChecks: true }));
    await act(async () => {
      result.current.triggerCheck();
    });
    expect(mockMutateAsync).toHaveBeenCalled();
  });
});

describe("useEscalationCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns expected interface", () => {
    const { result } = renderHook(() => useEscalationCheck());
    expect(typeof result.current.triggerEscalationCheck).toBe("function");
    expect(result.current.isLoading).toBe(false);
  });

  it("can trigger escalation check", async () => {
    mockMutateAsync.mockResolvedValue(0);
    const { result } = renderHook(() => useEscalationCheck());
    await act(async () => {
      const count = await result.current.triggerEscalationCheck();
      expect(count).toBe(0);
    });
  });
});
