import Categories from '@/components/Products/Categories/categories'
import { DashboardLayout } from '@/components/Shared/Layout/DashboardLayout'

// ✅ Page serveur par défaut — PAS de 'use client' ici
export default function ProductInventoryPage() {
  return (
    <DashboardLayout>
      <Categories />
    </DashboardLayout>
  )
}
