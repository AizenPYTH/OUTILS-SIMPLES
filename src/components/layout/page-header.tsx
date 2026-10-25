import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, eyebrow, children, className }: PageHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {eyebrow}
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {description ? (
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">{description}</p>
      ) : null}
      {children}
    </div>
  );
}
