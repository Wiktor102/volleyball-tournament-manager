import { useCallback, useState, type ReactNode } from "react";
import { ToastContext, type Toast, type ToastType } from "./Toast";

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const addToast = useCallback((message: string, type: ToastType = "info") => {
		const id = ++toastId;
		setToasts(prev => [...prev, { id, message, type }]);

		window.setTimeout(() => {
			setToasts(prev => prev.filter(t => t.id !== id));
		}, 4000);
	}, []);

	const removeToast = useCallback((id: number) => {
		setToasts(prev => prev.filter(t => t.id !== id));
	}, []);

	return (
		<ToastContext.Provider value={{ toasts, addToast, removeToast }}>
			{children}
			<ToastContainer toasts={toasts} onRemove={removeToast} />
		</ToastContext.Provider>
	);
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
	if (toasts.length === 0) return null;

	return (
		<div className="toast-container">
			{toasts.map(toast => (
				<div key={toast.id} className={`toast toast-${toast.type}`} onClick={() => onRemove(toast.id)}>
					<span className="toast-icon">
						{toast.type === "success" && "✓"}
						{toast.type === "error" && "✕"}
						{toast.type === "warning" && "⚠"}
						{toast.type === "info" && "ℹ"}
					</span>
					<span className="toast-message">{toast.message}</span>
				</div>
			))}
		</div>
	);
}
