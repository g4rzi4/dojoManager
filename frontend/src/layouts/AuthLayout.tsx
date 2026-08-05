import type { ReactNode } from "react";
import Card from "../components/Card";

type Props = {
  children: ReactNode;
};

function AuthLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-5xl overflow-hidden">
        {children}
      </Card>
    </div>
  );
}

export default AuthLayout;