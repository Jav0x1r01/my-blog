import React, { createContext, useState, useContext, useEffect } from 'react'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const login = (newToken) => {
    setToken(newToken)
    localStorage.setItem('token', newToken)
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
  }

  // Token ni tekshirish
  const validateToken = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const isExpired = payload.exp * 1000 < Date.now()
      return !isExpired
    } catch (error) {
      return false
    }
  }

  useEffect(() => {
    if (token) {
      if (validateToken(token)) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            // store payload as object so components can access payload.username
            setUser(payload)
        } catch (error) {
          console.error('Token decode error:', error)
          logout()
        }
      } else {
        console.log('Token expired, logging out...')
        logout()
      }
    }
    setLoading(false)
  }, [token])

  const value = {
    token,
    user,
    login,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}