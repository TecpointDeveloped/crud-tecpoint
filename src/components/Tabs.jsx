import React from 'react';

const Tabs = ({ children, className = '', value, onValueChange, ...props }) => {
  return (
    <div className={className} {...props}>
      {React.Children.map(children, child => {
        if (child.type === TabsList) {
          return React.cloneElement(child, { value, onValueChange });
        }
        return child;
      })}
    </div>
  );
};

const TabsList = ({ children, className = '', value, onValueChange, ...props }) => {
  return (
    <div className={`inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground ${className}`} {...props}>
      {React.Children.map(children, child => {
        if (child.type === TabsTrigger) {
          return React.cloneElement(child, {
            isActive: child.props.value === value,
            onClick: () => onValueChange(child.props.value)
          });
        }
        return child;
      })}
    </div>
  );
};

const TabsTrigger = ({ children, className = '', isActive, onClick, ...props }) => {
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isActive ? 'bg-background text-foreground shadow data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow' : 'hover:bg-muted-foreground/10'
      } ${className}`}
      onClick={onClick}
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      {...props}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ children, className = '', value, activeTab, ...props }) => {
  if (value !== activeTab) return null; // Solo renderiza el contenido si coincide con la pestaña activa
  return (
    <div
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
      role="tabpanel"
      data-state={value === activeTab ? "active" : "inactive"}
      {...props}
    >
      {children}
    </div>
  );
};

export { Tabs, TabsList, TabsTrigger, TabsContent };
