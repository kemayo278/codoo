import { Button } from "@/components/Shared/ui/button"

interface ErrorAlertProps {
  title? : string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorAlert({ title, message, onRetry }: ErrorAlertProps) {
  return (
    <div
      className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
      role="alert"
    >
      <p className="font-medium">{title}</p>
      <p className="text-sm">{message}</p>
      <Button variant="outline" className="mt-2" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
