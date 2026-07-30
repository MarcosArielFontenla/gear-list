import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { getApiErrorMessage } from "../../../shared/api/httpClient";
import { Modal } from "../../../shared/components/Modal";
import { useAuth } from "../AuthProvider";
import { changePassword } from "../api/authApi";
import { PasswordVisibilityToggle } from "./PasswordVisibilityToggle";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual."),
    newPassword: z
      .string()
      .min(8, "Usa al menos 8 caracteres.")
      .max(128, "Usa como máximo 128 caracteres.")
      .regex(/[A-Z]/, "Incluye una mayúscula.")
      .regex(/[a-z]/, "Incluye una minúscula.")
      .regex(/\d/, "Incluye un número."),
    confirmPassword: z.string(),
  })
  .refine(
    (values) => values.currentPassword !== values.newPassword,
    {
      path: ["newPassword"],
      message: "La nueva contraseña debe ser diferente de la actual.",
    },
  )
  .refine(
    (values) => values.newPassword === values.confirmPassword,
    {
      path: ["confirmPassword"],
      message: "Las contraseñas no coinciden.",
    },
  );

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm({ onClose }: { onClose: () => void }) {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const [arePasswordsVisible, setArePasswordsVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);

    if (!accessToken) {
      setApiError("Esta acción requiere conexión y una sesión activa.");
      return;
    }

    try {
      await changePassword(values, accessToken);
      await logout();
      navigate("/login", {
        replace: true,
        state: { passwordChanged: true },
      });
    } catch (error) {
      setApiError(getApiErrorMessage(error));
    }
  });

  return (
    <Modal
      title="Cambiar contraseña"
      description="Al guardar, cerraremos tus sesiones abiertas para proteger la cuenta."
      onClose={onClose}
    >
      <form
        aria-busy={isSubmitting}
        className="form-stack"
        onSubmit={onSubmit}
        noValidate
      >
        {apiError && <p className="form-alert" role="alert">{apiError}</p>}
        <label className="field">
          <span>Contraseña actual</span>
          <input
            aria-describedby={
              errors.currentPassword
                ? "change-current-password-error"
                : undefined
            }
            aria-invalid={Boolean(errors.currentPassword)}
            autoComplete="current-password"
            autoFocus
            type={arePasswordsVisible ? "text" : "password"}
            {...register("currentPassword")}
          />
          {errors.currentPassword && (
            <small id="change-current-password-error" role="alert">
              {errors.currentPassword.message}
            </small>
          )}
        </label>
        <label className="field">
          <span>Nueva contraseña</span>
          <input
            aria-describedby={
              errors.newPassword ? "change-new-password-error" : undefined
            }
            aria-invalid={Boolean(errors.newPassword)}
            autoComplete="new-password"
            type={arePasswordsVisible ? "text" : "password"}
            {...register("newPassword")}
          />
          {errors.newPassword && (
            <small id="change-new-password-error" role="alert">
              {errors.newPassword.message}
            </small>
          )}
        </label>
        <label className="field">
          <span>Confirmar nueva contraseña</span>
          <input
            aria-describedby={
              errors.confirmPassword
                ? "change-confirm-password-error"
                : undefined
            }
            aria-invalid={Boolean(errors.confirmPassword)}
            autoComplete="new-password"
            type={arePasswordsVisible ? "text" : "password"}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <small id="change-confirm-password-error" role="alert">
              {errors.confirmPassword.message}
            </small>
          )}
        </label>
        <PasswordVisibilityToggle
          isVisible={arePasswordsVisible}
          onChange={setArePasswordsVisible}
        />
        <div className="form-actions">
          <button
            className="button button-secondary"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="button button-primary"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Actualizando..." : "Actualizar contraseña"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
