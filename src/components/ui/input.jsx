import React from 'react'

const Input = React.forwardRef(({ 
  className = '', 
  type = 'text',
  disabled = false,
  ...props 
}, ref) => {
  const baseClasses = 'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus-visible:ring-blue-400'
  
  return (
    <input
      type={type}
      className={`${baseClasses} ${className}`}
      ref={ref}
      disabled={disabled}
      {...props}
    />
  )
})

Input.displayName = 'Input'

export { Input }
