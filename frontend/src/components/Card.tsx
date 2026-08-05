import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
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