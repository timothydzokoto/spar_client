export type ToastItem = {
  id: number;
  text: string;
  tone?: "info" | "success" | "warning" | "error";
};

type ToastStackProps = {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
};

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4">
      <div className="w-full max-w-md space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              "pointer-events-auto rounded-xl border px-3 py-2 text-sm shadow-lg backdrop-blur",
              toneClass(toast.tone ?? "info"),
            ].join(" ")}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-2">
              <p>{toast.text}</p>
              <button
                type="button"
                className="rounded-md px-2 py-0.5 text-xs hover:bg-black/10"
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
              >
                x
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function toneClass(tone: ToastItem["tone"]): string {
  switch (tone) {
    case "success":
      return "border-emerald-300/60 bg-emerald-500/20 text-emerald-50";
    case "warning":
      return "border-amber-300/60 bg-amber-500/20 text-amber-50";
    case "error":
      return "border-rose-300/60 bg-rose-500/20 text-rose-50";
    case "info":
    default:
      return "border-cyan-300/60 bg-cyan-500/20 text-cyan-50";
  }
}
