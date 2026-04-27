import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500 dark:text-gray-400">
        <p>© {year} ResumeIQ. All rights reserved. Developed by Bablou.</p>
        <Link
          href="/copyright"
          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          Copyright & Legal
        </Link>
      </div>
    </footer>
  );
}
