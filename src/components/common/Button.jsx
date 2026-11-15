import React from 'react';

/**
 * Reusable, elderly-friendly Button component.
 * Uses large touch targets (min-h-[52px]), high-contrast colors, and clear typography.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2.5 font-semibold rounded-xl transition-all duration-200 cursor-pointer select-none active:scale-[0.99]';

  const variants = {
    primary:
      'bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-600/20 border-2 border-transparent',
    secondary:
      'bg-sky-600 text-white hover:bg-sky-700 shadow-md shadow-sky-600/20 border-2 border-transparent',
    outline:
      'bg-white text-teal-800 border-2 border-teal-600 hover:bg-teal-50',
    ghost:
      'bg-slate-100 text-slate-800 hover:bg-slate-200 border-2 border-transparent',
  };

  const sizes = {
    sm: 'px-4 py-2.5 text-base min-h-[46px]',
    md: 'px-6 py-3.5 text-lg min-h-[52px]',
    lg: 'px-8 py-4 text-xl min-h-[60px]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${
        sizes[size] || sizes.md
      } ${className}`}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon className="w-6 h-6 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
      {Icon && iconPosition === 'right' && <Icon className="w-6 h-6 shrink-0" aria-hidden="true" />}
    </button>
  );
}

