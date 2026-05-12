import { describe, it, expect } from "vitest";
import { API_BASE, apiPath, healthPath } from "./api-paths";

describe("API_BASE", () => {
  it("is /api so all routes share one prefix", () => {
    expect(API_BASE).toBe("/api");
  });
});

describe("apiPath", () => {
  it("prepends /api to a leading-slash path", () => {
    expect(apiPath("/studios")).toBe("/api/studios");
  });

  it("prepends /api when the input has no leading slash", () => {
    expect(apiPath("studios")).toBe("/api/studios");
  });

  it("collapses duplicate slashes between base and path", () => {
    expect(apiPath("//studios")).toBe("/api/studios");
  });

  it("returns just the base for empty input", () => {
    expect(apiPath("")).toBe("/api");
  });

  it("preserves nested paths", () => {
    expect(apiPath("/studios/abc/games")).toBe("/api/studios/abc/games");
  });
});

describe("healthPath", () => {
  it("resolves to /api/health", () => {
    expect(healthPath()).toBe("/api/health");
  });
});
