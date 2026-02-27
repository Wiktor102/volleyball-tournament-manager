import { useCallback, useState, type ReactNode } from "react";
import { ConfirmContext, type ConfirmOptions } from "./ConfirmModal";
import "../styles/admin.css";

type ModalState = {
	options: ConfirmOptions;
	resolve: (value: boolean) => void;
} | null;

export function ConfirmProvider({ children }: { children: ReactNode }) {
	const [modal, setModal] = useState<ModalState>(null);
	const [typedText, setTypedText] = useState("");

	const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
		return new Promise(resolve => {
			setModal({ options, resolve });
			setTypedText("");
		});
	}, []);

	const handleConfirm = () => {
		if (modal) {
			modal.resolve(true);
			setModal(null);
			setTypedText("");
		}
	};

	const handleCancel = () => {
		if (modal) {
			modal.resolve(false);
			setModal(null);
			setTypedText("");
		}
	};

	const canConfirm = modal?.options.requireTypedConfirmation ? typedText === modal.options.requireTypedConfirmation : true;

	return (
		<ConfirmContext.Provider value={{ confirm }}>
			{children}
			{modal && (
				<div className="modal-overlay" onClick={handleCancel}>
					<div className="modal" onClick={e => e.stopPropagation()}>
						<div className="modal-header">
							<h3>{modal.options.title}</h3>
						</div>
						<div className="modal-body">
							<p>{modal.options.message}</p>
							{modal.options.requireTypedConfirmation && (
								<div className="form-group" style={{ marginTop: 16 }}>
									<label className="form-label">
										Wpisz <strong>"{modal.options.requireTypedConfirmation}"</strong> aby potwierdzić:
									</label>
									<input
										className="form-input"
										value={typedText}
										onChange={e => setTypedText(e.target.value)}
										placeholder={modal.options.requireTypedConfirmation}
										autoFocus
									/>
								</div>
							)}
						</div>
						<div className="modal-footer">
							<button className="btn btn-secondary" onClick={handleCancel}>
								{modal.options.cancelText ?? "Anuluj"}
							</button>
							<button
								className={`btn ${modal.options.danger ? "btn-danger" : "btn-primary"}`}
								onClick={handleConfirm}
								disabled={!canConfirm}
							>
								{modal.options.confirmText ?? "Potwierdź"}
							</button>
						</div>
					</div>
				</div>
			)}
		</ConfirmContext.Provider>
	);
}
