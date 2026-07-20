"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { http } from "@/lib/http";
import { getMode, setMode, setToken } from "@/lib/mode";
import { ApiRequestError } from "@/lib/types";

const loginSchema = z.object({
  email: z.string().min(1, "請輸入 Email").email("Email 格式不正確"),
  password: z.string().min(1, "請輸入密碼"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginResponse {
  token: string;
  user: { id: string; email: string; name?: string };
}

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    try {
      const data = await http.post<LoginResponse>("/api/v1/auth/login/", values);
      setToken(data.token);
      // 從「本機模式」的同步設定前來登入時（features/sync 的「前往登入」導向這裡），
      // 目的只是取得 token 以開啟雲端同步，不應把使用者切到 auth 模式——那會讓
      // resource.ts 改走 HTTP，等於看不到本機 Dexie 裡的真實資料。只有從落地頁
      // 「登入雲端」（此時尚未設定 mode）進來時才真正切換為 auth 模式。
      if (getMode() !== "local") {
        setMode("auth");
      }
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setFormError(error.message || "登入失敗，請確認帳號密碼。");
      } else {
        setFormError("登入失敗，請稍後再試一次。");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex w-full flex-col gap-4">
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="密碼"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />

      {formError ? (
        <p role="alert" className="text-caption text-danger">
          {formError}
        </p>
      ) : null}

      <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
        登入
      </Button>
    </form>
  );
}
