import { Loader2 } from 'lucide-react';

export function LoadingSpinner() {
  return (
    // <div className="flex justify-center items-center h-full">
    //   <Loader2 className="h-8 w-8 animate-spin text-primary" />
    // </div>
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>    
  );
} 