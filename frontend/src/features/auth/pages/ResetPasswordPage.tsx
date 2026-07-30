import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, KeyRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { getApiErrorMessage } from "../../../shared/api/httpClient";
import { resetPassword } from "../api/authApi";
import { AuthShell } from "../components/AuthShell";
import { PasswordVisibilityToggle } from "../components/PasswordVisibilityToggle";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Usa al menos 8 caracteres.")
      .regex(/[A-Z]/, "Incluye una mayúscula.")
      .regex(/[a-z]/, "Incluye una minúscula.")
      .regex(/\d/, "Incluye un número."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden.",
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const resetCredentials = useMemo(readResetCredentials, []);
  const [isComplete, setIsComplete] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [arePasswordsVisible, setArePasswordsVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!resetCredentials) {
      return;
    }

    setApiError(null);

    try {
      await resetPassword({ ...resetCredentials, ...values });
      window.history.replaceState(
        window.history.state,
        "",
        "/reset-password",
      );
      setIsComplete(true);
    } catch (error) {
      setApiError(getApiErrorMessage(error));
    }
  });

  if (!resetCredentials) {
    return (
      <AuthShell>
        <section
          className="auth-card auth-success-card glass"
          id="auth-form"
          tabIndex={-1}
        >
          <KeyRound aria-hidden="true" className="auth-status-icon" />
          <div>
            <p className="micro-label">Enlace no válido</p>
            <h2>Solicita un enlace nuevo</h2>
            <p>
              Este enlace está incompleto. Por seguridad, vuelve a iniciar el
              proceso de recuperación.
            </p>
          </div>
          <Link
            className="button button-primary button-wide"
            to="/forgot-password"
          >
            Recuperar contraseña
            <ArrowRight aria-hidden="true" />
          </Link>
        </section>
      </AuthShell>
    );
  }

  if (isComplete) {
    return (
      <AuthShell>
        <section
          className="auth-card auth-success-card glass"
          id="auth-form"
          tabIndex={-1}
        >
          <CheckCircle2 aria-hidden="true" className="auth-status-icon" />
          <div>
            <p className="micro-label">Cambio completado</p>
            <h2>Contraseña actualizada</h2>
            <p>Ya puedes ingresar a Gear List con tu nueva contraseña.</p>
          </div>
          <Link className="button button-primary button-wide" to="/login">
            Iniciar sesión
            <ArrowRight aria-hidden="true" />
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
          <p className="micro-label">Último paso</p>
          <h2>Crea una nueva contraseña</h2>
          <p>Usa al menos 8 caracteres, una mayúscula y un número.</p>
        </div>
        {apiError && <p className="form-alert" role="alert">{apiError}</p>}
        <label className="field">
          <span>Nueva contraseña</span>
          <input
            aria-describedby={
              errors.password ? "reset-password-error" : undefined
            }
            aria-invalid={Boolean(errors.password)}
            autoComplete="new-password"
            type={arePasswordsVisible ? "text" : "password"}
            {...register("password")}
          />
          {errors.password && (
            <small id="reset-password-error" role="alert">
              {errors.password.message}
            </small>
          )}
        </label>
        <label className="field">
          <span>Confirmar contraseña</span>
          <input
            aria-describedby={
              errors.confirmPassword
                ? "reset-confirm-password-error"
                : undefined
            }
            aria-invalid={Boolean(errors.confirmPassword)}
            autoComplete="new-password"
            type={arePasswordsVisible ? "text" : "password"}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <small id="reset-confirm-password-error" role="alert">
              {errors.confirmPassword.message}
            </small>
          )}
        </label>
        <PasswordVisibilityToggle
          isVisible={arePasswordsVisible}
          onChange={setArePasswordsVisible}
        />
        <button
          className="button button-primary button-wide"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Guardando..." : "Guardar contraseña"}
          <ArrowRight aria-hidden="true" />
        </button>
      </form>
    </AuthShell>
  );
}

function readResetCredentials() {
  const values = new URLSearchParams(window.location.hash.slice(1));
  const userId = values.get("userId");
  const token = values.get("token");

  return userId && token ? { userId, token } : null;
}
