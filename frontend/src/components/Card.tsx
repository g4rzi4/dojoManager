import type { ReactNode } from "react";

type CardProps = {
  /** Opcional para poder usar Card vacía como skeleton de carga. */
  children?: ReactNode;
  className?: string;
};

function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-[1.75rem] border border-neutral-200/80 bg-white shadow-surface ${className}`}
    >
      {children}
    </div>
  );
}

export default Card;
