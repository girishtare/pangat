import { ChefHat, ClipboardList, LayoutDashboard, Settings, Ticket, Users } from "lucide-react";
import { WhatsAppIcon } from "./kit";

export type NavKey = "dashboard" | "guests" | "slips" | "whatsapp" | "todo" | "numbers" | "settings";

export interface NavItem {
  key: NavKey;
  href: string;
  label: string;
  icon: NavKey;
  active: boolean;
}

/** Icons by key, so the list can cross from server to client components. */
export function NavIcon({ name, className = "h-5 w-5 shrink-0" }: { name: NavKey; className?: string }) {
  switch (name) {
    case "dashboard":
      return <LayoutDashboard className={className} aria-hidden="true" />;
    case "guests":
      return <Users className={className} aria-hidden="true" />;
    case "slips":
      return <Ticket className={className} aria-hidden="true" />;
    case "whatsapp":
      return <WhatsAppIcon className={className} />;
    case "todo":
      return <ClipboardList className={className} aria-hidden="true" />;
    case "numbers":
      return <ChefHat className={className} aria-hidden="true" />;
    case "settings":
      return <Settings className={className} aria-hidden="true" />;
  }
}
