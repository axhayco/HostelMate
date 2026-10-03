import { Search, Heart, CalendarDays, MessageCircle, User } from "lucide-react";

type Tab = "explore" | "wishlists" | "trips" | "messages" | "profile";

interface BottomNavProps {
  active: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "explore", label: "Explore", icon: Search },
  { id: "wishlists", label: "Wishlists", icon: Heart },
  { id: "trips", label: "Trips", icon: CalendarDays },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "profile", label: "Profile", icon: User },
];

const BottomNav = ({ active, onTabChange }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-card/90 backdrop-blur-xl shadow-lg safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around px-3 py-2">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`relative flex flex-col items-center gap-1 rounded-2xl px-3.5 py-1.5 text-[11px] font-bold transition-all duration-300 ${
                isActive
                  ? "text-primary scale-105"
                  : "text-muted-foreground hover:text-foreground hover:scale-100"
              }`}
            >
              {/* Active Tab Glow & Indicator Line */}
              {isActive && (
                <span className="absolute -top-2 h-1 w-6 rounded-full bg-primary shadow-sm shadow-primary animate-pulse" />
              )}
              {isActive && (
                <span className="absolute inset-0 rounded-2xl bg-primary/10 -z-10 animate-scale-pop" />
              )}
              <Icon
                className={`h-5 w-5 transition-transform duration-300 ${
                  isActive ? "stroke-[2.5] scale-110" : "stroke-[1.75]"
                }`}
                fill={isActive && id === "wishlists" ? "currentColor" : "none"}
              />
              <span className="tracking-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
