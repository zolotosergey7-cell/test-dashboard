import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = { passed: '#4caf7d', failed: '#e05555', started: '#4c8ce0', completed: '#c9a84c' }

export default function DashboardPage() {
  const [employees, setEmployees] = useState([])
  const [testResults, setTestResults] = useState([])
  const [courseResults, setCourseResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('all') // all | week | day
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [empRes, testRes, courseRes] = await Promise.all([
      supabase.from('employees').select('*'),
      supabase.from('test_results').select('*').order('attempt_date', { ascending: true }),
      supabase.from('courses').select('*').order('progress_date', { ascending: true }),
    ])
    setEmployees(empRes.data || [])
    setTestResults(testRes.data || [])
    setCourseResults(courseRes.data || [])
    setLoading(false)
  }

  // ── Filter helpers ─────────────────────────────────────────────────────────
  function filterByDate(rows, dateField) {
    let data = [...rows]
    if (dateFrom) data = data.filter(r => r[dateField] >= dateFrom)
    if (dateTo) data = data.filter(r => r[dateField] <= dateTo)
    return data
  }

  const filteredTests = filterByDate(testResults, 'attempt_date')
  const filteredCourses = filterByDate(courseResults, 'progress_date')

  // ── Employee stats ─────────────────────────────────────────────────────────
  const totalEmployees = employees.length
  const byPosition = employees.reduce((acc, e) => {
    const pos = e.position || 'Не указана'
    acc[pos] = (acc[pos] || 0) + 1
    return acc
  }, {})
  const positionData = Object.entries(byPosition).map(([name, value]) => ({ name, value }))

  // ── Test stats ─────────────────────────────────────────────────────────────
  const testStarted = new Set(filteredTests.map(r => r.employee_id)).size
  const testPassed = filteredTests.filter(r => r.status === 'passed').length
  const testFailed = filteredTests.filter(r => r.status === 'failed').length
  const testStartedOnly = filteredTests.filter(r => r.status === 'started').length
  const testPassRate = testStarted ? Math.round(testPassed / filteredTests.length * 100) : 0

  const testPctOfTotal = totalEmployees ? Math.round(testStarted / totalEmployees * 100) : 0

  // ── Course stats ───────────────────────────────────────────────────────────
  const courseNames = [...new Set(filteredCourses.map(r => r.course_name))]
  const courseStats = courseNames.map(name => {
    const rows = filteredCourses.filter(r => r.course_name === name)
    const started = new Set(rows.map(r => r.employee_id)).size
    const completed = rows.filter(r => r.status === 'completed').length
    const failed = rows.filter(r => r.status === 'failed').length
    return {
      name,
      started,
      completed,
      failed,
      startedPct: totalEmployees ? Math.round(started / totalEmployees * 100) : 0,
      completedPct: started ? Math.round(completed / started * 100) : 0,
    }
  })

  // ── Daily dynamics ─────────────────────────────────────────────────────────
  const dailyTest = buildDaily(filteredTests, 'attempt_date')
  const weeklyTest = buildWeekly(filteredTests, 'attempt_date')

  function buildDaily(rows, dateField) {
    const map = {}
    rows.forEach(r => {
      const d = r[dateField]
      if (!d) return
      if (!map[d]) map[d] = { date: d, passed: 0, failed: 0, started: 0, total: 0 }
      map[d][r.status]++
      map[d].total++
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  }

  function buildWeekly(rows, dateField) {
    const map = {}
    rows.forEach(r => {
      const d = r[dateField]
      if (!d) return
      const date = new Date(d)
      const monday = new Date(date)
      monday.setDate(date.getDate() - date.getDay() + 1)
      const key = monday.toISOString().split('T')[0]
      if (!map[key]) map[key] = { date: key, passed: 0, failed: 0, started: 0, total: 0 }
      map[key][r.status]++
      map[key].total++
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  }

  const dynamicsData = period === 'week' ? weeklyTest : dailyTest

  if (loading) return <div style={{ color: '#6b7280', padding: '40px' }}>Загрузка данных...</div>

  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.title}>Дашборд</h1>
          <p style={s.sub}>Аналитика обучения и тестирования сотрудников</p>
        </div>
        <button onClick={fetchAll} style={s.refreshBtn}>↻ Обновить</button>
      </div>

      {/* Фильтры по дате */}
      <div style={s.filtersBar}>
        <span style={s.filterLabel}>Период:</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={s.dateInput} />
        <span style={{ color: '#6b7280' }}>—</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={s.dateInput} />
        <button onClick={() => { setDateFrom(''); setDateTo('') }} style={s.resetBtn}>Сбросить</button>
        <div style={s.filterSep} />
        <span style={s.filterLabel}>Динамика:</span>
        {['all', 'week'].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ ...s.periodBtn, ...(period === p ? s.periodBtnActive : {}) }}>
            {p === 'all' ? 'По дням' : 'По неделям'}
          </button>
        ))}
      </div>

      {/* ── Сотрудники ── */}
      <div style={s.sectionTitle}>👥 Сотрудники</div>
      <div style={s.kpiRow}>
        <KpiCard icon="👥" value={totalEmployees} label="Всего сотрудников" color="#c9a84c" />
        <KpiCard icon="📝" value={testStarted} label="Приступили к тесту" color="#4c8ce0"
          sub={`${testPctOfTotal}% от общего числа`} />
        <KpiCard icon="✅" value={testPassed} label="Прошли тест" color="#4caf7d"
          sub={`${testPassRate}% от сдававших`} />
        <KpiCard icon="❌" value={testFailed} label="Не прошли тест" color="#e05555" />
        <KpiCard icon="⏳" value={testStartedOnly} label="В процессе" color="#9b6fe0" />
      </div>

      {/* ── Разбивка по должностям ── */}
      <div style={s.row2}>
        <div style={s.card}>
          <div style={s.cardTitle}>Разбивка по должностям</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={positionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {positionData.map((_, i) => <Cell key={i} fill={['#c9a84c', '#4c8ce0', '#4caf7d', '#9b6fe0', '#e05555'][i % 5]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>Статус теста</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={[
                { name: 'Пройден', value: testPassed },
                { name: 'Не пройден', value: testFailed },
                { name: 'В процессе', value: testStartedOnly },
              ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}>
                <Cell fill="#4caf7d" />
                <Cell fill="#e05555" />
                <Cell fill="#4c8ce0" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Курсы ── */}
      {courseStats.length > 0 && (
        <>
          <div style={s.sectionTitle}>🎓 Курсы</div>
          <div style={s.kpiRow}>
            {courseStats.map(c => (
              <div key={c.name} style={s.courseCard}>
                <div style={s.courseCardTitle}>{c.name}</div>
                <div style={s.courseRow}>
                  <span style={s.courseLabel}>Приступили</span>
                  <span style={{ ...s.courseVal, color: '#4c8ce0' }}>{c.started} <small>({c.startedPct}%)</small></span>
                </div>
                <div style={s.courseRow}>
                  <span style={s.courseLabel}>Завершили</span>
                  <span style={{ ...s.courseVal, color: '#4caf7d' }}>{c.completed} <small>({c.completedPct}%)</small></span>
                </div>
                <div style={s.courseRow}>
                  <span style={s.courseLabel}>Не завершили</span>
                  <span style={{ ...s.courseVal, color: '#e05555' }}>{c.failed}</span>
                </div>
                <div style={s.progressBar}>
                  <div style={{ ...s.progressFill, width: `${c.completedPct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Динамика ── */}
      <div style={s.sectionTitle}>📈 Динамика прохождения теста</div>
      <div style={s.card}>
        <div style={s.cardTitle}>
          {period === 'week' ? 'По неделям' : 'По дням'} — кол-во попыток
        </div>
        {dynamicsData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dynamicsData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2533" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} angle={-35} textAnchor="end" />
              <YAxis tick={{ fill: '#6b7280' }} />
              <Tooltip contentStyle={{ background: '#111318', border: '1px solid #1f2533', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="passed" name="Пройден" fill="#4caf7d" stackId="a" radius={[0,0,0,0]} />
              <Bar dataKey="failed" name="Не пройден" fill="#e05555" stackId="a" />
              <Bar dataKey="started" name="В процессе" fill="#4c8ce0" stackId="a" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={s.noData}>Нет данных за выбранный период</div>
        )}
      </div>

      {/* ── Линейный тренд ── */}
      {dynamicsData.length > 1 && (
        <div style={s.card}>
          <div style={s.cardTitle}>Тренд — % прошедших</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dynamicsData.map(d => ({
              ...d,
              passRate: d.total ? Math.round(d.passed / d.total * 100) : 0
            }))} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2533" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} angle={-35} textAnchor="end" />
              <YAxis tick={{ fill: '#6b7280' }} domain={[0, 100]} tickFormatter={v => v + '%'} />
              <Tooltip contentStyle={{ background: '#111318', border: '1px solid #1f2533', borderRadius: '8px' }} formatter={v => v + '%'} />
              <Line type="monotone" dataKey="passRate" name="% прошли" stroke="#c9a84c" strokeWidth={2} dot={{ fill: '#c9a84c', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Таблица по должностям ── */}
      <div style={s.sectionTitle}>📊 Результаты по должностям</div>
      <div style={s.card}>
        <table style={s.table}>
          <thead>
            <tr>
              {['Должность', 'Всего', 'Приступили к тесту', '% от должности', 'Прошли', '% прошли'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(byPosition).map(([pos, total]) => {
              const posTests = filteredTests.filter(r => {
                const emp = employees.find(e => e.id === r.employee_id)
                return emp?.position === pos
              })
              const posStarted = new Set(posTests.map(r => r.employee_id)).size
              const posPassed = posTests.filter(r => r.status === 'passed').length
              return (
                <tr key={pos} style={s.tr}>
                  <td style={s.td}>{pos}</td>
                  <td style={s.td}>{total}</td>
                  <td style={s.td}>{posStarted}</td>
                  <td style={s.td}>{total ? Math.round(posStarted / total * 100) : 0}%</td>
                  <td style={{ ...s.td, color: '#4caf7d' }}>{posPassed}</td>
                  <td style={s.td}>{posStarted ? Math.round(posPassed / posTests.length * 100) : 0}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}

function KpiCard({ icon, value, label, color, sub }) {
  return (
    <div style={s.kpiCard}>
      <span style={s.kpiIcon}>{icon}</span>
      <div style={{ ...s.kpiValue, color }}>{value}</div>
      <div style={s.kpiLabel}>{label}</div>
      {sub && <div style={s.kpiSub}>{sub}</div>}
    </div>
  )
}

const s = {
  pageHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: '800', marginBottom: '4px' },
  sub: { color: '#6b7280', fontSize: '14px' },
  refreshBtn: { background: 'transparent', border: '1px solid #1f2533', color: '#6b7280', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' },
  filtersBar: { background: '#111318', border: '1px solid #1f2533', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' },
  filterLabel: { fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' },
  dateInput: { background: '#181c24', border: '1px solid #1f2533', color: '#e8eaf0', borderRadius: '6px', padding: '5px 9px', fontSize: '13px', outline: 'none' },
  resetBtn: { background: 'transparent', border: '1px solid #1f2533', color: '#6b7280', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px' },
  filterSep: { width: '1px', height: '20px', background: '#1f2533' },
  periodBtn: { background: 'transparent', border: '1px solid #1f2533', color: '#6b7280', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontSize: '12px' },
  periodBtnActive: { background: 'rgba(201,168,76,0.1)', border: '1px solid #c9a84c', color: '#c9a84c' },
  sectionTitle: { fontFamily: 'monospace', fontSize: '11px', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '12px', marginTop: '28px', display: 'flex', alignItems: 'center', gap: '10px' },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px', marginBottom: '16px' },
  kpiCard: { background: '#111318', border: '1px solid #1f2533', borderRadius: '12px', padding: '18px' },
  kpiIcon: { fontSize: '20px', display: 'block', marginBottom: '10px' },
  kpiValue: { fontFamily: 'monospace', fontSize: '28px', fontWeight: '800', lineHeight: 1, marginBottom: '5px' },
  kpiLabel: { fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' },
  kpiSub: { fontSize: '11px', color: '#4c8ce0', marginTop: '4px' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' },
  card: { background: '#111318', border: '1px solid #1f2533', borderRadius: '12px', padding: '20px', marginBottom: '14px' },
  cardTitle: { fontFamily: 'monospace', fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#e8eaf0', marginBottom: '16px' },
  courseCard: { background: '#111318', border: '1px solid #1f2533', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '8px' },
  courseCardTitle: { fontWeight: '700', fontSize: '14px', marginBottom: '4px' },
  courseRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  courseLabel: { fontSize: '12px', color: '#6b7280' },
  courseVal: { fontSize: '14px', fontWeight: '600' },
  progressBar: { height: '4px', background: '#1f2533', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' },
  progressFill: { height: '100%', background: '#4caf7d', borderRadius: '2px', transition: 'width 0.5s ease' },
  noData: { color: '#6b7280', textAlign: 'center', padding: '40px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { padding: '10px 12px', textAlign: 'left', fontFamily: 'monospace', fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b7280', borderBottom: '1px solid #1f2533', background: '#181c24' },
  td: { padding: '10px 12px', borderBottom: '1px solid rgba(31,37,51,0.5)', color: '#e8eaf0' },
  tr: {},
}