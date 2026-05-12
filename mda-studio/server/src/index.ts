import { DEFAULT_HOST_LOOPBACK, DEFAULT_PORT } from "@mda-studio/shared";
import { createApp } from "./app.js";
import { createLogger } from "./logger.js";

const log = createLogger();
const app = createApp();

const port = Number(process.env["PORT"] ?? DEFAULT_PORT);
const host = process.env["HOST"] ?? DEFAULT_HOST_LOOPBACK;

app.listen(port, host, () => {
  log.info("mda-studio server listening", { host, port });
});
