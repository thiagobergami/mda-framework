export const API_BASE = "/api";

export function apiPath(path: string): string {
  if (path === "") return API_BASE;
  const trimmed = path.replace(/^\/+/, "");
  return trimmed === "" ? API_BASE : `${API_BASE}/${trimmed}`;
}

export function healthPath(): string {
  return apiPath("/health");
}
