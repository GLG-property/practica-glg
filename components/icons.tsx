"use client";

import type { IconType } from "react-icons";
import {
  TbHome,
  TbCalendarEvent,
  TbUsers,
  TbSettings,
  TbCar,
  TbPhone,
  TbMessageCircle,
  TbPlus,
  TbCheck,
  TbX,
  TbChevronLeft,
  TbChevronRight,
  TbSearch,
  TbLogout,
  TbLayoutDashboard,
  TbBell,
  TbClock,
  TbLink,
  TbDownload,
  TbAlertTriangle,
  TbPencil,
  TbFileText,
  TbHistory,
} from "react-icons/tb";

// Set de iconuri Tabler. Păstrăm API-ul <Icon name=... />. Pentru a comuta la alt set
// (Material/Lucide/Remix/Hero) se schimbă doar maparea de mai jos.
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

const MAP: Record<IconName, IconType> = {
  home: TbHome,
  calendar: TbCalendarEvent,
  users: TbUsers,
  settings: TbSettings,
  car: TbCar,
  phone: TbPhone,
  message: TbMessageCircle,
  plus: TbPlus,
  check: TbCheck,
  x: TbX,
  back: TbChevronLeft,
  next: TbChevronRight,
  search: TbSearch,
  logout: TbLogout,
  dashboard: TbLayoutDashboard,
  bell: TbBell,
  clock: TbClock,
  link: TbLink,
  download: TbDownload,
  alert: TbAlertTriangle,
  edit: TbPencil,
  report: TbFileText,
  history: TbHistory,
};

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  /** păstrate pentru compatibilitate (ignorate) */
  weight?: string;
  strokeWidth?: number;
  className?: string;
}) {
  const Cmp = MAP[name];
  return <Cmp size={size} className={className} aria-hidden />;
}
