import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'
import UploadPage from './pages/admin/UploadPage'
import DashboardPage from './pages/DashboardPage'

function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div style={{ padding: '40px', color: '#6b7280' }}>Загрузка...</div>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/" element={session ? <Layout><div style={{ color: '#e8eaf0' }}>Дашборд загружается...</div></Layout> : <Navigate to="/login" />} />
        <Route path="/admin/upload" element={session ? <Layout><UploadPage /></Layout> : <Navigate to="/login" />} />
        <Route path="/" element={session ? <Layout><DashboardPage /></Layout> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App