import type { RunStatus } from "@mda-studio/shared";

interface AssigneeChipProps {
  handle: string;
  runStatus: RunStatus | null;
}

const RUN_LABEL: Record<RunStatus, string> = {
  idle: "Idle",
  running: "Running now",
  paused: "Paused",
  error: "Error",
};

export function AssigneeChip({
  handle,
  runStatus,
}: AssigneeChipProps): JSX.Element {
  const dotClass =
    runStatus && runStatus !== "idle" ? `run-dot run-dot--${runStatus}` : "run-dot";
  const title = runStatus ? `${handle} — ${RUN_LABEL[runStatus]}` : handle;
  return (
    <span className="assignee-chip" title={title} aria-label={title}>
      {runStatus !== null && (
        <span
          className={dotClass}
          aria-hidden="true"
          data-testid="run-dot"
          data-run-status={runStatus}
        />
      )}
      {handle}
    </span>
  );
}
