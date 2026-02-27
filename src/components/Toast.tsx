import { createContext, useContext } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
	id: number;
	message: string;
	type: ToastType;
}

export interface ToastContextValue {
	toasts: Toast[];
	addToast: (message: string, type?: ToastType) => void;
	removeToast: (id: number) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error("useToast must be used within ToastProvider");
	return ctx;
}
