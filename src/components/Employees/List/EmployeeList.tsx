/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/Shared/ui/table"
import { Avatar, AvatarFallback } from "@/components/Shared/ui/avatar"
import { Badge } from "@/components/Shared/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import { Search, Edit, Trash2 } from "lucide-react"
import { Employee } from "@/types/employee"
import { UserAttributes } from "@/models/User";
import { safeIpcInvoke } from '@/lib/ipc';
import { Toast, ToastProvider, ToastViewport } from '@/components/Shared/ui/toast';
import {toast} from '@/hooks/use-toast';
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout";
import { EmptyState } from '../Empty/EmptyState'
import { ConfirmationDialog } from '@/components/Shared/ui/Modal/confirmation-dialog'
import { LoadingSpinner } from "@/components/Shared/ui/LoadingSpinner"
import AxiosClient from "@/lib/axiosClient"
import ErrorAlert from "@/components/Shared/ui/ErrorAlert"
import LoadingIndicator from "@/components/Shared/ui/LoadingIndicator"

interface EmployeeListProps {
  onEmployeeClick: (employee: Employee) => void;
  onAddEmployee: () => void;
  onEditEmployee: (employee: Employee) => void;
}

const roles: UserAttributes['role'][] = ['shop_owner', 'manager', 'seller', 'admin'];

export function EmployeeList({ onEmployeeClick, onAddEmployee, onEditEmployee }: EmployeeListProps) {
  const { business, user, availableShops } = useAuthLayout();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const fetchEmployees = async () => {
    setError(null)
    setLoading(true)
    let url = "/employees";
    AxiosClient.get(url).then((response) => {
      const { success, data } = response.data
      if (success && data?.employees) {
        setEmployees(data.employees)
      }
    }).catch((err: any) => {
      let message = 'Error loading employees';
      if(err && err.message === 'Network Error') {
        message = 'Network Error, please check your connection';
      }else{
        message = 'Error loading employees';
      }
      setError(message);
    }).finally(() => {
      setLoading(false)
    })
  };

  const handleDeleteEmployee = async () => {
    try {
      if (!employeeToDelete) return;
  
      const response = await AxiosClient.delete(`/employees/${employeeToDelete.id}`);
      const { success } = response.data;
  
      if (success) {
        setEmployees(prev => prev.filter(emp => emp.id !== employeeToDelete.id));
        toast({ title: "Success", description: "Employee deleted successfully" });
      }
    } catch (err: any) {
      const response = err?.response;
      let message = "Failed to delete Employee";
      if(err && err.message === 'Network Error') {
        message = process.env.NEXT_PUBLIC_ERROR_CONNECTION as string;
      }else{
        message = response?.data?.error || "Failed to delete Employee";
      }      
      toast({ title: "Error", description: message, variant: "destructive"});      
    } finally {
      setEmployeeToDelete(null);
    }
  };

  const handleUpdateStatus = async (employeeId: string, isActive: boolean) => {
    try {
      const response = await safeIpcInvoke('entities:employee:update', {
        id: employeeId,
        updates: { isActive }
      }, { success: false });

      if (response?.success) {
        return (
          <ToastProvider>
            <Toast>
              Success: Employee status updated successfully
            </Toast>
            <ToastViewport />
          </ToastProvider>
        )
      } else {
        return (
          <ToastProvider>
            <Toast variant="destructive">
              Error: Failed to update employee status
            </Toast>
            <ToastViewport />
          </ToastProvider>
        )
      }
    } catch (error) {
      return (
        <ToastProvider>
          <Toast variant="destructive">
            Error: {error instanceof Error ? error.message : 'Unknown error'}
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
    }
  };

  useEffect(() => {
    if (business?.id) {
      fetchEmployees();
    }
  }, [business?.id]);

  const handleEmployeeClick = (employee: Employee) => {
    onEmployeeClick(employee)
  }

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-[#E8FFF3] text-[#03A734]'
      case 'seller':
        return 'bg-[#EEF2FF] text-[#3F5BF6]'
      case 'manager':
        return 'bg-[#FFF4ED] text-[#FF8E29]'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Add filtering logic
  const filteredEmployees = employees.filter(employee => {
    // Search term matching
    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch = searchTerm.trim() === '' ? true : (
      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchLower) ||
      employee.phone?.toLowerCase().includes(searchLower) ||
      (employee.user?.role || employee.role)?.toLowerCase().includes(searchLower)
    );

    // Role filtering
    const matchesRole = filterRole === 'all' || 
      (employee.user?.role || employee.role)?.toLowerCase() === filterRole.toLowerCase();

    return matchesSearch && matchesRole;
  });

  if (!['admin', 'shop_owner', 'manager'].includes(user?.role || '')) {
    return (
      <div className="p-4 text-center text-red-500">
        You don't have permission to view this page
      </div>
    );
  }

  if (loading) {
    return (
      <LoadingIndicator title="Loading employees..." subtitle="This may take a few moments" />  
    );
  }

  if (error) {
    return (
      <ErrorAlert
        title="Error"
        message={error}
        onRetry={() => {
          setError(null);
          fetchEmployees();
        }}
      />      
    );
  }

  return (
    <div className="container mx-auto p-6">
      {employees.length === 0 && !loading ? (
        <EmptyState onAddEmployee={onAddEmployee} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">Employees</h1>
            <div className="space-x-2">
              <Button variant="outline" className="text-[#2D70FD] border-[#2D70FD]">Export</Button>
              <Button onClick={onAddEmployee} className="bg-[#2D70FD]">Add Employee</Button>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>All Employees</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto">
              <div className="flex flex-col md:flex-row justify-between mb-4">
                <Select
                  value={filterRole}
                  onValueChange={setFilterRole}
                >
                  <SelectTrigger className="w-full md:w-[180px] mb-2 md:mb-0">
                    <SelectValue placeholder="Filter Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role?.toLowerCase() ?? 'shop_owner'}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative w-full md:w-[300px]">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Search..." 
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <p className="mb-2">No employees found</p>
                            <p className="text-sm text-gray-400">
                              Try adjusting your search or filter criteria
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.map((employee) => (
                        <TableRow key={employee.id} onClick={() => handleEmployeeClick(employee)} className="cursor-pointer">
                          <TableCell>
                            <Checkbox onClick={(e) => e.stopPropagation()} />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-3">
                              <Avatar className="bg-[#EEF2FF] text-[#3F5BF6]">
                                <AvatarFallback>{employee.firstName[0]}{employee.lastName[0]}</AvatarFallback>
                              </Avatar>
                              <span>{employee.firstName} {employee.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell>{employee.phone}</TableCell>
                          <TableCell>
                            <Badge className={`font-medium ${getRoleColor(employee.user?.role || employee.role)}`}>
                              {employee.user?.role || employee.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditEmployee(employee);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEmployeeToDelete(employee);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <ConfirmationDialog
            isOpen={!!employeeToDelete}
            onClose={() => setEmployeeToDelete(null)}
            onConfirm={handleDeleteEmployee}
            title="Delete Employee"
            description={`Are you sure you want to delete ${employeeToDelete?.firstName} ${employeeToDelete?.lastName}? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            variant="destructive"
          />
        </>
      )}
    </div>
  )
}
