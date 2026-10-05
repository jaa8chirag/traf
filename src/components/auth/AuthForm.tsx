"use client";

import { useActionState } from "react";
import { requestCodeAction, verifyCodeAction, type AuthFormState } from "@/app/(auth)/actions";
import { Button, Field, Input } from "@/components/ui";
import { t } from "@/lib/i18n/t";

interface Props {
  purpose: "login" | "admin_login";
  intent: "buyer" | "supplier";
  next?: string;
  googleHref?: string;
}

const initial: AuthFormState = { step: "email", email: "" };

export function AuthForm({ purpose, intent, next, googleHref }: Props) {
  const [emailState, requestCode, requesting] = useActionState(requestCodeAction, initial);
  const [codeState, verifyCode, verifying] = useActionState(verifyCodeAction, { step: "code", email: "" } satisfies AuthFormState);

  // Step 1 result seeds step 2: show the code form once an email was accepted.
  const onCodeStep = emailState.step === "code";
  const error = onCodeStep ? codeState.error : emailState.error;

  const hidden = (
    <>
      <input type="hidden" name="purpose" value={purpose} />
      <input type="hidden" name="intent" value={intent} />
      {next && <input type="hidden" name="next" value={next} />}
    </>
  );

  if (!onCodeStep) {
    return (
      <form action={requestCode} className="space-y-4" noValidate>
        {hidden}
        <Field label={t("auth.email")} error={error}>
          {(p) => <Input {...p} name="email" type="email" autoComplete="email" required defaultValue={emailState.email} />}
        </Field>
        <Button type="submit" className="w-full" disabled={requesting}>
          {t("auth.sendCode")}
        </Button>
        {googleHref && purpose === "login" && (
          <a
            href={googleHref}
            className="flex h-10 w-full items-center justify-center rounded-full border border-line bg-white text-sm font-medium hover:bg-paper-2"
          >
            {t("auth.google")}
          </a>
        )}
      </form>
    );
  }

  return (
    <form action={verifyCode} className="space-y-4" noValidate>
      {hidden}
      <input type="hidden" name="email" value={emailState.email} />
      <p className="text-sm text-muted">{t("auth.codeSent", { email: emailState.email, minutes: 10 })}</p>
      <Field label={t("auth.code")} error={error}>
        {(p) => (
          <Input {...p} name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus />
        )}
      </Field>
      <Button type="submit" className="w-full" disabled={verifying}>
        {t("auth.verify")}
      </Button>
    </form>
  );
}
