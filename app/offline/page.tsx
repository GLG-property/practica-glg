// Pagină afișată când utilizatorul e offline și pagina cerută nu e în cache.
import { Icon } from "@/components/icons";

export const metadata = { title: "Offline — GLG Property" };

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon name="alert" size={32} />
      </div>
      <h1 className="text-xl font-bold mb-2">Ești offline</h1>
      <p className="text-gray-600 mb-1">
        Verifică conexiunea la internet și încearcă din nou.
      </p>
      <p className="text-gray-500" lang="ru">
        Вы офлайн. Проверьте подключение к интернету и попробуйте снова.
      </p>
      <p className="text-gray-400 mt-4 text-base">
        Programul deja vizitat rămâne disponibil din memorie. / Уже открытое расписание доступно из кэша.
      </p>
    </main>
  );
}
