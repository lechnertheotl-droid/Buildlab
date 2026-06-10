// Button.tsx — die eine Button-Quelle (DESIGN.md §4: alle fünf Zustände).
// buttonClass() existiert separat, damit Router-<Link>s in der App dieselben
// Klassen tragen können, ohne dass @buildlab/ui den Router kennt.

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { focusRing } from './focus';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

const base =
  `inline-flex items-center justify-center gap-2 rounded font-mono transition-colors duration-150 ` +
  `${focusRing} active:translate-y-px active:shadow-none ` +
  `disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0`;

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-paper hover:bg-accent-ink',
  secondary:
    'border border-black/10 bg-paper-2 text-ink hover:border-rule-strong hover:bg-paper-3',
  ghost: 'text-ink-2 hover:bg-paper-sink hover:text-ink',
  danger: 'bg-fehl text-paper hover:opacity-90',
};

const sizes: Record<ButtonSize, string> = {
  md: 'min-h-11 px-5 text-sm',
  sm: 'min-h-9 px-3 text-xs',
};

export function buttonClass(
  opts: { variant?: ButtonVariant; size?: ButtonSize } = {},
): string {
  const { variant = 'primary', size = 'md' } = opts;
  return `${base} ${variants[variant]} ${sizes[size]}`;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className = '', type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${buttonClass({ variant, size })} ${className}`}
      {...rest}
    />
  );
});
