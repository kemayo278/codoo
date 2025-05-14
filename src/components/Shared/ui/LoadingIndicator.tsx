interface LoadingIndicatorProps {
    title?: string;
    subtitle?: string;
  }
  
  export default function LoadingIndicator({
    title = "Loading...",
    subtitle = "This may take a few moments",
  }: LoadingIndicatorProps) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
        <p>{title}</p>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    );
  }
  