import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./components/AdminLayout";
import { Dashboard } from "./pages/admin/Dashboard";
import { TournamentSetup } from "./pages/admin/TournamentSetup";
import { TournamentList } from "./pages/admin/TournamentList";
import { TeamsManager } from "./pages/admin/TeamsManager";
import { BracketEditor } from "./pages/admin/BracketEditor";
import { MatchControl } from "./pages/admin/MatchControl";
import { FanView } from "./pages/display/FanView";
import { BracketDisplay } from "./pages/display/BracketDisplay";
import { StreamOverlay } from "./pages/overlay/StreamOverlay";
import { NotFound } from "./pages/NotFound";

export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Navigate to="/admin" replace />} />
				<Route element={<AdminLayout />}>
					<Route path="/admin" element={<Dashboard />} />
					<Route path="/admin/tournaments" element={<TournamentList />} />
					<Route path="/admin/tournament/new" element={<TournamentSetup />} />
					<Route path="/admin/tournament/:id" element={<TournamentSetup />} />
					<Route path="/admin/teams" element={<TeamsManager />} />
					<Route path="/admin/bracket" element={<BracketEditor />} />
					<Route path="/admin/match/:matchId" element={<MatchControl />} />
				</Route>
				<Route path="/display/fan" element={<FanView />} />
				<Route path="/display/bracket" element={<BracketDisplay />} />
				<Route path="/overlay" element={<StreamOverlay />} />
				<Route path="*" element={<NotFound />} />
			</Routes>
		</BrowserRouter>
	);
}
