import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import PulseWidget from "../PulseWidget";

const mockSDK = {
  entry: {
    fields: {
      title: { getValue: () => "Test Entry" },
      body: { getValue: () => "This was updated in January 2020 and uses v1.0.0 of the API" },
    },
    onSysChanged: vi.fn(() => vi.fn()),
  },
  parameters: {
    instance: {
      decayThresholdDays: 365,
    },
  },
} as any;

describe("PulseWidget", () => {
  it("renders the widget title", async () => {
    render(<PulseWidget sdk={mockSDK} />);
    expect(await screen.findByText("ContentPulse")).toBeTruthy();
  });

  it("displays freshness score", async () => {
    render(<PulseWidget sdk={mockSDK} />);
    expect(await screen.findByText(/\d+/)).toBeTruthy();
  });

  it("shows re-analyze button", async () => {
    render(<PulseWidget sdk={mockSDK} />);
    expect(await screen.findByText("Re-analyze")).toBeTruthy();
  });

  it("shows warnings for stale content", async () => {
    render(<PulseWidget sdk={mockSDK} />);
    const warningText = await screen.findByText(/issue/);
    expect(warningText).toBeTruthy();
  });
});
