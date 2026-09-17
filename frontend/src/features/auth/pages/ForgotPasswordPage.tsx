import { useUpdateBlocker } from "../../../pwa/service-worker/updateBlocker";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { getApiErrorMessage } from "../../../shared/api/httpClient";
import { forgotPassword } from "../api/authApi";
import { AuthShell } from "../components/AuthShell";

const forgotPasswordSchema = z.object({
  email: z.email("Ingresa un email válido."),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  useUpdateBlocker(isDirty || isSubmitting);

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);

    try {
      await forgotPassword(values);
      setSubmittedEmail(values.email);
    } catch (error) {
      setApiError(getApiErrorMessage(error));
    }
  });

  if (submittedEmail) {
    return (
      <AuthShell>
        <section
          className="auth-card auth-success-card glass"
          id="auth-form"
          tabIndex={-1}
        >
          <MailCheck aria-hidden="true" className="auth-status-icon" />
          <div>
            <p className="micro-label">Revisa tu correo</p>
            <h2>Solicitud recibida</h2>
            <p>
              Si existe una cuenta asociada a <strong>{submittedEmail}</strong>,
              recibirás un enlace para crear una nueva contraseña.
            </p>
          </div>
          <p className="auth-note">
            El enlace vence en 30 minutos. Revisa también la carpeta de correo
            no deseado.
          </p>
          <Link className="button button-secondary button-wide" to="/login">
            <ArrowLeft aria-hidden="true" />
            Volver a iniciar sesión
          </Link>
        </section>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form
        aria-busy={isSubmitting}
        className="auth-card glass"
        id="auth-form"
        onSubmit={onSubmit}
        tabIndex={-1}
        noValidate
      >
        <div>
          <p className="micro-label">Recuperación segura</p>
          <h2>Recuperar contraseña</h2>
          <p>Te enviaremos un enlace para crear una contraseña nueva.</p>
        </div>
        {apiError && <p className="form-alert" role="alert">{apiError}</p>}
        <label className="field">
          <span>Correo electrónico</span>
          <input
            aria-describedby={
              errors.email ? "forgot-password-email-error" : undefined
            }
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            type="email"
            {...register("email")}
          />
          {errors.email && (
            <small id="forgot-password-email-error" role="alert">
              {errors.email.message}
            </small>
          )}
        </label>
        <button
          className="button button-primary button-wide"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Enviando..." : "Enviar enlace"}
          <ArrowRight aria-hidden="true" />
        </button>
        <p className="auth-switch">
          <Link to="/login">Volver a iniciar sesión</Link>
        </p>
      </form>
    </AuthShell>
  );
}
