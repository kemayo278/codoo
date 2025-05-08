// components/ui/ButtonSpinner.tsx
import { Loader2 } from "lucide-react";

export const ButtonSpinner = () => {
  return (
    <span className="flex items-center gap-2">
      <Loader2 className="animate-spin w-4 h-4" />
      Processing...
    </span>
  );
};
