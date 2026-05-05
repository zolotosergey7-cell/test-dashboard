import { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'

export default function UploadPage() {
  const [empStatus, setEmpStatus] = useState(null)
  const [empLoading, setEmpLoading] = useState(false)
  const [resultsStatus, setResultsStatus] = useState(null)
  const [resultsLoading, setResultsLoading] = useState(false)

  // ── Загрузка сотрудников ──────────────────────────────────────────────────
  const handleEmployees = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setEmpLoading(true)
    setEmpStatus(null)

    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])

      if (!rows.length) throw new Error('Файл пустой')

      // Ожидаемые колонки: ФИО, Должность, ТД, Филиал, Объект
      const employees = rows.map(r => ({
        full_name: r['ФИО'] || r['full_name'] || '',
        position: r['Должность'] || r['position'] || '',
        td: r['ТД'] || r['td'] || '',
        branch: r['Филиал'] || r['branch'] || '',
        object: r['Объект'] || r['object'] || '',
      })).filter(e => e.full_name)

      if (!employees.length) throw new Error('Не найдена колонка "ФИО"')

      // Upsert по full_name — обновляем если уже есть
       const { error } = await supabase
      .from('employees')
       .insert(employees)

      if (error) throw error

      setEmpStatus({ type: 'success', text: `Загружено ${employees.length} сотрудников` })
    } catch (err) {
      setEmpStatus({ type: 'error', text: err.message })
    }

    setEmpLoading(false)
    e.target.value = ''
  }

  // ── Загрузка результатов теста ────────────────────────────────────────────
  const handleTestResults = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setResultsLoading(true)
    setResultsStatus(null)

    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { cellDates: true })
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])

      if (!rows.length) throw new Error('Файл пустой')

      // Получаем всех сотрудников для сопоставления по имени
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, full_name')

      if (empError) throw empError

      const empMap = {}
      employees.forEach(e => { empMap[e.full_name.trim().toLowerCase()] = e.id })

      const toInsert = []
      const notFound = []

      rows.forEach(r => {
        const name = (r['Пользователь'] || r['ФИО'] || r['full_name'] || '').trim()
        const empId = empMap[name.toLowerCase()]

        if (!empId) { notFound.push(name); return }

        const statusRaw = (r['Статус'] || r['status'] || '').toLowerCase()
        let status = 'started'
        if (statusRaw.includes('пройден') && !statusRaw.includes('не')) status = 'passed'
        else if (statusRaw.includes('не пройден') || statusRaw.includes('failed')) status = 'failed'
        else if (statusRaw.includes('приступил') || statusRaw.includes('started')) status = 'started'

        const dateRaw = r['Дата'] || r['date'] || r['Дата прохождения']
        let attempt_date = null
        if (dateRaw) {
          if (dateRaw instanceof Date) {
            attempt_date = dateRaw.toISOString().split('T')[0]
          } else {
            const parts = String(dateRaw).split(/[.\s]/)[0].split('.')
            if (parts.length >= 3) attempt_date = `${parts[2]}-${parts[1]}-${parts[0]}`
          }
        }
        if (!attempt_date) attempt_date = new Date().toISOString().split('T')[0]

        toInsert.push({
          employee_id: empId,
          status,
          score: parseFloat(r['Баллы'] || r['score'] || r['Результат'] || 0) || null,
          attempt_date,
        })
      })

      if (!toInsert.length) throw new Error(`Нет данных для загрузки. Не найдены сотрудники: ${notFound.slice(0,3).join(', ')}`)

      const { error } = await supabase.from('test_results').insert(toInsert)
      if (error) throw error

      let msg = `Загружено ${toInsert.length} результатов`
      if (notFound.length) msg += `. Не найдено в базе: ${notFound.length} чел.`
      setResultsStatus({ type: 'success', text: msg })
    } catch (err) {
      setResultsStatus({ type: 'error', text: err.message })
    }

    setResultsLoading(false)
    e.target.value = ''
  }

  // ── Загрузка результатов курсов ───────────────────────────────────────────
  const handleCourseResults = async (e, courseName) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { cellDates: true })
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])

      const { data: employees } = await supabase.from('employees').select('id, full_name')
      const empMap = {}
      employees.forEach(e => { empMap[e.full_name.trim().toLowerCase()] = e.id })

      const toInsert = []
      rows.forEach(r => {
        const name = (r['Пользователь'] || r['ФИО'] || '').trim()
        const empId = empMap[name.toLowerCase()]
        if (!empId) return

        const statusRaw = (r['Статус'] || '').toLowerCase()
        let status = 'started'
        if (statusRaw.includes('завершен') || statusRaw.includes('completed') || statusRaw.includes('пройден')) status = 'completed'
        else if (statusRaw.includes('не') || statusRaw.includes('failed')) status = 'failed'

        const dateRaw = r['Дата'] || r['date']
        let progress_date = new Date().toISOString().split('T')[0]
        if (dateRaw instanceof Date) progress_date = dateRaw.toISOString().split('T')[0]

        toInsert.push({ employee_id: empId, course_name: courseName, status, progress_date })
      })

      const { error } = await supabase.from('courses').insert(toInsert)
      if (error) throw error

      alert(`Курс "${courseName}": загружено ${toInsert.length} записей`)
    } catch (err) {
      alert('Ошибка: ' + err.message)
    }
    e.target.value = ''
  }

  return (
    <div>
      <h1 style={s.title}>Загрузка данных</h1>
      <p style={s.sub}>Загружайте файлы Excel с результатами. Данные добавляются к существующим.</p>

      <div style={s.grid}>

        {/* Сотрудники */}
        <div style={s.card}>
          <div style={s.cardIcon}>👥</div>
          <h2 style={s.cardTitle}>Список сотрудников</h2>
          <p style={s.cardDesc}>
            Excel файл с колонками:<br />
            <code style={s.code}>ФИО, Должность, ТД, Филиал, Объект</code>
          </p>
          <label style={s.uploadBtn}>
            {empLoading ? 'Загружаем...' : '↑ Выбрать файл'}
            <input type="file" accept=".xlsx,.xls" onChange={handleEmployees} style={{ display: 'none' }} disabled={empLoading} />
          </label>
          {empStatus && <div style={{ ...s.status, ...(empStatus.type === 'error' ? s.statusErr : s.statusOk) }}>{empStatus.text}</div>}
        </div>

        {/* Тест */}
        <div style={s.card}>
          <div style={s.cardIcon}>📝</div>
          <h2 style={s.cardTitle}>Результаты теста</h2>
          <p style={s.cardDesc}>
            Excel файл с колонками:<br />
            <code style={s.code}>Пользователь, Статус, Баллы, Дата</code>
          </p>
          <label style={s.uploadBtn}>
            {resultsLoading ? 'Загружаем...' : '↑ Выбрать файл'}
            <input type="file" accept=".xlsx,.xls" onChange={handleTestResults} style={{ display: 'none' }} disabled={resultsLoading} />
          </label>
          {resultsStatus && <div style={{ ...s.status, ...(resultsStatus.type === 'error' ? s.statusErr : s.statusOk) }}>{resultsStatus.text}</div>}
        </div>

        {/* Курсы */}
        {['Курс 1', 'Курс 2', 'Курс 3'].map(course => (
          <div style={s.card} key={course}>
            <div style={s.cardIcon}>🎓</div>
            <h2 style={s.cardTitle}>Результаты: {course}</h2>
            <p style={s.cardDesc}>
              Excel файл с колонками:<br />
              <code style={s.code}>Пользователь, Статус, Дата</code>
            </p>
            <label style={s.uploadBtn}>
              ↑ Выбрать файл
              <input type="file" accept=".xlsx,.xls" onChange={(e) => handleCourseResults(e, course)} style={{ display: 'none' }} />
            </label>
          </div>
        ))}

      </div>

      {/* Формат файлов */}
      <div style={s.hint}>
        <div style={s.hintTitle}>💡 Важно</div>
        <ul style={s.hintList}>
          <li>Первая строка файла — заголовки колонок</li>
          <li>Статусы теста: <strong>Пройден</strong> / <strong>Не пройден</strong> / <strong>Приступил</strong></li>
          <li>Статусы курса: <strong>Завершен</strong> / <strong>Не завершен</strong> / <strong>Приступил</strong></li>
          <li>Сотрудники должны быть загружены до результатов — сопоставление идёт по ФИО</li>
        </ul>
      </div>
    </div>
  )
}

const s = {
  title: { fontSize: '24px', fontWeight: '800', marginBottom: '8px' },
  sub: { color: '#6b7280', fontSize: '14px', marginBottom: '32px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' },
  card: { background: '#111318', border: '1px solid #1f2533', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' },
  cardIcon: { fontSize: '28px' },
  cardTitle: { fontSize: '16px', fontWeight: '700' },
  cardDesc: { color: '#6b7280', fontSize: '13px', lineHeight: '1.6', flex: 1 },
  code: { background: '#181c24', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', color: '#c9a84c' },
  uploadBtn: { background: '#c9a84c', color: '#0a0c10', borderRadius: '8px', padding: '10px 16px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', textAlign: 'center', display: 'block' },
  status: { borderRadius: '8px', padding: '10px 14px', fontSize: '13px' },
  statusOk: { background: 'rgba(76,175,125,0.1)', border: '1px solid rgba(76,175,125,0.3)', color: '#4caf7d' },
  statusErr: { background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.3)', color: '#e05555' },
  hint: { background: '#111318', border: '1px solid #1f2533', borderRadius: '12px', padding: '20px 24px' },
  hintTitle: { fontWeight: '700', marginBottom: '12px', fontSize: '14px' },
  hintList: { color: '#6b7280', fontSize: '13px', lineHeight: '2', paddingLeft: '20px' },
}