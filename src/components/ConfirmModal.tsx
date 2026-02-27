import { createContext, useContext } from "react";

export type ConfirmOptions = {
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	danger?: boolean;
	requireTypedConfirmation?: string; // If set, user must type this text to confirm
};

export type ConfirmContextValue = {
	confirm: (options: ConfirmOptions) => Promise<boolean>;
};

export const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
	const ctx = useContext(ConfirmContext);
	if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
	return ctx.confirm;
}
