// Bloc de contact rapid către operator (faza de testare/lucru).
// Numărul e centralizat aici — schimbă-l într-un singur loc.

const PHONE_DISPLAY = "+373 68 327 082";
const PHONE_DIGITS = "37368327082"; // fără + și fără spații (pentru linkuri)

const LINKS = {
  viber: `viber://chat?number=%2B${PHONE_DIGITS}`,
  telegram: `https://t.me/+${PHONE_DIGITS}`,
  whatsapp: `https://wa.me/${PHONE_DIGITS}`,
};

function ViberLogo() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
      <path d="M11.4.8C9.5.83 5.4 1.15 3.1 3.26 1.4 4.97.8 7.47.74 10.57c-.06 3.1-.13 8.9 5.46 10.48v2.4s-.04.97.6 1.17c.78.24 1.23-.5 1.98-1.3l1.39-1.57c3.83.32 6.77-.42 7.1-.53.78-.25 5.16-.82 5.87-6.63.74-5.99-.36-9.78-2.33-11.49l-.01-.01C19.6 2 17.2.27 11.86.25c0 0-.39-.02-1.03-.01zM11.46 2.5c.54-.01.88 0 .88 0 4.52.02 6.66 1.39 7.17 1.84 1.66 1.43 2.5 4.85 1.88 9.85-.6 4.84-4.14 5.14-4.8 5.35-.28.09-2.86.73-6.11.52 0 0-2.42 2.92-3.18 3.68-.12.12-.26.16-.35.14-.13-.03-.16-.18-.16-.4l.02-4.01c-4.73-1.31-4.46-6.26-4.4-8.84.05-2.58.53-4.7 1.98-6.12C7.5 2.78 11 2.52 12.62 2.5h-1.16zM12 5.6a.5.5 0 000 1 4.4 4.4 0 014.4 4.4.5.5 0 001 0A5.4 5.4 0 0012 5.6zm-3.86.97c-.2 0-.43.07-.66.27-.39.36-1.1 1.04-1.1 2.47 0 1.43 1.05 2.82 1.2 3.02.14.2 2.06 3.27 5.06 4.46 2.5.98 3 .79 3.55.74.55-.05 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.12-.27-.2-.57-.35-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.66.15-.2.3-.76.96-.93 1.16-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.45.13-.6.13-.13.3-.34.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.66-1.6-.91-2.18-.2-.47-.4-.5-.58-.5h-.45zm4.05.93a.5.5 0 000 1c1.3 0 2.31 1 2.31 2.3a.5.5 0 001 0c0-1.83-1.48-3.3-3.31-3.3zm.12 1.62a.5.5 0 00-.13 1c.45.12.7.37.81.81a.5.5 0 00.97-.25c-.2-.78-.74-1.32-1.52-1.53a.5.5 0 00-.13-.03z" />
    </svg>
  );
}

function TelegramLogo() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function WhatsappLogo() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.748-.99zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
    </svg>
  );
}

export function ContactOperator({ title = "Contact operator" }: { title?: string }) {
  return (
    <div className="w-full">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <div className="flex items-center justify-center gap-3">
        <a
          href={LINKS.viber}
          aria-label="Viber"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#7360F2] text-white shadow-sm transition active:scale-95"
        >
          <ViberLogo />
        </a>
        <a
          href={LINKS.telegram}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Telegram"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#229ED9] text-white shadow-sm transition active:scale-95"
        >
          <TelegramLogo />
        </a>
        <a
          href={LINKS.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition active:scale-95"
        >
          <WhatsappLogo />
        </a>
      </div>
      <a
        href={`tel:+${PHONE_DIGITS}`}
        className="mt-2 block text-center text-sm font-medium text-slate-500 hover:text-brand"
      >
        {PHONE_DISPLAY}
      </a>
    </div>
  );
}
