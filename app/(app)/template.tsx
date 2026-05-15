"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Sayfa geçişlerinde yumuşak giriş animasyonu.
 * template.tsx her gezinmede yeniden oluşturulur.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
