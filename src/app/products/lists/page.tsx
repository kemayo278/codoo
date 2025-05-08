'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProductList } from '@/components/Products/List/ProductList'
import { AddProduct } from '@/components/Products/Form/AddProduct'
import { DashboardLayout } from "@/components/Shared/Layout/DashboardLayout"
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout'
import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/Shared/ui/LoadingSpinner'

export default function ProductsPage() {
  const [view, setView] = useState<'list' | 'add'>('list')
  const { isAuthenticated, business } = useAuthLayout()
  const router = useRouter()
  
  // Add business ID check
  if (!business?.id) {
    return (
      <LoadingSpinner/>
    );
  }

  const handleAddProduct = () => {
    setView('add')
  }

  const handleBackToList = () => {
    setView('list')
  }

  const content: ReactNode = (
    <div className="container mx-auto p-6">
      {view === 'list' && (
        <ProductList onAddProduct={handleAddProduct} />
      )}

      {view === 'add' && (
        <AddProduct onBack={handleBackToList} />
      )}
    </div>
  )

  return <DashboardLayout>{content}</DashboardLayout>
}
