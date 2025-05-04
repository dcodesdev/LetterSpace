import { useEffect, useRef } from "react"

export function useUpdateEffect(effect: () => void, deps: unknown[]) {
  const hasMounted = useRef(false)

  useEffect(() => {
    if (hasMounted.current) {
      effect()
    } else {
      hasMounted.current = true
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
}
