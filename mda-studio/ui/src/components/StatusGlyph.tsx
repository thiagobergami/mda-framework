import type { CSSProperties } from "react";
import {
  STATUS_COLOR_TOKENS,
  STATUS_GLYPHS,
  STATUS_LABELS,
  type SpecStatus,
} from "@mda-studio/shared";

interface StatusGlyphProps {
  status: SpecStatus;
}

export function StatusGlyph({ status }: StatusGlyphProps): JSX.Element {
  const style: CSSProperties = {
    color: `var(${STATUS_COLOR_TOKENS[status]})`,
  };
  return (
    <span
      className="status-glyph"
      style={style}
      title={STATUS_LABELS[status]}
      aria-label={STATUS_LABELS[status]}
    >
      {STATUS_GLYPHS[status]}
    </span>
  );
}
