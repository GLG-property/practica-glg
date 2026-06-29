"use client";

import {
  House,
  CalendarBlank,
  Users,
  GearSix,
  Car,
  Phone,
  ChatCircleText,
  Plus,
  Check,
  X,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  SignOut,
  SquaresFour,
  Bell,
  Clock,
  LinkSimple,
  DownloadSimple,
  Warning,
  PencilSimple,
  FileText,
  ClockCounterClockwise,
  type Icon as PhosphorIcon,
  type IconWeight,
} from "@phosphor-icons/react";

// Set de iconuri Phosphor (pline). Păstrăm API-ul <Icon name=... /> ca să nu schimbăm
// toate locurile de apel.
export type IconName =
  | "home"
  | "calendar"
  | "users"
  | "settings"
  | "car"
  | "phone"
  | "message"
  | "plus"
  | "check"
  | "x"
  | "back"
  | "next"
  | "search"
  | "logout"
  | "dashboard"
  | "bell"
  | "clock"
  | "link"
  | "download"
  | "alert"
  | "edit"
  | "report"
  | "history";

const MAP: Record<IconName, PhosphorIcon> = {
  home: House,
  calendar: CalendarBlank,
  users: Users,
  settings: GearSix,
  car: Car,
  phone: Phone,
  message: ChatCircleText,
  plus: Plus,
  check: Check,
  x: X,
  back: CaretLeft,
  next: CaretRight,
  search: MagnifyingGlass,
  logout: SignOut,
  dashboard: SquaresFour,
  bell: Bell,
  clock: Clock,
  link: LinkSimple,
  download: DownloadSimple,
  alert: Warning,
  edit: PencilSimple,
  report: FileText,
  history: ClockCounterClockwise,
};

// Aceste iconuri arată mai bine cu contur gros (nu pline): bifă, X, plus, săgeți, lupă.
const BOLD = new Set<IconName>(["check", "x", "plus", "back", "next", "search"]);

export function Icon({
  name,
  size = 20,
  weight,
  className,
}: {
  name: IconName;
  size?: number;
  weight?: IconWeight;
  /** păstrat pentru compatibilitate cu apelurile vechi (ignorat) */
  strokeWidth?: number;
  className?: string;
}) {
  const Cmp = MAP[name];
  const w: IconWeight = weight ?? (BOLD.has(name) ? "bold" : "fill");
  return <Cmp size={size} weight={w} className={className} aria-hidden />;
}
