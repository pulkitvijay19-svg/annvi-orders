"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileBottomNav() {
  const pathname = usePathname();

  function itemClass(path) {
    const active = pathname === path || pathname.startsWith(path + "/");

    return `flex flex-col items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold ${
      active ? "bg-black text-white" : "text-gray-600"
    }`;
  }

  return (
    <nav className="no-print fixed bottom-0 left-0 right-0 z-50 border-t bg-white p-2 shadow-lg md:hidden">
      <div className="grid grid-cols-4 gap-2">
        <Link href="/dashboard" className={itemClass("/dashboard")}>
          <span className="text-lg">🏠</span>
          Home
        </Link>

        <Link href="/orders" className={itemClass("/orders")}>
          <span className="text-lg">📋</span>
          Orders
        </Link>

        <Link href="/orders/add" className={itemClass("/orders/add")}>
          <span className="text-lg">➕</span>
          Add
        </Link>

        <Link href="/catalog/upload" className={itemClass("/catalog/upload")}>
          <span className="text-lg">📦</span>
          Catalog
        </Link>
      </div>
    </nav>
  );
}