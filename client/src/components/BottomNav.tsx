import { useLocation, Link, useRoute } from "wouter";
import { Home, Dumbbell, Calendar, Users, User, Timer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/App";
import { useLang } from "@/App";
import { t } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { getActiveWorkout, setActiveWorkout } from "@/lib/store";
import { useEffect, useState } from "react";

export default function BottomNav() {
  const [location] = useLocation();
  const [, isActiveWorkoutRoute] = useRoute("/workout/active/:id");
  const { userId } = useAuth();
  const { lang } = useLang();
  const ru = lang === "ru";

  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) { setActiveId(null); return; }

    const check = async () => {
      const { id } = getActiveWorkout(userId);
      if (id === null) { setActiveId(null); return; }

      // Verify the workout is still open on the server.
      // If it already has endTime, clear the stale store entry.
      try {
        const data = await apiRequest("GET", `/api/workout/${id}`).then(r => r.json());
        if (data?.endTime) {
          setActiveWorkout(null, userId);
          setActiveId(null);
        } else {
          setActiveId(id);
        }
      } catch {
        // Network error — keep showing banner to let user navigate back
        setActiveId(id);
      }
    };

    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [userId]);

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

  // Don't show banner when already on active workout page
  const showBanner = activeId !== null && !isActiveWorkoutRoute;

  return (
    <>
      {/* Active workout banner */}
      {showBanner && (
        <Link href={`/workout/active/${activeId}`}>
          <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-3 right-3 z-40
            bg-primary text-primary-foreground rounded-2xl px-4 py-3
            flex items-center gap-3 shadow-lg cursor-pointer hover:bg-primary/90 transition-colors">
            <div className="w-8 h-8 rounded-xl bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
              <Timer size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">
                {ru ? "Тренировка в процессе" : "Workout in progress"}
              </div>
              <div className="text-primary-foreground/70 text-xs">
                {ru ? "Нажмите чтобы вернуться" : "Tap to continue"}
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 opacity-70">
              <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </Link>
      )}

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
    </>
  );
}
