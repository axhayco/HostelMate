import { Hostel } from "@/data/hostels";
import { MapPin, Star, Trash2, MessageCircle, Zap } from "lucide-react";

import { DEFAULT_HOSTEL_IMAGE, handleImageError } from "@/lib/imageUtils";

interface HostelCardProps {
  hostel: Hostel;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
  onClick?: () => void;
}

const WHATSAPP_NUMBER = "919999999999"; // ← Replace with your actual number

const HostelCard = ({ hostel, onDelete, showDelete, onClick }: HostelCardProps) => {
  const vacancyColor =
    hostel.vacancies === 0
      ? "text-destructive"
      : hostel.vacancies <= 3
        ? "text-amber-500"
        : "text-emerald-500";

  const isLowVacancy = hostel.vacancies > 0 && hostel.vacancies <= 3;
  const isFull = hostel.vacancies === 0;

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const msg = encodeURIComponent(
      `Hi! I'm interested in ${hostel.name} in ${hostel.location}. Is it available? (₹${hostel.rent.toLocaleString()}/mo)`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
  };

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl bg-card border border-border/60 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card-hover hover:border-primary/40 ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      {/* Image Container with Dynamic Overlay Gradient */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={hostel.image || DEFAULT_HOSTEL_IMAGE}
          alt={hostel.name}
          onError={handleImageError}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />

        {/* Ambient Top Shadow Overlay for Badge Contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20 opacity-80" />

        {/* Rating badge with motion pop */}
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-xs font-bold shadow-md backdrop-blur-md transition-transform duration-300 group-hover:scale-105">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 animate-spin" style={{ animationDuration: "10s" }} />
          <span>{hostel.rating}</span>
        </div>

        {/* Urgency badge with Beacon Ping */}
        {isLowVacancy && (
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-amber-500/95 px-3 py-1 text-xs font-extrabold text-white shadow-lg backdrop-blur-md animate-pulse-subtle">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-beacon-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <Zap className="h-3.5 w-3.5 fill-white text-white" />
            <span>Only {hostel.vacancies} left!</span>
          </div>
        )}

        {isFull && (
          <div className="absolute left-2.5 top-2.5 rounded-full bg-destructive/90 px-3 py-1 text-xs font-bold text-white shadow-md backdrop-blur-md">
            Full Occupancy
          </div>
        )}

        {/* Floating Category/Gender Tag if available */}
        <div className="absolute left-2.5 bottom-2.5 flex items-center gap-1.5">
          <span className="rounded-lg bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md border border-white/20">
            Verified Stay
          </span>
        </div>

        {/* Delete button */}
        {showDelete && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(hostel.id);
            }}
            className="absolute top-2.5 left-2.5 rounded-full bg-destructive/90 p-2 text-destructive-foreground shadow-md backdrop-blur-md transition-all hover:bg-destructive hover:scale-110 active:scale-95"
            title="Delete Hostel"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Card Content with Motion Details */}
      <div className="p-4">
        <h3 className="font-bold text-foreground text-base leading-snug group-hover:text-primary transition-colors line-clamp-1">
          {hostel.name}
        </h3>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70 animate-bounce" style={{ animationDuration: "3s" }} />
          <span className="line-clamp-1">{hostel.location}</span>
        </div>

        <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/40">
          <div>
            <span className="text-xl font-extrabold text-primary tracking-tight">
              ₹{hostel.rent.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground font-medium"> /mo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${hostel.vacancies > 0 ? "bg-emerald-500 animate-ping" : "bg-destructive"}`} style={{ animationDuration: "2.5s" }} />
            <span className={`text-xs font-bold ${vacancyColor}`}>
              {isFull ? "Full" : `${hostel.vacancies} beds open`}
            </span>
          </div>
        </div>

        {/* CTA — WhatsApp Interactive Shimmer Button */}
        {!isFull && (
          <button
            onClick={handleWhatsApp}
            className="relative overflow-hidden mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-300 hover:bg-emerald-600 hover:shadow-emerald-500/25 active:scale-[0.98]"
          >
            <span className="absolute inset-0 w-1/2 h-full bg-white/20 -skew-x-12 animate-shimmer" />
            <MessageCircle className="h-4 w-4 transition-transform group-hover:rotate-12" />
            <span>Get This Hostel</span>
          </button>
        )}

        {isFull && (
          <button
            onClick={handleWhatsApp}
            className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:bg-secondary/80 active:scale-[0.98]"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Join Waitlist</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default HostelCard;