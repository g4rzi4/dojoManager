import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

function AuthLayout({ children }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-6xl rounded-[2.5rem] border border-neutral-200/80 bg-neutral-50 shadow-float sm:rounded-[3.25rem]">
        {children}
      </div>
    </div>
  );
}

export default AuthLayout;
