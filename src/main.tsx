import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { SocketProvider } from './socket/context'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SocketProvider>
    <App />
  </SocketProvider>,
)
