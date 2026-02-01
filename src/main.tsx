import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { SocketProvider } from './socket/context'
import { ToastProvider } from './components/Toast'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SocketProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </SocketProvider>,
)
