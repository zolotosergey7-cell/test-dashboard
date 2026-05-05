import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Неверный email или пароль')
    setLoading(false)
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logo}>◆ ТЕСТ-АНАЛИТИКА</div>
        <h1 style={styles.title}>Вход в систему</h1>
        <p style={styles.sub}>ЮФРС 585</p>
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              placeholder="example@mail.ru"
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0c10' },
  card: { background: '#111318', border: '1px solid #1f2533', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px' },
  logo: { fontFamily: 'monospace', fontSize: '11px', fontWeight: '700', letterSpacing: '0.3em', color: '#c9a84c', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: '800', marginBottom: '6px' },
  sub: { color: '#6b7280', fontSize: '14px', marginBottom: '32px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' },
  input: { background: '#181c24', border: '1px solid #1f2533', borderRadius: '8px', padding: '12px 14px', color: '#e8eaf0', fontSize: '14px', outline: 'none' },
  error: { background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#e05555', fontSize: '13px' },
  btn: { background: '#c9a84c', color: '#0a0c10', border: 'none', borderRadius: '8px', padding: '13px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', letterSpacing: '0.05em' },
}