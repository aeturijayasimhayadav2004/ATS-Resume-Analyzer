"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, Zap } from "lucide-react";
import { useEffect, useState } from "react";

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-indigo-600 dark:text-indigo-400">
          <Zap className="w-5 h-5" />
          ResumeIQ
        </Link>

        {/* Nav */}
        <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-400">
          <Link href="/analyze" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            Analyze
          </Link>
          <Link href="/history" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            History
          </Link>
          <Link href="/about" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            About
          </Link>
        </nav>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle theme"
        >
          {mounted && theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
}
