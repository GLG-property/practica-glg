"use client";

import type { IconType } from "react-icons";
import {
  RiHome5Fill,
  RiCalendarFill,
  RiGroupFill,
  RiSettings3Fill,
  RiCarFill,
  RiPhoneFill,
  RiChat3Fill,
  RiAddLine,
  RiCheckLine,
  RiCloseLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiSearchLine,
  RiLogoutBoxRLine,
  RiDashboardFill,
  RiNotification3Fill,
  RiTimeFill,
  RiLinkM,
  RiDownload2Fill,
  RiErrorWarningFill,
  RiEditFill,
  RiFileList3Fill,
  RiHistoryLine,
} from "react-icons/ri";

// Set de iconuri Remix Icon. Păstrăm API-ul <Icon name=... /> ca să nu schimbăm
// locurile de apel. Pentru a comuta la alt set (Material/Tabler/Lucide etc.)
// se schimbă doar maparea de mai jos.
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
  home: RiHome5Fill,
  calendar: RiCalendarFill,
  users: RiGroupFill,
  settings: RiSettings3Fill,
  car: RiCarFill,
  phone: RiPhoneFill,
  message: RiChat3Fill,
  plus: RiAddLine,
  check: RiCheckLine,
  x: RiCloseLine,
  back: RiArrowLeftSLine,
  next: RiArrowRightSLine,
  search: RiSearchLine,
  logout: RiLogoutBoxRLine,
  dashboard: RiDashboardFill,
  bell: RiNotification3Fill,
  clock: RiTimeFill,
  link: RiLinkM,
  download: RiDownload2Fill,
  alert: RiErrorWarningFill,
  edit: RiEditFill,
  report: RiFileList3Fill,
  history: RiHistoryLine,
};

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  /** păstrate pentru compatibilitate cu apelurile vechi (ignorate) */
  weight?: string;
  strokeWidth?: number;
  className?: string;
}) {
  const Cmp = MAP[name];
  return <Cmp size={size} className={className} aria-hidden />;
}
