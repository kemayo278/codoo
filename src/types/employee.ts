import { UserAttributes } from "@/models/User";

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  hireDate: Date;
  status: 'eanble' | 'disable' | 'terminated';
  description?: string;
  shopId?: string;
  country?: string;
  address?: string;
  dateOfBirth?: Date;
  nationalId?: string;
  employmentStatus: 'full-time' | 'part-time' | 'contract' | 'intern';
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  education?: {
    degree: string;
    institution: string;
    graduationYear: number;
  };
  salary: number;
  user?: UserAttributes;
}
