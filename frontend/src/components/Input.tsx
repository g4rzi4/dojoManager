import { useId, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

function Input({ label, className = "", id, ...props }: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-neutral-700"
      >
        {label}
      </label>

      <input
        {...props}
        id={inputId}
        className={`
          w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3
          text-neutral-800 outline-none placeholder:text-neutral-500
          transition-[border-color,box-shadow]
          motion-reduce:transition-none
          focus:border-violet-600 focus:ring-4 focus:ring-violet-100
          ${className}
        `}
      />
    </div>
  );
}

export default Input;
