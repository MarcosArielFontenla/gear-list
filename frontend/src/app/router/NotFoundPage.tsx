import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="not-found-page">
      <p className="eyebrow">Error 404</p>
      <h1>Esta página no existe</h1>
      <p>
        La dirección puede haber cambiado o el enlace ya no está disponible.
      </p>
      <Link className="button button-primary" to="/">
        <ArrowLeft aria-hidden="true" /> Volver al inicio
      </Link>
    </section>
  );
}
