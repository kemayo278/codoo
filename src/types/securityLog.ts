import { Shop } from "./Shop"
import { User } from "./User"

export interface SecurityLog {
  id: string
  eventType: string
  eventDescription?: string
  ipAddress?: string
  userAgent?: string
  severity?: string
  status: string
  additionalData?: Record<string, any>
  userId: string
  shopId: string
  shop?: Shop
  user?: User
  createdAt: string
  updatedAt: string
}
