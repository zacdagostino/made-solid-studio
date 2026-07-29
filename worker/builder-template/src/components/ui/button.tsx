import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:opacity-55',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--brand-primary)] text-white hover:brightness-110',
        secondary:
          'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--brand-primary)]',
        quiet: 'text-[var(--color-ink)] hover:bg-black/5',
      },
      size: {
        default: 'min-h-11 px-5',
        compact: 'min-h-11 px-4 text-sm',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, size, type = 'button', variant, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ className, size, variant }))} type={type} {...props} />
  );
}
