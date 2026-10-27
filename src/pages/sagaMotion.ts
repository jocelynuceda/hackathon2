import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

// Sigue en vivo la preferencia del sistema "reducir movimiento".
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion)

  useEffect(() => {
    const media = window.matchMedia(REDUCED_MOTION_QUERY)
    const onChange = () => setReduced(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return reduced
}

// Navega con la View Transition API cuando el navegador la soporta y el usuario
// no pidió reducir movimiento; si no, es una navegación normal.
export function navigateWithTransition(navigate: () => void) {
  if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
    navigate()
    return
  }
  // flushSync obliga a React a dibujar la nueva ruta dentro de la transición,
  // así el navegador puede animar entre el "antes" y el "después".
  document.startViewTransition(() => {
    flushSync(navigate)
  })
}

// Nombre compartido entre la tarjeta del resumen y el título de la historia:
// el navegador anima ese elemento de una pantalla a la otra.
export function sagaTitleTransitionName(id: string): string {
  return `saga-title-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`
}
