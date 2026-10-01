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
      className={`group overflow-hidden rounded-2xl bg-card shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 ${onClick ? "cursor-pointer" : ""}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={hostel.image || DEFAULT_HOSTEL_IMAGE}
          alt={hostel.name}
          onError={handleImageError}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Rating badge */}
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-card/90 px-2 py-1 text-xs font-semibold backdrop-blur-sm">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          {hostel.rating}
        </div>

        {/* Urgency badge */}
        {isLowVacancy && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-amber-500/90 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
            <Zap className="h-3 w-3" />
            Only {hostel.vacancies} left!
          </div>
        )}
        {isFull && (
          <div className="absolute left-2 top-2 rounded-lg bg-destructive/90 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
            Full
          </div>
        )}

        {/* Delete button */}
        {showDelete && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(hostel.id); }}
            className="absolute bottom-2 left-2 rounded-lg bg-destructive/90 p-1.5 text-destructive-foreground backdrop-blur-sm transition-all hover:bg-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5">
        <h3 className="font-semibold text-foreground leading-tight">{hostel.name}</h3>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          {hostel.location}
        </div>

        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-lg font-bold text-primary">
            ₹{hostel.rent.toLocaleString()}
            <span className="text-xs font-normal text-muted-foreground">/mo</span>
          </span>
          <span className={`text-xs font-semibold ${vacancyColor}`}>
            {isFull ? "Full" : `${hostel.vacancies} beds left`}
          </span>
        </div>

        {/* CTA — WhatsApp */}
        {!isFull && (
          <button
            onClick={handleWhatsApp}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-600 active:scale-95"
          >
            <MessageCircle className="h-4 w-4" />
            Get This Hostel
          </button>
        )}

        {isFull && (
          <button
            onClick={handleWhatsApp}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/80"
          >
            <MessageCircle className="h-4 w-4" />
            Join Waitlist
          </button>
        )}
      </div>
    </div>
  );
};

export default HostelCard;