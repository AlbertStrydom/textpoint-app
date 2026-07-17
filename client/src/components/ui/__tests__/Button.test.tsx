// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../button";

describe("Button", () => {
  it("renders with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
    cleanup();
  });

  it("applies default variant classes", () => {
    render(<Button data-testid="btn">Default</Button>);
    expect(screen.getByTestId("btn")).toHaveAttribute("data-slot", "button");
    cleanup();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("is disabled when disabled prop is set", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
    cleanup();
  });

  it("renders with different variants without error", () => {
    const variants = ["destructive", "outline", "ghost", "link", "secondary"] as const;
    for (const variant of variants) {
      render(<Button variant={variant}>{variant}</Button>);
      expect(screen.getByRole("button", { name: variant })).toBeInTheDocument();
      cleanup();
    }
  });

  it("renders with different sizes without error", () => {
    const sizes = ["sm", "lg", "icon", "icon-sm", "icon-lg"] as const;
    for (const size of sizes) {
      render(<Button size={size}>{size}</Button>);
      expect(screen.getByRole("button", { name: size })).toBeInTheDocument();
      cleanup();
    }
  });
});
