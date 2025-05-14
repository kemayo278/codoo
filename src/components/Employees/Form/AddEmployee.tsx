'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { ChevronLeft } from "lucide-react"
import { roles } from '../Lib/constants'
import { Employee } from "@/types/employee"
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout";
import { Checkbox } from "@/components/Shared/ui/checkbox"
import AxiosClient from "@/lib/axiosClient"
import { ButtonSpinner } from "@/components/Shared/ui/ButtonSpinner"

interface AddEditEmployeeProps {
  onBack: () => void;
  onSave: (employee: Employee) => void;
  employee: Employee | null;
  isEdit: boolean;
}

interface EmployeeResponse {
  success: boolean;
  employee?: Employee;
  message?: string;
}

export function AddEditEmployee({ onBack, onSave, employee, isEdit }: AddEditEmployeeProps) {
  const { business, user, availableShops, currentShop } = useAuthLayout();

  useEffect(() => {
    if (!['admin', 'shop_owner', 'manager'].includes(user?.role || '')) {
      toast({
        title: "Unauthorized",
        description: "You do not have permission to access this page.",
        variant: "destructive",
      });
      onBack();
    }
  }, [user, onBack]);

  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    email: employee?.user?.email || '',
    phone: employee?.phone || '',
    role: employee?.role || 'seller',
    employmentStatus: employee?.employmentStatus || 'full-time',
    salary: employee?.salary || 0,
    shopId: currentShop?.id || '',
    username: employee?.user?.username || '',
    password_hash: '',
    businessId: business?.id || '',
  });

  // Add state for password update
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);
  const [passwordUpdate, setPasswordUpdate] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.role || !formData.salary) {
      toast({title: "Error", description: "All fields are required", variant: "destructive"});
      return;
    }

    if (showPasswordUpdate) {
      if (passwordUpdate.newPassword !== passwordUpdate.confirmPassword) {
        toast({title: "Error", description: "Passwords do not match", variant: "destructive"});
        return;
      }
    }

    try {
      if (!formData.businessId) {
        toast({title: "Error", description: "Business information is missing", variant: "destructive"});
        return;
      }

      if (!formData.shopId) {
        toast({title: "Error", description: "Please select a shop", variant: "destructive"});
        return;
      }

      setIsLoading(true);

      if (isEdit && employee) {
        const updates = {
          _method : "PUT",
          // username: formData.username,
          email: formData.email,
          password : formData.password_hash,
          role: formData.role,
          employment_status : formData.employmentStatus,
          salary: formData.salary,
          phone: formData.phone,
          first_name : formData.firstName,
          last_name : formData.lastName,    
          ...(showPasswordUpdate && {
            password : passwordUpdate.newPassword
          })
        };

        const { data, success } = (await AxiosClient.post(`/employees/${employee.id}`, updates)).data;

        if (success && data?.employee) {
          toast({title: "Success", description: "Employee updated successfully"});
          onSave(data?.employee);
        }
      } else {
        if (!formData.username || !formData.password_hash) {
          toast({title: "Error", description: "Username and password are required", variant: "destructive"});
          return;
        }     
        if (formData.username.length < 3) {
          toast({title: "Error", description: "Username must be at least 3 characters long", variant: "destructive"});
          return;
        }
        if (formData.password_hash.length < 6) {
          toast({title: "Error", description: "Password must be at least 6 characters long", variant: "destructive"});
          return;
        }

        const userPayload = {
          username: formData.username,
          email: formData.email,
          password : formData.password_hash,
          role: formData.role,
          shop_id : currentShop?.id,
          business_id : business?.id,
          is_staff : true,
        }

        const { data, success } = (await AxiosClient.post("/auth/register", userPayload)).data;
        
        if(!success) {
          toast({title: "Error", description: "Failed to create user account", variant: "destructive"});
        }

        const employeePayload = {
          user_id : data.user.id,
          shop_id : formData.shopId,
          role: formData.role,
          employment_status : formData.employmentStatus,
          salary: formData.salary,
          phone: formData.phone,
          first_name : formData.firstName,
          last_name : formData.lastName,
          email: formData.email,
        }

        const { success: successEmployee, data: dataEmployee } = (await AxiosClient.post("/employees", employeePayload)).data;
  
        if (!successEmployee) {
          toast({title: "Error", description: "Failed to create employee", variant: "destructive"});
          throw new Error("Failed to create employee");
        }

        if (successEmployee) {
          onSave(dataEmployee.employee);
          toast({ title: "Success", description: "Employee created successfully", });
        }
      }
    } catch (err: any) {
      const response = err?.response;
      let message = isEdit ? "Failed to update employee" : "Failed to create employee";
      if(err && err.message === 'Network Error') {
        message = process.env.NEXT_PUBLIC_ERROR_CONNECTION as string;
      }else{
        message = response?.data?.error || isEdit ? "Failed to update employee" : "Failed to create employee";
      }      
      toast({ title: "Error", description: message, variant: "destructive"});   
    }finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ChevronLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{isEdit ? 'Edit Employee' : 'Add Employee'}</h1>
        <div className="flex space-x-2">
          <Button variant="outline" className="mr-2" onClick={onBack}>Cancel</Button>
          <Button className="bg-[#2D70FD]" disabled={isLoading} onClick={handleSubmit}>
            {isLoading ? ( <ButtonSpinner/> ) : ( isEdit ? "Save Changes" : "Create" )}
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Employee Information</CardTitle>
          <p className="text-sm text-gray-500">Fill in the employee details</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-medium">Basic Information</h3>
              <label>
                First Name
                <Input
                  placeholder="Enter the first name"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </label>
              <label>
                Last Name
                <Input
                  placeholder="Enter the last name"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </label>
              <label>
                Email Address
                <Input
                  type="email"
                  placeholder="Enter the email address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </label>
              <label>
                Phone Number
                <Input
                  placeholder="Enter the phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </label>
            </div>

            {/* Employment Details */}
            <div className="space-y-4">
              <h3 className="font-medium">Employment Details</h3>
              <label>
                Role
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label>
                Employment Status
                <Select
                  value={formData.employmentStatus}
                  onValueChange={(value: any) => setFormData({ ...formData, employmentStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Employment Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full Time</SelectItem>
                    <SelectItem value="part-time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label>
                Salary
                <Input
                  type="number"
                  placeholder="Enter the salary"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                />
              </label>
            </div>

            {/* Account Credentials - Only show for new employees */}
            {!isEdit && (
              <div className="space-y-4">
                <h3 className="font-medium">Account Credentials</h3>
                <label>
                  Username
                  <Input
                    placeholder="Enter a username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </label>
                <label>
                  Password
                  <Input
                    type="password"
                    placeholder="Enter a password"
                    value={formData.password_hash}
                    onChange={(e) => setFormData({ ...formData, password_hash: e.target.value })}
                  />
                </label>
              </div>
            )}

            {/* Password Update Section */}
            {isEdit && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium">Update Password</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPasswordUpdate(!showPasswordUpdate)}
                  >
                    {showPasswordUpdate ? 'Cancel' : 'Change Password'}
                  </Button>
                </div>

                {showPasswordUpdate && (
                  <>
                    <label>
                      New Password
                      <Input
                        type="password"
                        value={passwordUpdate.newPassword}
                        onChange={(e) => setPasswordUpdate({
                          ...passwordUpdate,
                          newPassword: e.target.value
                        })}
                      />
                    </label>
                    <label>
                      Confirm Password
                      <Input
                        type="password"
                        value={passwordUpdate.confirmPassword}
                        onChange={(e) => setPasswordUpdate({
                          ...passwordUpdate,
                          confirmPassword: e.target.value
                        })}
                      />
                    </label>
                  </>
                )}
              </div>
            )}  
          </div>
        </CardContent>
      </Card>
    </>
  );
}
