type OperationFeedbackProps = {
  message: string;
  tone?: "error" | "success";
};

export function OperationFeedback({
  message,
  tone = "success",
}: OperationFeedbackProps) {
  return (
    <p
      aria-atomic="true"
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`inline-feedback ${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {message}
    </p>
  );
}
