import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

function Button({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`
        w-full
        rounded-xl
        bg-blue-600
        px-4
        py-3
        font-semibold
        text-white
        transition-all
        duration-200
        hover:bg-blue-700
        hover:shadow-lg
        active:scale-95
        disabled:opacity-50
        ${className}
      `}
    >
      {children}
    </button>
  );
}

export default Button;