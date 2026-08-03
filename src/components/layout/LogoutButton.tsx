import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="outline" size="sm">
        Cerrar sesión
      </Button>
    </form>
  );
}
