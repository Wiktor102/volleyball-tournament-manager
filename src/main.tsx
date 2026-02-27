import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { SocketProvider } from "./socket/context";
import { ToastProvider } from "./components/ToastProvider";
import { ConfirmProvider } from "./components/ConfirmProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<SocketProvider>
		<ToastProvider>
			<ConfirmProvider>
				<App />
			</ConfirmProvider>
		</ToastProvider>
	</SocketProvider>
);
