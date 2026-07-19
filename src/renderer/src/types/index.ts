export interface User {
  id: string
  username: string
  role: 'master' | 'staff'
  fullName: string
}

export interface AuthStore {
  session: string | null
  user: User | null
  isFirstRun: boolean
  setSession: (session: string, user: User) => void
  clearSession: () => void
  setFirstRun: (v: boolean) => void
}

export interface Project {
  id: string
  name: string
  location: string
  description: string
  theme_color: string
  logo_path: string | null
  is_active: number
  created_at: string
  updated_at: string
  total_plots: number
  available_plots: number
  sold_plots: number
  reserved_plots: number
  transferred_plots: number
}

export interface Plot {
  id: string
  project_id: string
  plot_number: string
  block: string
  street: string
  size_marla: number
  size_sqft: number
  plot_type: string
  price: number
  width_ft?: number
  length_ft?: number
  status: 'Available' | 'Reserved' | 'Sold' | 'Transferred'
  notes: string
  created_at: string
  updated_at: string
  current_owner_name?: string
  ownership_count?: number
  doc_count?: number
  payment_count?: number
}

export interface Buyer {
  id: string
  full_name: string
  father_husband_name: string
  cnic: string
  phone_primary: string
  phone_secondary: string
  email: string
  address: string
  city: string
  photo_path: string | null
  notes: string
  created_at: string
  plot_count?: number
}

export interface OwnershipRecord {
  id: string
  plot_id: string
  buyer_id: string
  transfer_date: string
  transfer_price: number
  sequence_number: number
  transfer_type: string
  notes: string
  created_at: string
  buyer_name?: string
  cnic?: string
  authorized_by_username?: string
}

export interface Document {
  id: string
  plot_id: string | null
  buyer_id: string | null
  doc_type: string
  original_name: string
  mime_type: string
  file_size: number
  created_at: string
  uploaded_by_username?: string
}

export interface Payment {
  id: string
  plot_id: string
  buyer_id: string
  amount: number
  payment_date: string
  payment_method: string
  reference_number: string
  notes: string
  created_at: string
  buyer_name?: string
}

export interface AuditLog {
  id: number
  action: string
  entity_type: string
  entity_id: string
  user_id: string
  details: string
  entry_hash: string
  created_at: string
  username?: string
}

export interface DashboardStats {
  totalProjects: number
  totalPlots: number
  totalBuyers: number
  totalTransfers: number
  totalDocuments: number
  recentActivity: AuditLog[]
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}
