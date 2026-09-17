import { useUpdateBlocker } from "../../../pwa/service-worker/updateBlocker";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { getApiErrorMessage } from "../../../shared/api/httpClient";
import { useAuth } from "../AuthProvider";
import { AuthShell } from "../components/AuthShell";
import { PasswordVisibilityToggle } from "../components/PasswordVisibilityToggle";

const loginSchema = z.object({
  email: z.email("Ingresa un email válido."),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const passwordChanged = (
    location.state as { passwordChanged?: boolean } | null
  )?.passwordChanged;
  const [apiError, setApiError] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  useUpdateBlocker(isDirty || isSubmitting);

  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate replace to={from} />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);
    try {
      await login(values);
    } catch (error) {
      setApiError(getApiErrorMessage(error));
    }
  });

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
          <p className="micro-label">Acceso seguro</p>
          <h2>Iniciar sesión</h2>
          <p>Continúa donde dejaste tu próxima compra.</p>
        </div>
        {passwordChanged && (
          <p className="inline-feedback success" role="status">
            Contraseña actualizada. Inicia sesión nuevamente.
          </p>
        )}
        {apiError && <p className="form-alert" role="alert">{apiError}</p>}
        <label className="field">
          <span>Correo electrónico</span>
          <input
            aria-describedby={errors.email ? "login-email-error" : undefined}
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            type="email"
            {...register("email")}
          />
          {errors.email && <small id="login-email-error" role="alert">{errors.email.message}</small>}
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input
            aria-describedby={errors.password ? "login-password-error" : undefined}
            aria-invalid={Boolean(errors.password)}
            autoComplete="current-password"
            type={isPasswordVisible ? "text" : "password"}
            {...register("password")}
          />
          {errors.password && <small id="login-password-error" role="alert">{errors.password.message}</small>}
        </label>
        <PasswordVisibilityToggle
          isVisible={isPasswordVisible}
          onChange={setIsPasswordVisible}
        />
        <Link className="auth-help-link" to="/forgot-password">
          ¿Olvidaste tu contraseña?
        </Link>
        <button
          className="button button-primary button-wide"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Ingresando..." : "Ingresar"}
          <ArrowRight aria-hidden="true" />
        </button>
        <p className="auth-switch">
          ¿Todavía no tienes cuenta? <Link to="/register">Crear cuenta</Link>
        </p>
      </form>
    </AuthShell>
  );
}
