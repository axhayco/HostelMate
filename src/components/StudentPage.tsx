import { Hostel } from "@/data/hostels";
import { useState, useMemo } from "react";
import { DEFAULT_HOSTEL_IMAGE, handleImageError } from "@/lib/imageUtils";
import { Search, Heart, ChevronDown, ChevronRight, Star, LayoutGrid, Map, MessageCircle, Zap } from "lucide-react";
import HostelCard from "./HostelCard";
import HostelMap from "./HostelMap";

interface StudentPageProps {
  hostels: Hostel[];
  onSelectHostel?: (hostel: Hostel) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

const CATEGORIES = [
  { id: "all", label: "All", emoji: "🏠" },
  { id: "male", label: "Boys", emoji: "👦" },
  { id: "female", label: "Girls", emoji: "👧" },
  { id: "budget", label: "Budget", emoji: "💰" },
  { id: "premium", label: "Premium", emoji: "✨" },
];

const WHATSAPP_NUMBER = "919999999999"; // ← Replace with your actual number

// Inline card used in horizontal scroll sections
function ScrollCard({
  hostel,
  isFav,
  onFav,
  onSelect,
}: {
  hostel: Hostel;
  isFav: boolean;
  onFav: () => void;
  onSelect: () => void;
}) {
  const isLow = hostel.vacancies > 0 && hostel.vacancies <= 3;
  const isFull = hostel.vacancies === 0;

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const msg = encodeURIComponent(
      `Hi! I'm interested in ${hostel.name} in ${hostel.location}. Is it available? (₹${hostel.rent.toLocaleString()}/mo)`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
  };

  return (
    <div className="group relative flex-shrink-0 w-[200px] sm:w-[220px] transition-all duration-300 hover:-translate-y-1">
      {/* Image — clicking opens detail */}
      <div className="cursor-pointer" onClick={onSelect}>
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted border border-border/60 shadow-sm">
          <img
            src={hostel.image || DEFAULT_HOSTEL_IMAGE}
            alt={hostel.name}
            onError={handleImageError}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 opacity-70" />

          {isLow && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-amber-500/95 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md backdrop-blur-md animate-pulse-subtle">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-beacon-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              <Zap className="h-3 w-3" />
              Only {hostel.vacancies} left
            </div>
          )}
          {isFull && (
            <div className="absolute bottom-2 left-2 rounded-full bg-destructive/90 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md backdrop-blur-md">
              Full
            </div>
          )}
        </div>
        <div className="mt-2.5 px-0.5">
          <p className="truncate text-sm font-extrabold text-foreground group-hover:text-primary transition-colors">{hostel.name}</p>
          <p className="truncate text-xs text-muted-foreground font-medium">{hostel.location}</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-sm font-extrabold text-primary">
              ₹{hostel.rent.toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground">/mo</span>
            </span>
            <div className="flex items-center gap-1 text-xs font-bold text-foreground">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>{hostel.rating}</span>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp CTA */}
      {!isFull ? (
        <button
          onClick={handleWhatsApp}
          className="relative overflow-hidden mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-xs font-extrabold text-white shadow-sm transition-all duration-300 hover:bg-emerald-600 active:scale-95"
        >
          <span className="absolute inset-0 w-1/2 h-full bg-white/20 -skew-x-12 animate-shimmer" />
          <MessageCircle className="h-3.5 w-3.5" />
          <span>Get Hostel</span>
        </button>
      ) : (
        <button
          onClick={handleWhatsApp}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary py-2 text-xs font-bold text-muted-foreground transition-all hover:bg-secondary/80"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          <span>Waitlist</span>
        </button>
      )}

      {/* Guest favourite badge */}
      {hostel.rating >= 4.5 && (
        <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-card/90 px-2.5 py-1 text-[10px] font-extrabold text-foreground shadow-sm backdrop-blur-md">
          Guest favourite
        </span>
      )}

      {/* Heart */}
      <button
        onClick={(e) => { e.stopPropagation(); onFav(); }}
        className="absolute right-2.5 top-2.5 z-10 rounded-full bg-card/90 p-1.5 shadow-md backdrop-blur-md transition-all hover:scale-110 active:scale-95"
      >
        <Heart
          className={`h-4.5 w-4.5 transition-colors ${isFav ? "fill-primary text-primary" : "text-muted-foreground stroke-[2]"
            }`}
        />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const StudentPage = ({ hostels: allHostels, onSelectHostel, favorites, onToggleFavorite }: StudentPageProps) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"price" | "rating" | "vacancies">("rating");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  const filtered = useMemo(() => {
    let list = [...allHostels];
    if (category === "male") list = list.filter((h) => h.gender === "male");
    else if (category === "female") list = list.filter((h) => h.gender === "female");
    else if (category === "budget") list = list.filter((h) => h.rent <= 6500);
    else if (category === "premium") list = list.filter((h) => h.rent > 7000);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (h) => h.name.toLowerCase().includes(q) || h.location.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === "price") return a.rent - b.rent;
      if (sortBy === "rating") return b.rating - a.rating;
      return b.vacancies - a.vacancies;
    });
    return list;
  }, [search, category, sortBy, allHostels]);

  const groupedByLocation = useMemo(() => {
    const groups: Record<string, Hostel[]> = {};
    filtered.forEach((h) => {
      const area = h.location.split(",")[0].trim();
      if (!groups[area]) groups[area] = [];
      groups[area].push(h);
    });
    return Object.entries(groups);
  }, [filtered]);

  const topRated = useMemo(
    () => [...filtered].sort((a, b) => b.rating - a.rating).slice(0, 6),
    [filtered]
  );

  return (
    <div className="relative min-h-screen bg-background pb-28">

      {/* ── Ambient Background Glow Blobs ────────────────────────────────────── */}
      <div className="pointer-events-none fixed top-0 left-1/4 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none fixed bottom-20 right-1/4 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />

      {/* ── Animated Urgency & Live Status Strip ──────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/15 via-primary/15 to-amber-500/15 border-b border-amber-500/20 px-4 py-2 text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75 animate-beacon-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 animate-bounce" style={{ animationDuration: "2s" }} />
          <span>⚡ Live Room Updates — 100% Verified Student Hostels in Hyderabad</span>
        </div>
      </div>

      {/* ── Search & Hero Filter Header ───────────────────────────────────────── */}
      <div className="px-4 pb-3 pt-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by hostel name, landmark or area (e.g. Madhapur, Gachibowli)..."
            className="w-full rounded-2xl border border-border bg-card/90 py-3.5 pl-11 pr-4 text-sm text-foreground shadow-card backdrop-blur-md outline-none transition-all duration-300 focus:border-primary focus:ring-4 focus:ring-primary/15 focus:shadow-card-hover"
          />
        </div>
      </div>

      {/* ── Category tabs with dynamic motion ─────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const isActive = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`group relative flex flex-shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105"
                    : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/60"
                }`}
              >
                <span className="text-base transition-transform group-hover:scale-110">{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}

          {/* Sort & Map Toggle Controls */}
          <div className="ml-auto flex flex-shrink-0 items-center gap-2 pl-3 border-l border-border/60">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none rounded-xl border border-border bg-card py-2 pl-3 pr-7 text-xs font-semibold text-foreground shadow-sm outline-none transition-all hover:border-primary focus:border-primary"
              >
                <option value="rating">⭐ Rating</option>
                <option value="price">💰 Rent</option>
                <option value="vacancies">🛏️ Beds</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
            <button
              onClick={() => setViewMode(viewMode === "grid" ? "map" : "grid")}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card p-2 text-xs font-bold text-foreground shadow-sm transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary active:scale-95"
              title="Toggle View Mode"
            >
              {viewMode === "grid" ? <Map className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Content Grid / Map View ────────────────────────────────────────── */}
      {viewMode === "map" ? (
        <div className="px-4 pt-4 animate-fade-up">
          <HostelMap hostels={filtered} />
        </div>
      ) : search.trim() ? (
        /* Search results grid */
        <div className="px-4 pt-4">
          {filtered.length === 0 ? (
            <div className="py-20 text-center animate-fade-up">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 animate-bounce">
                <Search className="h-8 w-8" />
              </div>
              <p className="text-lg font-bold text-foreground">No hostels matched your search</p>
              <p className="mt-1 text-sm text-muted-foreground">Try typing another area name like Gachibowli or Kukatpally</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((h, i) => (
                <div
                  key={h.id}
                  className="relative animate-fade-up"
                  style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "both" }}
                >
                  <HostelCard hostel={h} onClick={() => onSelectHostel?.(h)} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(h.id);
                    }}
                    className="absolute right-3.5 top-3.5 z-10 rounded-full bg-card/90 p-2 shadow-md backdrop-blur-md transition-all hover:scale-110 active:scale-95"
                  >
                    <Heart
                      className={`h-5 w-5 transition-colors ${
                        favorites.includes(h.id) ? "fill-primary text-primary" : "text-muted-foreground stroke-[2]"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Browse mode with animated location carousels */
        <div className="pt-4 space-y-8">
          {/* Top Rated Section */}
          {topRated.length > 0 && (
            <section className="animate-fade-up">
              <div className="mb-3 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-amber-500 animate-ping" />
                  <h2 className="text-lg font-extrabold text-foreground tracking-tight">Top Rated Hostels</h2>
                </div>
                <button className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                  <span>View All</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto px-4 pb-3 scrollbar-hide">
                {topRated.map((h) => (
                  <ScrollCard
                    key={h.id}
                    hostel={h}
                    isFav={favorites.includes(h.id)}
                    onFav={() => onToggleFavorite(h.id)}
                    onSelect={() => onSelectHostel?.(h)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Location Groupings */}
          {groupedByLocation.map(([area, hostels], idx) => (
            <section key={area} className="animate-fade-up" style={{ animationDelay: `${idx * 0.1}s` }}>
              <div className="mb-3 flex items-center justify-between px-4">
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">Stays in {area}</h2>
                <button className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                  <span>Explore Area</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto px-4 pb-3 scrollbar-hide">
                {hostels.map((h) => (
                  <ScrollCard
                    key={h.id}
                    hostel={h}
                    isFav={favorites.includes(h.id)}
                    onFav={() => onToggleFavorite(h.id)}
                    onSelect={() => onSelectHostel?.(h)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentPage;