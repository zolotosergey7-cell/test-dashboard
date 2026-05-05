import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useRole() {
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      setRole(data?.role || 'viewer')
      setLoading(false)
    }
    fetchRole()
  }, [])

  return { role, loading }
}