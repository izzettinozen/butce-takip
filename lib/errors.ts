/**
 * Supabase / Postgres hatalarını kullanıcı dostu Türkçe mesaja çevirir.
 */
export function getSupabaseErrorMessage(
  error: unknown,
  fallback = "Beklenmeyen bir hata oluştu.",
): string {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string };

    switch (e.code) {
      case "23503": // foreign_key_violation
        return "Bu kayıt başka kayıtlar tarafından kullanıldığı için silinemez.";
      case "23505": // unique_violation
        return "Bu kayıt zaten mevcut.";
      case "23514": // check_violation
        return "Girilen değer geçerli aralıkta değil.";
      case "23502": // not_null_violation
        return "Zorunlu bir alan boş bırakılamaz.";
    }

    if (typeof e.message === "string" && e.message.length > 0) {
      return e.message;
    }
  }

  if (error instanceof Error) return error.message;
  return fallback;
}
