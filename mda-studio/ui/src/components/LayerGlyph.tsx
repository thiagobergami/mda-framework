import type { CSSProperties } from "react";
import {
  LAYER_COLOR_TOKENS,
  LAYER_GLYPHS,
  LAYER_LABELS,
  type Layer,
} from "@mda-studio/shared";

interface LayerGlyphProps {
  layer: Layer;
}

export function LayerGlyph({ layer }: LayerGlyphProps): JSX.Element {
  const style: CSSProperties = {
    background: `var(${LAYER_COLOR_TOKENS[layer]})`,
  };
  return (
    <span
      className="layer-glyph"
      style={style}
      title={LAYER_LABELS[layer]}
      aria-label={LAYER_LABELS[layer]}
    >
      {LAYER_GLYPHS[layer]}
    </span>
  );
}
