"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Shared/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/Shared/ui/table"
import { Avatar, AvatarFallback } from "@/components/Shared/ui/avatar"
import { Card, CardContent } from "@/components/Shared/ui/card"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import { PenIcon, TrashIcon, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/Shared/ui/dialog"
import { DeleteConfirmationModal } from '@/components/Shared/ui/Modal/delete-confrimation-modal'
import { Label } from "@/components/Shared/ui/label"
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout';
import { EmptyState } from './EmptyState'
import AxiosClient from "@/lib/axiosClient"
import { ButtonSpinner } from "@/components/Shared/ui/ButtonSpinner"
import { LoadingSpinner } from "@/components/Shared/ui/LoadingSpinner"
// Mock data
interface Customer {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  orders: number;
  spent: string;
  status : string;
  dateOfBirth?: string;
  country?: string;
  address?: string;
  city?: string;
  region?: string;
  createdAt?: string;
  updatedAt?: string;
  businessId?: string;
  shopId?: string;
  shops?: Array<{ id: string; name: string }>;
}

interface CustomerListProps {
  onCustomerClick: (customer: Customer) => void;
  onAddCustomer: () => void;
}

export function CustomerList({ onCustomerClick, onAddCustomer }: CustomerListProps) {
  const { user, business, currentShop } = useAuthLayout();
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterValue, setFilterValue] = useState("all")
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isLoadingDelete, setIsLoadingDelete] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [isloadingEdit, setIsLoadingEdit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setIsLoading(true);
    AxiosClient.get("/customers").then((response) => {
      const { success, data } = response.data
      if (success && data?.customers) {
        setCustomers(data.customers)
      }
    }).catch((err) => {
      console.error("error loading customers :", err)
      setError("error loading customers")
    }).finally(() => {
      setIsLoading(false);
    })
  }

  const handleUpdateStatus = async (customerId: string, isActive: boolean) => {
    try {
      const response = await safeIpcInvoke('entities:customer:update', {
        id: customerId,
        updates: { isActive }
      }, { success: false });

      if (response?.success) {
        toast({
          title: "Success",
          description: "Customer status updated successfully",
        });
        await fetchCustomers();
      } else {
        toast({
          title: "Error",
          description: "Failed to update customer status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating customer status:', error);
      toast({
        title: "Error",
        description: "Failed to update customer status",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [user?.id, user?.role, business?.id]);

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) || customer.phone.includes(searchQuery);
  
    const matchesShop = selectedShopId === 'all' || customer.shops?.some(shop => shop.id === selectedShopId);
  
    const matchesStatus =
      filterValue === 'all' ||
      (filterValue === 'enable' && customer.status === 'enable') ||
      (filterValue === 'disabled' && customer.status === 'disabled');
  
    return matchesSearch && matchesShop && matchesStatus;
  });
  
  const toggleCustomerSelection = (customerId: number) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    )
  }

  const handleDeleteClick = () => {
    if (selectedCustomers.length > 0) {
      // setCustomerToDelete(selectedCustomers[0])
      setIsDeleteModalOpen(true)
    }
  }

  const handleDeleteConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!customerToDelete) return;

      setIsLoadingDelete(true);

      const response = await AxiosClient.delete(`/customers/${customerToDelete.id}`);
      const { success, message } = response.data;
  
      if (success) {
        setCustomers(prev =>
          prev.filter(customer => customer.id !== customerToDelete.id)
        );
        toast({ title: "Success",description: "Customer deleted successfully" });
      }
    } catch (error: any) {
      const response = error?.response;
      const { success, message } = response?.data || {};
      toast({
        title: "Error",
        description: error instanceof Error ? message : "Failed to delete customer",
        variant: "destructive",
      });
    } finally {
      setCustomerToDelete(null);
      setIsDeleteModalOpen(false);
      setIsLoadingDelete(false);
    }
  };

  const handleEditClick = () => {
    if (selectedCustomers.length === 1) {
      const customerToEdit = customers.find(customer => customer.id === selectedCustomers[0])
      if (customerToEdit) {
        setEditingCustomer(customerToEdit)
        setIsEditModalOpen(true)
      }
    }
  }

  const handleEditSave = async (updatedCustomer: any) => {
    setIsLoadingEdit(true);
    try {
      const payload = {
        first_name: updatedCustomer.firstName.split(' ')[0],
        last_name: updatedCustomer.lastName,
        phone_number: updatedCustomer.phone,
        // date_of_birth: updatedCustomer.dateOfBirth,
        // country: updatedCustomer.country,
        // address: updatedCustomer.address,
        // city: updatedCustomer.city,
        // region: updatedCustomer.region,
        // shop_id: currentShop?.id,
        // business_id: business?.id,
      };
      
      const response = await AxiosClient.put(`/customers/${editingCustomer?.id}`, payload);
  
      const { success, data } = response.data;
  
      if (success && data?.customer) {
        const updatedCustomers = customers
          .map((customer) =>
            customer.id === editingCustomer?.id ? data.customer : customer
          )
          .filter((customer): customer is Customer => customer !== null);
  
        setCustomers(updatedCustomers);
        toast({ title: "Success", description: "Customer updated successfully"});  
        setTimeout(() => {
          handleEditModalClose();    
        }, 300);  
      }
    } catch (error: any) {
      const response = error?.response;
      const { success, message } = response?.data || {};  
      toast({
        title: "Error",
        description: error instanceof Error ? message : "Failed to update customer",
        variant: "destructive",
      });
    } finally {
      setIsLoadingEdit(false);
    }
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false)
    setEditingCustomer(null)
  }

  return (
    <div className="container mx-auto p-6">
      {isLoading ? ( 
        <LoadingSpinner />     
      ) : customers.length === 0 ? (
          <EmptyState onAddCustomer={onAddCustomer} />
      ) :
      (
        <Card className="bg-white rounded-lg shadow-sm">
          <CardContent className="p-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
              <h1 className="text-2xl font-bold">Customers</h1>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Button variant="outline" className="flex-1 sm:flex-none">Export</Button>
                <Button onClick={onAddCustomer} className="flex-1 sm:flex-none">+ Add Customer</Button>
              </div>
            </div>

            {/* Filter Section */}
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Select 
                  defaultValue="all"
                  onValueChange={setFilterValue}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter Customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="enable">Active</SelectItem>
                    <SelectItem value="disbled">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="relative flex-1">
                  <Input 
                    type="text" 
                    placeholder="Search customers..." 
                    className="pl-8 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  disabled={selectedCustomers.length !== 1}
                  className="h-10 w-10"
                >
                  <PenIcon className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  disabled={selectedCustomers.length === 0}
                  className="h-10 w-10"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>

              {(user?.role === 'admin' || user?.role === 'shop_owner') && (
                <Select
                  value={selectedShopId}
                  onValueChange={setSelectedShopId}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Shop" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shops</SelectItem>
                    {business?.shops?.map((shop: any) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        {shop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border border-gray-200">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[40px]">
                        <Checkbox 
                          checked={selectedCustomers.length === filteredCustomers.length}
                          onCheckedChange={(checked) => {
                            setSelectedCustomers(checked 
                              ? filteredCustomers.map(customer => customer.id)
                              : []
                            )
                          }}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Spent</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow 
                        key={customer.id}
                        onClick={() => onCustomerClick(customer)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <TableCell 
                          onClick={(e) => e.stopPropagation()}
                          className="relative"
                        >
                          <Checkbox
                            checked={selectedCustomers.includes(customer.id)}
                            onCheckedChange={() => toggleCustomerSelection(customer.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-3">
                            <Avatar className="bg-blue-100 text-blue-600">
                              <AvatarFallback>{customer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <span>{customer.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell>{customer.orders}</TableCell>
                        <TableCell>{customer.spent}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCustomer(customer);
                                setIsEditModalOpen(true);
                              }}
                            >
                              <PenIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCustomerToDelete(customer);
                                setIsDeleteModalOpen(true);
                              }}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Updated Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredCustomers.map((customer) => (
                <Card 
                  key={customer.id} 
                  className="overflow-hidden"
                  onClick={() => onCustomerClick(customer)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="pt-1">
                        <Checkbox
                          checked={selectedCustomers.includes(customer.id)}
                          onCheckedChange={() => toggleCustomerSelection(customer.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Avatar className="h-8 w-8 bg-blue-100 text-blue-600">
                            <AvatarFallback>{customer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium">{customer.name}</h3>
                            <p className="text-sm text-gray-500">{customer.phone}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-gray-500">{customer.orders} Orders</span>
                          <span className="font-medium">{customer.spent}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Add Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Customer</DialogTitle>
                </DialogHeader>
                {editingCustomer && (
                  <form onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    const updatedCustomer = {
                      ...editingCustomer,
                      firstName : formData.get('firstName') as string,
                      lastName  : formData.get('lastName') as string,
                      phone      : formData.get('phone') as string,
                    }
                    handleEditSave(updatedCustomer)
                  }}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="firstName" className="text-right">
                          Firstname
                        </Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          defaultValue={editingCustomer.firstName}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="lastName" className="text-right">
                          Lastname
                        </Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          defaultValue={editingCustomer.lastName}
                          className="col-span-3"
                        />
                      </div>                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">
                          Phone
                        </Label>
                        <Input
                          id="phone"
                          name="phone"
                          defaultValue={editingCustomer.phone}
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isloadingEdit}>
                        {isloadingEdit ? ( <ButtonSpinner/> ) : ( "Save changes" )}
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>

            {/* Add Delete Confirmation Modal */}
            <DeleteConfirmationModal
              title="Delete Customer"
              description="Are you sure you want to delete this customer? This action cannot be undone."
              isOpen={isDeleteModalOpen}
              onClose={() => setIsDeleteModalOpen(false)}
              onConfirm={handleDeleteConfirm}
              isLoading={isLoadingDelete}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
