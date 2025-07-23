import React from 'react';

const Button = ({ children, className = '', variant = 'default', size = 'default', ...props }) => {
  let baseClasses = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
  let variantClasses = '';
  let sizeClasses = '';

  switch (variant) {
    case 'default':
      variantClasses = 'bg-primary text-primary-foreground shadow hover:bg-primary/90'; // Puedes definir 'primary' en tailwind.config.js
      break;
    case 'destructive':
      variantClasses = 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90';
      break;
    case 'outline':
      variantClasses = 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground';
      break;
    case 'secondary':
      variantClasses = 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80';
      break;
    case 'ghost':
      variantClasses = 'hover:bg-accent hover:text-accent-foreground';
      break;
    case 'link':
      variantClasses = 'text-primary underline-offset-4 hover:underline';
      break;
    default:
      variantClasses = 'bg-blue-600 text-white hover:bg-blue-700'; // Default para este dashboard
      break;
  }

  switch (size) {
    case 'default':
      sizeClasses = 'h-9 px-4 py-2';
      break;
    case 'sm':
      sizeClasses = 'h-8 rounded-md px-3 text-xs';
      break;
    case 'lg':
      sizeClasses = 'h-10 rounded-md px-8';
      break;
    case 'icon':
      sizeClasses = 'h-9 w-9';
      break;
    default:
      sizeClasses = 'h-9 px-4 py-2';
      break;
  }

  return (
    <button className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;