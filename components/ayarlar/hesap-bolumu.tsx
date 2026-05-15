"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useProfile } from "@/hooks/use-profile";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseErrorMessage } from "@/lib/errors";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function HesapBolumu() {
  const { data: profil } = useProfile();
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [siliniyor, setSiliniyor] = useState(false);

  const onayli =
    profil != null &&
    emailInput.trim().toLowerCase() === profil.email.toLowerCase();

  async function handleSil() {
    if (!profil || !onayli) return;
    setSiliniyor(true);
    const supabase = createClient();
    try {
      // Önce RPC ile tam silme dene; yoksa kullanıcının verisini sil.
      const { error: rpcError } = await supabase.rpc("delete_own_account");
      if (rpcError) {
        const { error: silHata } = await supabase
          .from("profiles")
          .delete()
          .eq("id", profil.id);
        if (silHata) throw silHata;
      }
      await supabase.auth.signOut().catch(() => {});
      toast.success("Hesabınız silindi");
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error("Hesap silinemedi", {
        description: getSupabaseErrorMessage(error),
      });
      setSiliniyor(false);
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <AlertTriangle className="size-5" />
          Hesabı Sil
        </CardTitle>
        <CardDescription>
          Hesabınızı ve tüm verilerinizi kalıcı olarak siler. Bu işlem geri
          alınamaz.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          onClick={() => {
            setEmailInput("");
            setAcik(true);
          }}
        >
          <Trash2 className="size-4" />
          Hesabımı Kalıcı Olarak Sil
        </Button>
      </CardContent>

      <AlertDialog
        open={acik}
        onOpenChange={(o) => {
          if (!siliniyor) {
            setAcik(o);
            if (!o) setEmailInput("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hesabınızı silmek üzeresiniz</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Tüm gelir, gider, hedef ve tanımlarınız
              kalıcı olarak silinecek. Onaylamak için e-posta adresinizi yazın.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="silOnay">E-posta adresiniz</Label>
            <Input
              id="silOnay"
              type="email"
              autoComplete="off"
              placeholder={profil?.email ?? ""}
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={siliniyor}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={!onayli || siliniyor}
              onClick={(e) => {
                e.preventDefault();
                handleSil();
              }}
              className={buttonVariants({ variant: "destructive" })}
            >
              {siliniyor && <Loader2 className="size-4 animate-spin" />}
              Hesabımı Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
