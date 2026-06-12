import { AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

export interface ErrorStateProps {
  message: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorState({
  message,
  description,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-12 text-center",
        className
      )}
    >
      <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
      <p className="text-sm font-medium text-destructive">{message}</p>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={onRetry}
        >
          再試行
        </Button>
      )}
    </div>
  );
}
