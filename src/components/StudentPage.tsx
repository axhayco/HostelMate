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
    <div className="relative flex-shrink-0 w-[200px] sm:w-[220px]">
      {/* Image — clicking opens detail */}
      <div className="cursor-pointer" onClick={onSelect}>
        <div className="relative aspect-square overflow-hidden rounded-xl">
          <img
            src={hostel.image || DEFAULT_HOSTEL_IMAGE}
            alt={hostel.name}
            onError={handleImageError}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
          {isLow && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-lg bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
              <Zap className="h-2.5 w-2.5" />
              Only {hostel.vacancies} left
            </div>
          )}
          {isFull && (
            <div className="absolute bottom-2 left-2 rounded-lg bg-destructive/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
              Full
            </div>
          )}
        </div>
        <div className="mt-2">
          <p className="truncate text-sm font-semibold text-foreground">{hostel.name}</p>
          <p className="truncate text-xs text-muted-foreground">{hostel.location}</p>
          <p className="mt-0.5 text-sm text-foreground">
            <span className="font-semibold">₹{hostel.rent.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">/mo</span>
            <span className="text-xs text-muted-foreground"> · </span>
            <Star className="mb-0.5 inline h-3 w-3 fill-foreground text-foreground" />
            <span className="text-xs font-medium"> {hostel.rating}</span>
          </p>
        </div>
      </div>

      {/* WhatsApp CTA */}
      {!isFull ? (
        <button
          onClick={handleWhatsApp}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-600 active:scale-95"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Get This Hostel
        </button>
      ) : (
        <button
          onClick={handleWhatsApp}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/80"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Join Waitlist
        </button>
      )}

      {/* Guest favourite badge */}
      {hostel.rating >= 4.5 && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-card/90 px-2.5 py-1 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur-sm">
          Guest favourite
        </span>
      )}

      {/* Heart */}
      <button
        onClick={(e) => { e.stopPropagation(); onFav(); }}
        className="absolute right-2 top-2 z-10 transition-transform hover:scale-110 active:scale-95"
      >
        <Heart
          className={`h-6 w-6 drop-shadow-md ${isFav ? "fill-primary text-primary" : "fill-foreground/30 text-card stroke-[1.5]"
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
    <div className="min-h-screen bg-background pb-24">

      {/* ── Urgency strip ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-1.5 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
        <Zap className="h-3.5 w-3.5" />
        ⚡ Limited rooms — listings updated daily
      </div>

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <div className="px-4 pb-2 pt-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or area..."
            className="w-full rounded-full border border-border bg-card py-3.5 pl-11 pr-4 text-sm text-foreground shadow-card outline-none transition-all focus:border-primary focus:shadow-card-hover"
          />
        </div>
      </div>

      {/* ── Category tabs ─────────────────────────────────────────────────── */}
      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto px-4 py-3 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex flex-shrink-0 flex-col items-center gap-1 px-4 py-1.5 transition-all ${category === cat.id
                  ? "border-b-2 border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <span className="text-xl">{cat.emoji}</span>
              <span className="whitespace-nowrap text-[10px] font-semibold">{cat.label}</span>
            </button>
          ))}

          {/* Sort & View */}
          <div className="ml-auto flex flex-shrink-0 items-center gap-2 pl-3">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none rounded-lg border border-input bg-card py-1.5 pl-3 pr-7 text-[10px] font-semibold text-foreground outline-none"
              >
                <option value="rating">Rating</option>
                <option value="price">Price</option>
                <option value="vacancies">Beds</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            </div>
            <button
              onClick={() => setViewMode(viewMode === "grid" ? "map" : "grid")}
              className="rounded-lg border border-input bg-card p-2 text-foreground transition-colors hover:bg-secondary"
            >
              {viewMode === "grid" ? <Map className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {viewMode === "map" ? (
        <div className="px-4 pt-4">
          <HostelMap hostels={filtered} />
        </div>

      ) : search.trim() ? (
        /* Search results: flat grid using HostelCard */
        <div className="px-4 pt-4">
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <p className="text-lg font-medium">No hostels found</p>
              <p className="mt-1 text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((h, i) => (
                <div
                  key={h.id}
                  className="relative animate-fade-up"
                  style={{ animationDelay: `${i * 0.06}s`, animationFillMode: "both" }}
                >
                  {/* HostelCard now receives onClick — no wrapper div needed */}
                  <HostelCard
                    hostel={h}
                    onClick={() => onSelectHostel?.(h)}
                  />
                  {h.rating >= 4.5 && (
                    <span className="absolute left-3 top-3 z-10 rounded-full bg-card/90 px-2.5 py-1 text-[10px] font-semibold text-foreground backdrop-blur-sm">
                      Guest favourite
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(h.id); }}
                    className="absolute right-3 top-3 z-10 transition-transform hover:scale-110 active:scale-95"
                  >
                    <Heart
                      className={`h-6 w-6 drop-shadow-md ${favorites.includes(h.id)
                          ? "fill-primary text-primary"
                          : "fill-foreground/30 text-card stroke-[1.5]"
                        }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      ) : (
        /* Browse mode: horizontal sections with WhatsApp CTAs */
        <div className="pt-4">

          {/* Top Rated */}
          {topRated.length > 0 && (
            <section className="mb-6">
              <div className="mb-3 flex items-center justify-between px-4">
                <h2 className="text-lg font-bold text-foreground">Top rated hostels</h2>
                <button className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary">
                  <ChevronRight className="h-4 w-4 text-foreground" />
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide">
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

          {/* Grouped by area */}
          {groupedByLocation.map(([area, hostels]) => (
            <section key={area} className="mb-6">
              <div className="mb-3 flex items-center justify-between px-4">
                <h2 className="text-lg font-bold text-foreground">Hostels in {area}</h2>
                <button className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary">
                  <ChevronRight className="h-4 w-4 text-foreground" />
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide">
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