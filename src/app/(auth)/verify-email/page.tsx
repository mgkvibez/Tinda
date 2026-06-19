import { Suspense } from "react";
import dynamic from "next/dynamic";

const VerifyEmailForm = dynamic(
  () => import("./verify-email-form"),
  {
    suspense: true,
  }
);

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading verification...</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
