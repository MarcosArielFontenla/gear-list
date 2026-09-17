import { useUpdateBlocker } from "../../../pwa/service-worker/updateBlocker";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate } from "react-router-dom";
import { z } from "zod";
import { getApiErrorMessage } from "../../../shared/api/httpClient";
import { useAuth } from "../AuthProvider";
import { AuthShell } from "../components/AuthShell";
import { PasswordVisibilityToggle } from "../components/PasswordVisibilityToggle";

const registerSchema = z
  .object({
    displayName: z.string().trim().min(2, "Ingresa al menos 2 caracteres."),
    email: z.email("Ingresa un email válido."),
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

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { user, register: createAccount } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const [arePasswordsVisible, setArePasswordsVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  useUpdateBlocker(isDirty || isSubmitting);

  if (user) {
    return <Navigate replace to="/" />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);
    try {
      await createAccount(values);
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
          <p className="micro-label">Nuevo espacio</p>
          <h2>Crear cuenta</h2>
          <p>Tu planificación queda privada y asociada a tu usuario.</p>
        </div>
        {apiError && <p className="form-alert" role="alert">{apiError}</p>}
        <label className="field">
          <span>Nombre visible</span>
          <input
            aria-describedby={errors.displayName ? "register-name-error" : undefined}
            aria-invalid={Boolean(errors.displayName)}
            autoComplete="name"
            {...register("displayName")}
          />
          {errors.displayName && <small id="register-name-error" role="alert">{errors.displayName.message}</small>}
        </label>
        <label className="field">
          <span>Correo electrónico</span>
          <input
            aria-describedby={errors.email ? "register-email-error" : undefined}
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            type="email"
            {...register("email")}
          />
          {errors.email && <small id="register-email-error" role="alert">{errors.email.message}</small>}
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input
            aria-describedby={errors.password ? "register-password-error" : undefined}
            aria-invalid={Boolean(errors.password)}
            autoComplete="new-password"
            type={arePasswordsVisible ? "text" : "password"}
            {...register("password")}
          />
          {errors.password && <small id="register-password-error" role="alert">{errors.password.message}</small>}
        </label>
        <label className="field">
          <span>Confirmar contraseña</span>
          <input
            aria-describedby={errors.confirmPassword ? "register-confirm-password-error" : undefined}
            aria-invalid={Boolean(errors.confirmPassword)}
            autoComplete="new-password"
            type={arePasswordsVisible ? "text" : "password"}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <small id="register-confirm-password-error" role="alert">{errors.confirmPassword.message}</small>
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
          {isSubmitting ? "Creando..." : "Crear cuenta"}
          <ArrowRight aria-hidden="true" />
        </button>
        <p className="auth-switch">
          ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </form>
    </AuthShell>
  );
}
