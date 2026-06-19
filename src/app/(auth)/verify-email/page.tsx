import { Suspense } from "react";
import VerifyEmailForm from "./verify-email-form";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading verification...</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
