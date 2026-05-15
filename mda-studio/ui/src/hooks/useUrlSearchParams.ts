/**
 * Minimal URL search-param state, vanilla History API.
 *
 * Returns `[params, set]`. `set` accepts either a new
 * `URLSearchParams`, or a function that receives the current params and
 * returns the next. Pushes to history so back/forward work.
 *
 * Out of scope for U5: TanStack Router. Plan §9.1 names it for a future
 * milestone — this hook gets us URL-driven lenses + node selection now
 * without taking on a routing library.
 */

import { useCallback, useEffect, useState } from "react";

type Updater =
  | URLSearchParams
  | ((current: URLSearchParams) => URLSearchParams);

export function useUrlSearchParams(): [
  URLSearchParams,
  (updater: Updater, opts?: { replace?: boolean }) => void,
] {
  const [params, setLocalParams] = useState<URLSearchParams>(() =>
    readCurrent(),
  );

  useEffect(() => {
    const onPop = (): void => setLocalParams(readCurrent());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const set = useCallback(
    (updater: Updater, opts: { replace?: boolean } = {}): void => {
      const next =
        typeof updater === "function" ? updater(readCurrent()) : updater;
      const url = `${window.location.pathname}${
        next.toString() ? "?" + next.toString() : ""
      }`;
      if (opts.replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
      setLocalParams(new URLSearchParams(next.toString()));
    },
    [],
  );

  return [params, set];
}

function readCurrent(): URLSearchParams {
  return new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search,
  );
}
