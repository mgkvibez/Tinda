"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const SignupForm = dynamic(() => import("./signup-form").then((mod) => mod.SignupForm), {
  ssr: false,
});

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
