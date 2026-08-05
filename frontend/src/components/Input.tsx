import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

function Input({ label, className = "", ...props }: Props) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      <input
        {...props}
        className={`
          w-full
          rounded-xl
          border
          border-gray-300
          bg-white
          px-4
          py-3
          outline-none
          transition-all
          focus:border-blue-600
          focus:ring-4
          focus:ring-blue-100
          ${className}
        `}
      />
    </div>
  );
}

export default Input;