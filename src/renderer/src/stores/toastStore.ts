import { create } from 'zustand'
import type { Toast } from '../types'
import { v4 as uuidv4 } from 'uuid'

interface ToastStore {
  toasts: Toast[]
  addToast: (type: Toast['type'], message: string) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (type, message) => {
    const id = uuidv4()
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) }))
    }, 4000)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) }))
}))

export const toast = {
  success: (msg: string) => useToastStore.getState().addToast('success', msg),
  error:   (msg: string) => useToastStore.getState().addToast('error', msg),
  info:    (msg: string) => useToastStore.getState().addToast('info', msg)
}
