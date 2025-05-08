"use client"

import { useState } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { ChevronLeft } from "lucide-react"
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import Select from 'react-select';
import countryList from 'react-select-country-list';
import { Country, State } from 'country-state-city';
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout";
import { Checkbox } from "@/components/Shared/ui/checkbox";
import AxiosClient from "@/lib/axiosClient"
import { ButtonSpinner } from "@/components/Shared/ui/ButtonSpinner"

interface AddCustomerProps {
  onBack: () => void;
}

interface CustomerFormData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: string;
  country: string;
  address: string;
  city: string;
  region: string;
}

const countries = countryList().getData();

export function AddCustomer({ onBack }: AddCustomerProps) {
  const { user, business, currentShop } = useAuthLayout();
  const [inputLoading, setInputLoading] = useState(false);
  const [formData, setFormData] = useState<CustomerFormData>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    country: '',
    address: '',
    city: '',
    region: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { firstName, lastName, phoneNumber, dateOfBirth, country, address, city, region } = formData;

    try {
      setInputLoading(true);
  
      const payload = {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        date_of_birth: dateOfBirth,
        country : country,
        address: address,
        city: city,
        region:  region,
        shop_id : currentShop?.id,
        business_id: business?.id,
      };
  
      const response = await AxiosClient.post("/customers", payload);
      const { success, data } = response.data;
  
      if (success && data?.customer) {
        toast({ title: "Success", description: "Customer created successfully"});
        onBack(); // Return to customer list
      }
    } catch (err: any) {
      const response = err?.response;
      toast({
        title: "Error",
        description: response?.data?.error || response?.data?.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setInputLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ChevronLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">Add Customer</h1>
        <div className="flex flex-col md:flex-row w-full md:w-auto">
          <div className="flex flex-col md:flex-row w-full">
            <Button type="button" variant="outline" onClick={onBack} className="mr-2 mb-2 md:mb-0 w-full md:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={inputLoading} className="w-full md:w-auto">
              {inputLoading ? ( <ButtonSpinner/> ) : ("Save")}
            </Button>
          </div>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
          <p className="text-sm text-gray-500">Most important information about the customer</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">First Name</label>
              <Input 
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full" 
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Last Name</label>
              <Input 
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full" 
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone Number</label>
              <Input 
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="w-full" 
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Date of Birth</label>
              <Input 
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="w-full" 
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Address</label>
              <Input 
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full" 
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">City</label>
              <Input 
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full" 
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Country</label>
              <Select
                options={countries}
                value={countries.find(option => option.label === formData.country)}
                onChange={(option) =>
                  setFormData(prev => ({
                    ...prev,
                    country: option?.label || '', 
                    region: ''
                  }))
                }
                isClearable
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Region</label>
              {formData.country ? (
                <Select
                  options={State.getStatesOfCountry(
                    countries.find(c => c.label === formData.country)?.value || ''
                  ).map(state => ({
                    value: state.isoCode,
                    label: state.name
                  }))}
                  value={State.getStatesOfCountry(
                    countries.find(c => c.label === formData.country)?.value || ''
                  )
                    .map(state => ({ value: state.isoCode, label: state.name }))
                    .find(option => option.label === formData.region)}
                  onChange={(option) =>
                    setFormData(prev => ({
                      ...prev,
                      region: option?.label || '' 
                    }))
                  }
                  isClearable
                />
              ) : (
                <Input
                  name="region"
                  value={formData.region}
                  onChange={handleInputChange}
                  className="w-full"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
