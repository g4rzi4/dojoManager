import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

function Button({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`
        w-full cursor-pointer rounded-[1.25rem] bg-violet-600 px-4 py-3.5
        text-lg font-semibold text-violet-50
        transition-[background-color,transform] duration-200
        motion-reduce:transition-none
        hover:bg-violet-700 active:scale-[0.98]
        focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none
        disabled:cursor-not-allowed disabled:opacity-50
        ${className}
      `}
    >
      {children}
    </button>
  );
}

export default Button;
