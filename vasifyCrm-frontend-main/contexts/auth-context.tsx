"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@/types/crm"
import { authApi, getAuthToken } from "@/lib/api"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  authError: string | null

  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  register: (userData: {
    name: string
    email: string
    password: string
    role?: string
  }) => Promise<boolean>
  updateProfile: (userData: Partial<User>) => Promise<boolean>
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>

  // convenience flags
  isAdmin: boolean
  isUser: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken()
      if (token) {
        try {
          const response = await authApi.verifyToken()
          if (response.valid && response.user) {
            // response.user already includes role from backend
            setUser(response.user)
          } else {
            authApi.logout()
            setUser(null)
          }
        } catch (error) {
          console.error("Token verification failed:", error)
          authApi.logout()
          setUser(null)
        }
      }
      setIsLoading(false)
    }

    void initAuth()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    setAuthError(null)

    try {
      const response = await authApi.login(email, password)
      if (response.user) {
        setUser(response.user)
        setIsLoading(false)
        return true
      }
      setAuthError("Invalid email or password.")
    } catch (error) {
      console.error("Login failed:", error)
      setAuthError("Login failed. Please try again.")
    }

    setIsLoading(false)
    return false
  }

  const register = async (userData: {
    name: string
    email: string
    password: string
    role?: string
  }): Promise<boolean> => {
    setIsLoading(true)
    setAuthError(null)

    try {
      const response = await authApi.register(userData)
      if (response.user) {
        setUser(response.user)
        setIsLoading(false)
        return true
      }
      setAuthError("Registration failed. Please check your details.")
    } catch (error) {
      console.error("Registration failed:", error)
      setAuthError("Registration failed. Please try again.")
    }

    setIsLoading(false)
    return false
  }

  const updateProfile = async (userData: Partial<User>): Promise<boolean> => {
    setAuthError(null)

    try {
      const response = await authApi.updateProfile(userData)
      if (response.user) {
        setUser(response.user)
        return true
      }
      setAuthError("Profile update failed.")
    } catch (error) {
      console.error("Profile update failed:", error)
      setAuthError("Profile update failed. Please try again.")
    }
    return false
  }

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> => {
    setAuthError(null)

    try {
      await authApi.changePassword(currentPassword, newPassword)
      return true
    } catch (error) {
      console.error("Password change failed:", error)
      setAuthError("Password change failed. Please check your current password.")
    }
    return false
  }

  const logout = () => {
    authApi.logout()
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    isLoading,
    authError,
    login,
    logout,
    register,
    updateProfile,
    changePassword,
    isAdmin: !!user && user.role === "admin",
    isUser: !!user && user.role === "user",
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
