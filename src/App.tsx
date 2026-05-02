import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { HomePage } from './pages/HomePage'

export function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* Las demás rutas se agregan conforme se construyen las páginas */}
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  )
}
