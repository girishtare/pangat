"use client";

import { useEffect } from "react";

/**
 * Opens the page at the top every time. Browsers otherwise restore the old
 * scroll position on reload, or jump to an anchor left in the address
 * (e.g. #how after clicking "How it works").
 */
export default function StartAtTop() {
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    window.scrollTo(0, 0);
  }, []);
  return null;
}
