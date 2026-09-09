import * as React from "react"
import { MOBILE_BREAKPOINT } from "@/utils/responsive"

function getIsMobileViewport(): boolean {
  if (typeof window === "undefined") return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

/**
 * Mobile detection aligned with `useResponsive` / `MOBILE_BREAKPOINT` (768px).
 * Initializes synchronously from `window` to avoid a desktop layout flash on phones.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(getIsMobileViewport)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
