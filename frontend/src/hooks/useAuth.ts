import { useCurrentUser } from '../api/auth'
import { UserRole } from '../types'

export function useAuth() {
  const { data: user, isLoading, error } = useCurrentUser()

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    isSecTeam: user?.role === UserRole.sec_team || user?.is_sec_team === true,
    namespaces: user?.namespaces ?? [],
    hasNamespaces: (user?.namespaces?.length ?? 0) > 0,
  }
}
