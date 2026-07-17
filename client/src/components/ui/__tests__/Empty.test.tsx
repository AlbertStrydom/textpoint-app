// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "../empty";

describe("Empty", () => {
  it("renders with content", () => {
    render(<Empty><EmptyTitle>No data</EmptyTitle></Empty>);
    expect(screen.getByText("No data")).toBeInTheDocument();
    cleanup();
  });

  it("has correct data-slot attribute", () => {
    render(<Empty data-testid="empty" />);
    expect(screen.getByTestId("empty")).toHaveAttribute("data-slot", "empty");
    cleanup();
  });
});

describe("EmptyHeader", () => {
  it("renders children", () => {
    render(<EmptyHeader><h3>Header</h3></EmptyHeader>);
    expect(screen.getByText("Header")).toBeInTheDocument();
    cleanup();
  });
});

describe("EmptyTitle", () => {
  it("renders text", () => {
    render(<EmptyTitle>Title</EmptyTitle>);
    expect(screen.getByText("Title")).toBeInTheDocument();
    cleanup();
  });

  it("has correct data-slot", () => {
    render(<EmptyTitle data-testid="title">Title</EmptyTitle>);
    expect(screen.getByTestId("title")).toHaveAttribute("data-slot", "empty-title");
    cleanup();
  });
});

describe("EmptyDescription", () => {
  it("renders description text", () => {
    render(<EmptyDescription>Description text</EmptyDescription>);
    expect(screen.getByText("Description text")).toBeInTheDocument();
    cleanup();
  });
});

describe("EmptyContent", () => {
  it("renders children", () => {
    render(<EmptyContent><button>Action</button></EmptyContent>);
    expect(screen.getByRole("button")).toBeInTheDocument();
    cleanup();
  });
});

describe("EmptyMedia", () => {
  it("renders with default variant", () => {
    render(<EmptyMedia data-testid="media">Icon</EmptyMedia>);
    const el = screen.getByTestId("media");
    expect(el).toHaveAttribute("data-slot", "empty-icon");
    expect(el).toHaveAttribute("data-variant", "default");
    cleanup();
  });

  it("renders with icon variant", () => {
    render(<EmptyMedia variant="icon" data-testid="media">Icon</EmptyMedia>);
    expect(screen.getByTestId("media")).toHaveAttribute("data-variant", "icon");
    cleanup();
  });
});
