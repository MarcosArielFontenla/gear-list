type PasswordVisibilityToggleProps = {
  isVisible: boolean;
  onChange: (isVisible: boolean) => void;
};

export function PasswordVisibilityToggle({
  isVisible,
  onChange,
}: PasswordVisibilityToggleProps) {
  return (
    <label className="password-visibility-toggle">
      <input
        checked={isVisible}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>Ver contraseña</span>
    </label>
  );
}
