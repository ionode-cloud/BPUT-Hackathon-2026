import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, tokenStore } from './api'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)
export const isStaff = (u) => u && (u.role === 'admin' || u.role === 'officer')

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  const logout = useCallback(() => { tokenStore.clear(); setUser(null) }, [])

  useEffect(() => {
    const onLogout = () => setUser(null)
    window.addEventListener('campuslink:logout', onLogout)
    if (tokenStore.get()) api.get('/auth/me').then(setUser).catch(() => tokenStore.clear()).finally(() => setReady(true))
    else setReady(true)
    return () => window.removeEventListener('campuslink:logout', onLogout)
  }, [])

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password })
    tokenStore.set(r.access_token)
    setUser(r.user)
    return r.user
  }

  const register = async (name, email, password, role) => {
    const r = await api.post('/auth/register', { name, email, password, role })
    tokenStore.set(r.access_token)
    setUser(r.user)
    return r.user
  }

  const registerGoogle = async (credential, role = 'student') => {
    const r = await api.post('/auth/google/register', { credential, role })
    tokenStore.set(r.access_token)
    setUser(r.user)
    return r.user
  }

  const loginGoogle = async (credential, name, role) => {
    // If only credential passed (or if legacy 3 args passed)
    let r
    if (name || role) {
      r = await api.post('/auth/google', { email: credential, name, role })
    } else {
      r = await api.post('/auth/google/login', { credential })
    }
    tokenStore.set(r.access_token)
    setUser(r.user)
    return r.user
  }

  const updateProfile = async (updates) => {
    const updatedUser = await api.put('/auth/profile', updates)
    setUser(updatedUser)
    return updatedUser
  }

  const refresh = () => api.get('/auth/me').then(setUser)

  return <AuthCtx.Provider value={{ user, ready, login, logout, refresh, register, registerGoogle, loginGoogle, updateProfile }}>{children}</AuthCtx.Provider>
}
