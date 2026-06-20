"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function Header() {
  return (
    <header className="w-full border-b border-border bg-card/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className={cn("flex items-center gap-3")}>
          <Image src="/tinda-logo.svg" alt="Tinda" width={40} height={40} priority />
          <span className="text-lg font-semibold tracking-tight text-foreground hidden sm:inline">Tinda</span>
        </Link>

        <nav className="flex items-center gap-4">
          {/* reserved for future nav items / auth buttons */}
        </nav>
      </div>
    </header>
  );
}
