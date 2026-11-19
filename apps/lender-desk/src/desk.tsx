// AUTHORED-BY Claude Opus 5.5
/** Who is at the desk (the role switcher) and the demo calendar, shared by every screen. */
import { createDemoCalendar, type DemoCalendar } from "@mortgage/demo-kit/calendar";
import type { Persona } from "@mortgage/demo-kit/registry";
import { createContext, useContext } from "react";
import { org } from "./org.ts";
import { personaFor, type Role } from "./view.ts";

export interface Desk {
  role: Role;
  setRole(role: Role): void;
  /** Follow the open tab's role (the default) or keep the one chosen in the switcher. */
  pinned: boolean;
  calendar: DemoCalendar;
}

export const DeskContext = createContext<Desk>({
  calendar: createDemoCalendar(),
  pinned: false,
  role: "processor",
  setRole: () => undefined,
});

export const useDesk = (): Desk => useContext(DeskContext);

export function personaOf(role: Role): Persona {
  return personaFor(role, org.persona, org.altPersonas) ?? { name: "Juniper staff", role };
}

/** "Elena Sato, underwriter (simulated sign-in)". */
export function whoLabel(role: Role): string {
  const persona = personaOf(role);
  return `${persona.name}, ${role}`;
}
