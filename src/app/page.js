import Image from "next/image";
import logo from "./assets/logo.png";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-8 font-[family-name:var(--font-geist-sans)] bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      <main className="flex flex-col items-center text-center w-full max-w-2xl mx-auto">
        {/* Logo would go here - add if you have one */}
        <Image
          src={logo}
          width={120}
          height={120}
          alt="Logo"
          className="mb-8"
        />

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
          Coming Soon
        </h1>

        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-md">
          We are working hard to bring you something amazing. Stay tuned!
        </p>

        <div className="w-full max-w-md">
          <div className="relative">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-5 py-3 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors">
              Notify Me
            </button>
          </div>
        </div>
      </main>

      <footer className="mt-auto py-8 text-sm text-gray-500 dark:text-gray-400">
        <p>© {new Date().getFullYear()} Bite&Co. All rights reserved.</p>
      </footer>
    </div>
  );
}
