// Dicționar bilingv RO + RU pentru arhitectura cu 3 roluri.
import type { LangPref } from "@/lib/db/types";

export const dictionaries = {
  ro: {
    appName: "GLG Property",
    common: {
      save: "Salvează", cancel: "Anulează", delete: "Șterge", edit: "Editează",
      add: "Adaugă", back: "Înapoi", search: "Caută", loading: "Se încarcă…",
      noData: "Nu există date.", confirm: "Confirmă", yes: "Da", no: "Nu",
      today: "Azi", tomorrow: "Mâine", week: "Săptămâna", all: "Toate",
      close: "Închide", saved: "Salvat!", error: "A apărut o eroare. Încearcă din nou.",
      none: "—", open: "Deschide", select: "Alege",
    },
    roles: { admin: "Administrator", operator: "Operator", instructor: "Instructor" },
    nav: {
      today: "Azi", calendar: "Calendar", students: "Cursanți", groups: "Grupe",
      instructors: "Instructori", operators: "Operatori", cars: "Mașini",
      payments: "Plăți", reports: "Rapoarte", audit: "Jurnal", profile: "Profil",
      dashboard: "Panou", logout: "Ieșire", schedule: "Programare",
    },
    login: {
      title: "Bine ai venit", chooseRole: "Cine ești?",
      enterCode: "Introdu codul", codeHint5: "Cod din 5 cifre", codeHint8: "Cod din 8 cifre",
      wrongCode: "Cod greșit. Au mai rămas {n} încercări.",
      locked: "Prea multe încercări. Reîncearcă în {min} minute.",
      enter: "Intră", clear: "Șterge",
    },
    status: {
      scheduled: "Programat", completed: "Efectuat", no_show: "Nu s-a prezentat", cancelled: "Anulat",
    },
    payment: {
      paid: "Achitat", unpaid: "Neachitat", paidCashier: "Achitat la casă",
      paidInstructor: "Achitat la instructor", markPaid: "Marchează achitat (cash)",
      paidHours: "Ore achitate", setPaidHours: "Setează ore achitate",
      cashCollected: "Încasări cash", reconciliation: "Reconciliere plăți",
      byInstructor: "Cash de adus per instructor",
    },
    today: {
      title: "Programul tău", todayLabel: "Azi", tomorrowLabel: "Mâine",
      empty: "Nu ai lecții. Zi liniștită! 🚗",
      call: "Sună", sms: "SMS",
      markCompleted: "Efectuat", markNoShow: "Absent", markCancelled: "Anulează",
    },
    students: {
      title: "Cursanți", addNew: "Cursant nou", searchPlaceholder: "Caută după nume…",
      firstName: "Prenume", lastName: "Nume", phone: "Telefon",
      transmission: "Cutie", manual: "Mecanică", automatic: "Automată",
      group: "Grupă", theoryTeacher: "Profesor teoretic", notes: "Note",
      photo: "Poză (opțional)", created: "Cursant adăugat!",
      history: "Istoric lecții", remarks: "Remarci", addRemark: "Adaugă remarcă",
      remarkPlaceholder: "Scrie o remarcă (ex: nu s-a prezentat)…",
      noShowCount: "A lipsit de {n} ori", progress: "Progres lecții",
      phase1: "Faza 1", phase2: "Faza 2", linkBot: "Conectează notificările",
      linkCode: "Cod de legare: {code}", instructors: "Instructori atribuiți",
    },
    lesson: {
      addTitle: "Programare nouă", student: "Cursant", instructor: "Instructor",
      date: "Data", startTime: "Ora", duration: "Durată", car: "Mașină",
      hours: "ore", hour: "oră", phase: "Faza", lessonNo: "Lecția",
      created: "Programare salvată!",
      conflictInstructor: "Instructorul are deja o lecție în acest interval.",
      conflictCar: "Mașina e deja folosită în acest interval.",
      phase2Locked: "Faza 2 e blocată: mai sunt {n} lecții de efectuat în faza 1.",
      adminOverride: "Forțează (admin)", remarks: "Remarci", addScreenshot: "Adaugă captură",
    },
    groups: {
      title: "Grupe", addNew: "Grupă nouă", name: "Nume grupă",
      studentsCount: "{n} cursanți", status: "Status", draft: "În lucru",
      sent: "Trimisă la operatori", sendToOperators: "Trimite la operatori",
      distribute: "Repartizare", balanced: "Echilibrat (aleatoriu)", manual: "Manual",
      sentConfirm: "Grupa a fost trimisă la operatori!", assignInstructors: "Atribuie instructori",
      notReady: "Nu toți cursanții au 2 instructori atribuiți.",
    },
    instructors: {
      title: "Instructori", addNew: "Instructor nou", code: "Cod (5 cifre)",
      car: "Mașină atribuită", assigned: "Atribuit", phase1Instr: "Instructor faza 1",
      phase2Instr: "Instructor faza 2", calendar: "Calendar instructor",
    },
    operators: {
      title: "Operatori", addNew: "Operator nou", code: "Cod (5 cifre)",
      myStudents: "Cursanții mei", received: "Primiți de la admin",
      scheduleFor: "Programează pentru {name}", pickInstructor: "Alege instructorul",
      empty: "Încă nu ai primit cursanți.",
    },
    cars: {
      title: "Mașini", addNew: "Mașină nouă", plate: "Număr", model: "Model",
      transmission: "Cutie", stage: "Etapă", beginner: "Început (Fabia/Toyota)",
      advanced: "Avansat (Scala)", itp: "ITP", insurance: "Asigurare", service: "Revizie",
      expiringSoon: "Expiră curând", expired: "Expirat", active: "Activ",
    },
    admin: {
      dashboardTitle: "Panou de control", studentsTotal: "Cursanți",
      groupsTotal: "Grupe", lessonsToday: "Lecții azi", noShowRate: "Rată neprezentare",
      cashToCollect: "Cash de încasat", from: "De la", to: "Până la",
      exportExcel: "Export Excel", exportPdf: "Export PDF", reportsTitle: "Rapoarte",
      auditTitle: "Jurnal de audit", filterInstructor: "Filtrează după instructor",
    },
    notif: {
      title: "Notificări", enabled: "Notificări active",
      disabled: "Notificările sunt dezactivate (rămân în aplicație).",
      reminderBody: "Salut! Îți reamintim că ai o lecție de conducere la {date}, ora {time}, cu instructorul {driver}. Mașina: {car}.",
    },
    lang: { ro: "Română", ru: "Rusă", switch: "Limbă" },
  },

  ru: {
    appName: "GLG Property",
    common: {
      save: "Сохранить", cancel: "Отмена", delete: "Удалить", edit: "Изменить",
      add: "Добавить", back: "Назад", search: "Поиск", loading: "Загрузка…",
      noData: "Нет данных.", confirm: "Подтвердить", yes: "Да", no: "Нет",
      today: "Сегодня", tomorrow: "Завтра", week: "Неделя", all: "Все",
      close: "Закрыть", saved: "Сохранено!", error: "Произошла ошибка. Попробуйте ещё раз.",
      none: "—", open: "Открыть", select: "Выбрать",
    },
    roles: { admin: "Администратор", operator: "Оператор", instructor: "Инструктор" },
    nav: {
      today: "Сегодня", calendar: "Календарь", students: "Ученики", groups: "Группы",
      instructors: "Инструкторы", operators: "Операторы", cars: "Машины",
      payments: "Оплаты", reports: "Отчёты", audit: "Журнал", profile: "Профиль",
      dashboard: "Панель", logout: "Выход", schedule: "Запись",
    },
    login: {
      title: "Добро пожаловать", chooseRole: "Кто вы?",
      enterCode: "Введите код", codeHint5: "Код из 5 цифр", codeHint8: "Код из 8 цифр",
      wrongCode: "Неверный код. Осталось попыток: {n}.",
      locked: "Слишком много попыток. Повторите через {min} мин.",
      enter: "Войти", clear: "Стереть",
    },
    status: {
      scheduled: "Запланировано", completed: "Выполнено", no_show: "Не явился", cancelled: "Отменено",
    },
    payment: {
      paid: "Оплачено", unpaid: "Не оплачено", paidCashier: "Оплачено в кассе",
      paidInstructor: "Оплачено инструктору", markPaid: "Отметить оплату (нал.)",
      paidHours: "Оплаченные часы", setPaidHours: "Задать оплаченные часы",
      cashCollected: "Наличные сборы", reconciliation: "Сверка оплат",
      byInstructor: "Наличные к сдаче по инструкторам",
    },
    today: {
      title: "Ваше расписание", todayLabel: "Сегодня", tomorrowLabel: "Завтра",
      empty: "Уроков нет. Спокойного дня! 🚗",
      call: "Звонок", sms: "СМС",
      markCompleted: "Выполнено", markNoShow: "Не явился", markCancelled: "Отменить",
    },
    students: {
      title: "Ученики", addNew: "Новый ученик", searchPlaceholder: "Поиск по имени…",
      firstName: "Имя", lastName: "Фамилия", phone: "Телефон",
      transmission: "Коробка", manual: "Механика", automatic: "Автомат",
      group: "Группа", theoryTeacher: "Преподаватель теории", notes: "Заметки",
      photo: "Фото (необязательно)", created: "Ученик добавлен!",
      history: "История уроков", remarks: "Заметки", addRemark: "Добавить заметку",
      remarkPlaceholder: "Напишите заметку (напр.: не явился)…",
      noShowCount: "Пропустил(а) {n} раз", progress: "Прогресс уроков",
      phase1: "Фаза 1", phase2: "Фаза 2", linkBot: "Подключить уведомления",
      linkCode: "Код привязки: {code}", instructors: "Назначенные инструкторы",
    },
    lesson: {
      addTitle: "Новая запись", student: "Ученик", instructor: "Инструктор",
      date: "Дата", startTime: "Время", duration: "Длительность", car: "Машина",
      hours: "ч.", hour: "ч.", phase: "Фаза", lessonNo: "Урок",
      created: "Запись сохранена!",
      conflictInstructor: "У инструктора уже есть урок в это время.",
      conflictCar: "Машина уже используется в это время.",
      phase2Locked: "Фаза 2 заблокирована: осталось {n} уроков в фазе 1.",
      adminOverride: "Принудительно (админ)", remarks: "Заметки", addScreenshot: "Добавить скриншот",
    },
    groups: {
      title: "Группы", addNew: "Новая группа", name: "Название группы",
      studentsCount: "{n} учеников", status: "Статус", draft: "В работе",
      sent: "Отправлена операторам", sendToOperators: "Отправить операторам",
      distribute: "Распределение", balanced: "Поровну (случайно)", manual: "Вручную",
      sentConfirm: "Группа отправлена операторам!", assignInstructors: "Назначить инструкторов",
      notReady: "Не у всех учеников назначены 2 инструктора.",
    },
    instructors: {
      title: "Инструкторы", addNew: "Новый инструктор", code: "Код (5 цифр)",
      car: "Закреплённая машина", assigned: "Назначен", phase1Instr: "Инструктор фазы 1",
      phase2Instr: "Инструктор фазы 2", calendar: "Календарь инструктора",
    },
    operators: {
      title: "Операторы", addNew: "Новый оператор", code: "Код (5 цифр)",
      myStudents: "Мои ученики", received: "Получены от админа",
      scheduleFor: "Запись для {name}", pickInstructor: "Выберите инструктора",
      empty: "Вы ещё не получили учеников.",
    },
    cars: {
      title: "Машины", addNew: "Новая машина", plate: "Номер", model: "Модель",
      transmission: "Коробка", stage: "Этап", beginner: "Начало (Fabia/Toyota)",
      advanced: "Продвинутый (Scala)", itp: "Техосмотр", insurance: "Страховка", service: "ТО",
      expiringSoon: "Скоро истекает", expired: "Просрочено", active: "Активна",
    },
    admin: {
      dashboardTitle: "Панель управления", studentsTotal: "Ученики",
      groupsTotal: "Группы", lessonsToday: "Уроков сегодня", noShowRate: "Процент неявок",
      cashToCollect: "Наличные к сбору", from: "С", to: "По",
      exportExcel: "Экспорт Excel", exportPdf: "Экспорт PDF", reportsTitle: "Отчёты",
      auditTitle: "Журнал аудита", filterInstructor: "Фильтр по инструктору",
    },
    notif: {
      title: "Уведомления", enabled: "Уведомления включены",
      disabled: "Уведомления отключены (остаются в приложении).",
      reminderBody: "Здравствуйте! Напоминаем: у вас урок вождения {date} в {time} с инструктором {driver}. Машина: {car}.",
    },
    lang: { ro: "Румынский", ru: "Русский", switch: "Язык" },
  },
} as const;

export type Dict = (typeof dictionaries)["ro"];

export function getDict(lang: LangPref): Dict {
  return (dictionaries[lang] ?? dictionaries.ro) as Dict;
}

export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}
