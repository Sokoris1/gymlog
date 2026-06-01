import { useLocation, Link } from "wouter";
import { Home, Dumbbell, Calendar, Users, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/App";
import { useLang } from "@/App";
import { t } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";

export default function BottomNav() {
  const [location] = useLocation();
  const { userId } = useAuth();
  const { lang } = useLang();

  const tabs = [
    { href: "/",         icon: Home,     label: t("nav.home", lang) },
    { href: "/workout",  icon: Dumbbell, label: t("nav.workout", lang) },
    { href: "/calendar", icon: Calendar, label: t("nav.calendar", lang) },
    { href: "/friends",  icon: Users,    label: t("nav.friends", lang) },
    { href: "/profile",  icon: User,     label: t("nav.profile", lang) },
  ];

  const { data } = useQuery({
    queryKey: ["/api/notifications", userId, "unread"],
    queryFn: () => apiRequest("GET", `/api/notifications/${userId}`).then(r => r.json()),
    enabled: !!userId,
    refetchInterval: 30000,
  });

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border safe-bottom">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {tabs.map(({ href, icon: Icon, label }) => {
          const isActive = href === "/" ? location === "/" : location.startsWith(href);
          return (
            <Link key={href} href={href}>
              <button
                data-testid={`nav-${href.replace("/", "") || "home"}`}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[3.5rem] relative ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="relative">
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  {href === "/profile" && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium leading-tight text-center ${isActive ? "text-primary" : ""}`}>
                  {label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
