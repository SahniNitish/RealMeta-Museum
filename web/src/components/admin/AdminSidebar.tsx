import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ImagePlus,
  Images,
  LayoutDashboard,
  Settings,
  QrCode,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: ImagePlus, label: "Upload Artwork", path: "/admin/upload" },
  { icon: Images, label: "Collection", path: "/admin/collection" },
  { icon: QrCode, label: "QR Codes", path: "/admin/qr-codes" },
  { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

export const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, museum, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0"
    >
      {/* Logo + Museum Name */}
      <div className="p-6 border-b border-sidebar-border">
        <motion.div
          className="flex items-center gap-3"
          animate={{ justifyContent: collapsed ? "center" : "flex-start" }}
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
            <img src="/realmeta-symbol.png" alt="RealMeta" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h1 className="font-display text-xl text-foreground">RealMeta</h1>
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                {museum?.name || "Museum Admin"}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item, index) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => navigate(item.path)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              isActive(item.path)
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className={cn("w-5 h-5 shrink-0", isActive(item.path) && "text-primary")} />
            {!collapsed && (
              <span className="font-medium">{item.label}</span>
            )}
            {isActive(item.path) && !collapsed && (
              <motion.div
                layoutId="active-indicator"
                className="ml-auto w-2 h-2 rounded-full bg-primary"
              />
            )}
          </motion.button>
        ))}
      </nav>

      {/* Theme Toggle + Collapse */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {!collapsed && <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span className="font-medium">Collapse</span>}
        </button>
      </div>

      {/* User */}
      <div className="p-4 border-t border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3",
          collapsed && "justify-center"
        )}>
          <button
            onClick={() => navigate("/admin/profile")}
            title="My Profile"
            className="w-10 h-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center hover:border-primary/50 transition-colors shrink-0"
          >
            <span className="text-sm font-medium text-foreground">
              {admin?.name ? getInitials(admin.name) : "AD"}
            </span>
          </button>
          {!collapsed && (
            <button
              onClick={() => navigate("/admin/profile")}
              className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
            >
              <p className="text-sm font-medium text-foreground truncate">
                {admin?.name || "Admin"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {admin?.email || "admin@museum.com"}
              </p>
            </button>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={handleLogout}
            title="Logout"
            className="w-full mt-2 p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.aside>
  );
};
