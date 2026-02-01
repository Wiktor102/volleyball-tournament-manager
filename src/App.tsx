import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Dashboard } from './pages/admin/Dashboard'
import { TeamsManager } from './pages/admin/TeamsManager'
import { BracketEditor } from './pages/admin/BracketEditor'
import { MatchControl } from './pages/admin/MatchControl'
import { FanView } from './pages/display/FanView'
import { BracketDisplay } from './pages/display/BracketDisplay'
import { StreamOverlay } from './pages/overlay/StreamOverlay'
import { NotFound } from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/teams" element={<TeamsManager />} />
        <Route path="/admin/bracket" element={<BracketEditor />} />
        <Route path="/admin/match/:matchId" element={<MatchControl />} />
        <Route path="/display/fan" element={<FanView />} />
        <Route path="/display/bracket" element={<BracketDisplay />} />
        <Route path="/overlay" element={<StreamOverlay />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
