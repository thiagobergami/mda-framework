import { forwardRef, useEffect, useState } from "react";

interface SearchInputProps {
  /** Current free-text lens value (debounced output of this input). */
  value: string;
  onChange: (next: string) => void;
  /** Debounce milliseconds for committing typed text. */
  debounceMs?: number;
  placeholder?: string;
}

/**
 * Free-text input bound to the `q` URL lens.
 *
 * Local state is kept while typing so each keystroke doesn't push a new
 * history entry; we commit after `debounceMs` of inactivity. Pressing
 * Enter commits immediately; Escape clears.
 *
 * `forwardRef` so the global "/" shortcut can call `.focus()` on it.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    { value, onChange, debounceMs = 180, placeholder = "Search specs (/)" },
    ref,
  ) {
    const [local, setLocal] = useState<string>(value);

    // When the URL changes externally (e.g. lens removed via chip), sync.
    useEffect(() => {
      setLocal(value);
    }, [value]);

    // Debounced commit.
    useEffect(() => {
      if (local === value) return;
      const t = setTimeout(() => onChange(local), debounceMs);
      return () => clearTimeout(t);
    }, [local, value, onChange, debounceMs]);

    return (
      <input
        ref={ref}
        type="search"
        className="chrome__search"
        placeholder={placeholder}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onChange(local);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setLocal("");
            onChange("");
            (e.target as HTMLInputElement).blur();
          }
        }}
        aria-label="Search specs"
      />
    );
  },
);
