import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastContextValue = {
  message: string;
  show: (text: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const timer = useRef<number | null>(null);

  const show = useCallback((text: string) => {
    setMessage(text);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(""), 2800);
  }, []);

  const value = useMemo(() => ({ message, show }), [message, show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className={`pointer-events-none fixed inset-x-0 z-[80] flex justify-center px-6 transition-all duration-300 ${
          message ? "bottom-36 opacity-100" : "bottom-28 opacity-0"
        }`}
        aria-live="polite"
      >
        {message ? (
          <div className="max-w-[480px] rounded-full bg-black/80 px-4 py-2 text-center text-sm text-[#F4F1EA] shadow-lg backdrop-blur">
            {message}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("ToastProvider missing");
  return ctx;
}
