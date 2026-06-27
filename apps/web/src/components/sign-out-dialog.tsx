import { ConfirmDialog } from "@/components/confirm-dialog";
import { useSignOut } from "@/hooks/use-sign-out";

interface SignOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const { signOut } = useSignOut();

  const handleSignOut = () => {
    signOut();
  };

  return (
    <ConfirmDialog
      className="sm:max-w-sm"
      confirmText="Sign out"
      desc="Are you sure you want to sign out? You will need to sign in again to access your account."
      destructive
      handleConfirm={handleSignOut}
      onOpenChange={onOpenChange}
      open={open}
      title="Sign out"
    />
  );
}
