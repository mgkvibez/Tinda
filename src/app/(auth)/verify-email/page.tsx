import { Suspense } from "react";
import dynamic from "next/dynamic";

const VerifyEmailForm = dynamic(() => import("./verify-email-form"), { ssr: false });

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
