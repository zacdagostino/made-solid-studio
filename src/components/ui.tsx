import { cva, type VariantProps } from 'class-variance-authority';
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  PropsWithChildren,
  ReactNode,
} from 'react';
import { forwardRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

const buttonVariants = cva('button', {
  variants: {
    variant: {
      primary: 'button--primary',
      secondary: 'button--secondary',
      danger: 'button--danger',
      quiet: 'button--quiet',
      segmented: 'button--segmented',
      tree: 'button--tree',
      inline: 'button--inline',
    },
    size: {
      default: 'button--default',
      small: 'button--small',
      icon: 'button--icon',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'default',
  },
});

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;
export type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, type = 'button', variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      type={type}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ className, size, variant, ...props }, ref) => (
    <a ref={ref} className={cn(buttonVariants({ size, variant }), className)} {...props} />
  ),
);
ButtonLink.displayName = 'ButtonLink';

type IconButtonProps = Omit<ButtonProps, 'aria-label' | 'children' | 'size'> & {
  label: string;
  children: ReactNode;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, label, title, ...props }, ref) => (
    <Button
      aria-label={label}
      ref={ref}
      size="icon"
      title={title ?? label}
      type="button"
      {...props}
    >
      {children}
    </Button>
  ),
);
IconButton.displayName = 'IconButton';

export function ButtonGroup({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={cn('button-group', className)} {...props}>
      {children}
    </div>
  );
}

export type ToastNotice = {
  id: string;
  title: string;
  detail: string;
  tone?: 'success' | 'warning' | 'danger' | 'info';
  action?: { label: string; onClick: () => void };
};

export function ToastRegion({
  notice,
  onDismiss,
}: {
  notice?: ToastNotice;
  onDismiss: () => void;
}) {
  if (!notice) return null;
  return (
    <aside aria-atomic="true" aria-live="polite" className="toast-region">
      <div
        className={cn('toast', `toast--${notice.tone ?? 'success'}`)}
        key={notice.id}
        role="status"
      >
        <div className="toast__content">
          <strong>{notice.title}</strong>
          <p>{notice.detail}</p>
        </div>
        <IconButton label="Dismiss notification" onClick={onDismiss} variant="quiet">
          <X aria-hidden="true" size={18} />
        </IconButton>
        {notice.action ? (
          <Button
            className="toast__action"
            onClick={() => {
              notice.action?.onClick();
              onDismiss();
            }}
            size="small"
            variant="secondary"
          >
            {notice.action.label}
          </Button>
        ) : null}
      </div>
    </aside>
  );
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  detail,
  confirmLabel,
  onConfirm,
  isConfirming = false,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  detail: string;
  confirmLabel: string;
  onConfirm: () => void;
  isConfirming?: boolean;
  error?: string;
}) {
  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="confirmation-overlay" />
        <Dialog.Content className="confirmation-dialog">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{detail}</Dialog.Description>
          {error ? (
            <p className="confirmation-dialog__error" role="alert">
              {error}
            </p>
          ) : null}
          <ButtonGroup className="confirmation-dialog__actions">
            <Dialog.Close asChild>
              <Button disabled={isConfirming} variant="secondary">
                Cancel
              </Button>
            </Dialog.Close>
            <Button disabled={isConfirming} onClick={onConfirm} variant="danger">
              {isConfirming ? 'Deleting' : confirmLabel}
            </Button>
          </ButtonGroup>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Card({
  className,
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLElement>>) {
  return (
    <section className={cn('card', className)} {...props}>
      {children}
    </section>
  );
}

export function Eyebrow({ children }: PropsWithChildren) {
  return <p className="eyebrow">{children}</p>;
}

export function StatusBadge({
  children,
  tone = 'neutral',
}: PropsWithChildren<{ tone?: 'neutral' | 'success' | 'warning' | 'danger' }>) {
  return <span className={cn('status-badge', `status-badge--${tone}`)}>{children}</span>;
}

export function IndeterminateProgress({
  label,
  detail,
  className,
}: {
  label: string;
  detail: string;
  className?: string;
}) {
  return (
    <div className={cn('indeterminate-progress', className)} role="status">
      <div
        aria-label={label}
        aria-valuetext={detail}
        className="indeterminate-progress__track"
        role="progressbar"
      >
        <span className="indeterminate-progress__bar" />
      </div>
      <span>{detail}</span>
    </div>
  );
}
