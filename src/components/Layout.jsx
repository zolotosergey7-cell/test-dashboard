import { useNavigate, NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useRole } from '../hooks/useRole'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const { role } = useRole()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div style={styles.wrap}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>◆ ТЕСТ-АНАЛИТИКА</div>
        <div style={styles.org}>ЮФРС 585</div>

        <nav style={styles.nav}>
          <NavLink to="/" end style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}>
            📊 Дашборд
          </NavLink>

          {role === 'admin' && (
            <>
              <div style={styles.navSection}>АДМИНИСТРИРОВАНИЕ</div>
              <NavLink to="/admin/employees" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}>
                👥 Сотрудники
              </NavLink>
              <NavLink to="/admin/upload" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.linkActive : {}) })}>
                📁 Загрузка данных
              </NavLink>
            </>
          )}
        </nav>

        <div style={styles.bottom}>
          <div style={styles.roleTag}>
            {role === 'admin' ? '🔑 Администратор' : '👁 Просмотр'}
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Выйти
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        {children}
      </main>
    </div>
  )
}

const styles = {
  wrap: { display: 'flex', minHeight: '100vh', background: '#0a0c10' },
  sidebar: {
    width: '220px', flexShrink: 0, background: '#111318',
    borderRight: '1px solid #1f2533', display: 'flex',
    flexDirection: 'column', padding: '24px 16px', position: 'fixed',
    top: 0, left: 0, height: '100vh'
  },
  logo: { fontFamily: 'monospace', fontSize: '11px', fontWeight: '700', letterSpacing: '0.3em', color: '#c9a84c', marginBottom: '4px' },
  org: { fontSize: '12px', color: '#6b7280', marginBottom: '32px' },
  nav: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  navSection: { fontSize: '10px', color: '#6b7280', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '16px 0 8px 12px' },
  link: { display: 'block', padding: '10px 12px', borderRadius: '8px', color: '#6b7280', textDecoration: 'none', fontSize: '14px', transition: 'all 0.15s' },
  linkActive: { background: 'rgba(201,168,76,0.1)', color: '#c9a84c' },
  bottom: { borderTop: '1px solid #1f2533', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  roleTag: { fontSize: '12px', color: '#6b7280', padding: '6px 12px', background: '#181c24', borderRadius: '6px' },
  logoutBtn: { background: 'transparent', border: '1px solid #1f2533', color: '#6b7280', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px' },
  main: { marginLeft: '220px', flex: 1, padding: '32px', overflowY: 'auto' }
}