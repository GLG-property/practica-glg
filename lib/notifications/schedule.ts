import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { getDict, fmt } from "@/lib/i18n/dictionaries";
import { dateDMY, timeHM } from "@/lib/utils/date";

/**
 * Programează reminderul „cu o zi înainte" pentru o lecție.
 * Dacă elevul are Telegram/Viber legat -> pe canalul respectiv; altfel -> in-app.
 * Best-effort: nu blocăm crearea lecției.
 */
export async function scheduleReminderForLesson(lessonId: string): Promise<void> {
  try {
    const supabase = getAdminClient();
    const { data: lesson } = await supabase
      .from("lessons")
      .select(
        "id, start_time, status, student:students(first_name,last_name,telegram_chat_id,viber_id), instructor:users!lessons_instructor_id_fkey(full_name,language_pref), car:cars(plate,model)"
      )
      .eq("id", lessonId)
      .single();

    if (!lesson || lesson.status !== "scheduled") return;

    const student = (lesson as any).student;
    const instructor = (lesson as any).instructor;
    const car = (lesson as any).car;

    const lang = (instructor?.language_pref as "ro" | "ru") ?? "ro";
    const d = getDict(lang);

    const body = fmt(d.notif.reminderBody, {
      date: dateDMY(lesson.start_time),
      time: timeHM(lesson.start_time),
      driver: instructor?.full_name ?? "",
      car: car ? `${car.model} (${car.plate})` : "-",
    });

    const scheduledFor = new Date(new Date(lesson.start_time).getTime() - 24 * 3600 * 1000).toISOString();

    const rows: any[] = [];
    if (student?.telegram_chat_id) {
      rows.push({ lesson_id: lessonId, channel: "telegram", recipient: student.telegram_chat_id, status: "pending", body, scheduled_for: scheduledFor });
    }
    if (student?.viber_id) {
      rows.push({ lesson_id: lessonId, channel: "viber", recipient: student.viber_id, status: "pending", body, scheduled_for: scheduledFor });
    }
    if (rows.length === 0) {
      rows.push({ lesson_id: lessonId, channel: "inapp", recipient: null, status: "pending", body, scheduled_for: scheduledFor });
    }
    await supabase.from("notifications").insert(rows);
  } catch (err) {
    console.error("[scheduleReminderForLesson]", err);
  }
}
