import { type ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { checkAuth } from "../utils/auth";

type Props = { children: ReactNode };

export function RequireAuth({ children }: Props) {
	const location = useLocation();
	// null = still checking, true = authenticated, false = not authenticated
	const [status, setStatus] = useState<null | boolean>(null);

	useEffect(() => {
		let cancelled = false;
		checkAuth().then(ok => {
			if (!cancelled) setStatus(ok);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	if (status === null) {
		// Brief loading state while validating token
		return (
			<div
				style={{
					minHeight: "100vh",
					background: "#0f172a",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "#94a3b8",
					fontSize: "0.9rem"
				}}
			>
				Sprawdzanie autoryzacji…
			</div>
		);
	}

	if (!status) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	return <>{children}</>;
}
