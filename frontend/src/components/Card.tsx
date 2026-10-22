import type { ReactNode } from "react";

type CardProps = {
  /** Opcional para poder usar Card vacía como skeleton de carga. */
  children?: ReactNode;
  className?: string;
};

function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`
        rounded-2xl
        bg-white
        shadow-lg
        border
        border-gray-100
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export default Card;