import React from "react";
import { Button } from "@/components/ui/button";

interface AuthButtonProps {
  provider: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

const AuthButton: React.FC<AuthButtonProps> = ({
  provider,
  icon,
  onClick,
  disabled = false,
}) => {
  return (
    <Button
      variant="outline"
      className="w-full flex items-center justify-center gap-2 py-6 transition-all hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-cicada-secondary dark:hover:text-cicada-primary group"
      onClick={onClick}
      disabled={disabled}
    >
      <span className="transition-colors group-hover:text-cicada-secondary dark:group-hover:text-cicada-primary">
        {icon}
      </span>
      <span>Continue with {provider}</span>
    </Button>
  );
};

export default AuthButton;
