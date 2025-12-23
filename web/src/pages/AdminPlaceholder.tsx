import { motion } from "framer-motion";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Construction } from "lucide-react";

interface AdminPlaceholderProps {
  title: string;
  description: string;
}

export default function AdminPlaceholder({ title, description }: AdminPlaceholderProps) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="px-8 py-6">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-3xl text-foreground"
            >
              {title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground mt-1"
            >
              {description}
            </motion.p>
          </div>
        </header>

        <div className="p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
              <Construction className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-display text-xl text-foreground mb-2">Coming Soon</h3>
            <p className="text-muted-foreground text-center max-w-md">
              This feature is currently under development. Check back soon for updates!
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
