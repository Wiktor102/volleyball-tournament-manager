import { createContext, useContext } from "react";

export type ConfirmOptions = {
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	danger?: boolean;
	requireTypedConfirmation?: string; // If set, user must type this text to confirm
	/** If false, this confirmation can never be skipped even when admin preference is set. Default true. */
	skippable?: boolean;
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

// Admin preferences stored in localStorage
const ADMIN_PREFS_KEY = "admin_preferences";

export type AdminPreferences = {
	skipConfirmations: boolean;
};

export function getAdminPreferences(): AdminPreferences {
	try {
		const stored = localStorage.getItem(ADMIN_PREFS_KEY);
		if (stored) return { skipConfirmations: false, ...JSON.parse(stored) };
	} catch { /* ignore */ }
	return { skipConfirmations: false };
}

export function setAdminPreferences(prefs: Partial<AdminPreferences>) {
	const current = getAdminPreferences();
	localStorage.setItem(ADMIN_PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
}
