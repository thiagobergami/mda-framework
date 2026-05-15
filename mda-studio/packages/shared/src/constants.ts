export const DEFAULT_PORT = 3100;
export const DEFAULT_HOST_LOOPBACK = "127.0.0.1";

/**
 * Studio id used by the single-tenant V1 UI. Maps onto the env-derived
 * instance name on the server (defaults to "default"). Once a real studios
 * table lands the UI will discover the active studio at sign-in time.
 */
export const DEFAULT_STUDIO_ID = "default";

export const HEARTBEAT_MIN_INTERVAL_SEC = 30;
export const HEARTBEAT_DEFAULT_MAX_CONCURRENT_RUNS = 20;
export const HEARTBEAT_MAX_CONCURRENT_RUNS_CAP = 50;
