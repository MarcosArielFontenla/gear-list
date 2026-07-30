import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

const routeTitles: Record<string, string> = {
  "/": "Inicio",
  "/forgot-password": "Recuperar contraseña",
  "/lists": "Listas de equipo",
  "/login": "Iniciar sesión",
  "/purchased": "Historial de compras",
  "/register": "Crear cuenta",
  "/reset-password": "Crear nueva contraseña",
  "/settings": "Configuración",
};

export function RouteExperience() {
  const { pathname } = useLocation();
  const title = useMemo(() => getRouteTitle(pathname), [pathname]);

  useEffect(() => {
    document.title = `${title} · Gear List`;
    const focusedBeforeFrame = document.activeElement;

    const frame = window.requestAnimationFrame(() => {
      const userMovedFocus =
        document.activeElement !== focusedBeforeFrame &&
        document.activeElement !== document.body;

      if (!userMovedFocus) {
        document.querySelector<HTMLElement>("#main-content")?.focus({
          preventScroll: true,
        });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [title]);

  return (
    <span aria-atomic="true" aria-live="polite" className="visually-hidden">
      {title}
    </span>
  );
}

function getRouteTitle(pathname: string) {
  if (/^\/lists\/[^/]+$/.test(pathname)) {
    return "Detalle de lista";
  }

  return routeTitles[pathname] ?? "Página no encontrada";
}
