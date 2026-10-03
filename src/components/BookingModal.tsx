import { useState } from "react";
import { Hostel } from "@/data/hostels";
import { X, Check, ShieldCheck, Sparkles, BedDouble, Calendar, Building2, Info, ArrowRight } from "lucide-react";
import { Booking } from "@/components/TripsPage";

interface BookingModalProps {
  hostel: Hostel;
  isOpen: boolean;
  onClose: () => void;
  onConfirmBooking: (booking: Booking, selectedBed: string, roomType: string) => void;
}

const ROOM_OPTIONS = [
  { type: "Single Sharing", priceMultiplier: 1.3, desc: "Private room, solo study desk & attached bath" },
  { type: "2 Sharing", priceMultiplier: 1.0, desc: "2 beds per room, shared wardrobe & balcony" },
  { type: "3 Sharing", priceMultiplier: 0.85, desc: "3 beds per room, budget-friendly student option" },
  { type: "4 Sharing", priceMultiplier: 0.75, desc: "Dormitory style, maximum savings" },
];

export const BookingModal = ({ hostel, isOpen, onClose, onConfirmBooking }: BookingModalProps) => {
  const [selectedRoom, setSelectedRoom] = useState("2 Sharing");
  const [selectedBed, setSelectedBed] = useState("Bed A (Room 102)");
  const [checkInDate, setCheckInDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentOption = ROOM_OPTIONS.find((r) => r.type === selectedRoom) || ROOM_OPTIONS[1];
  const calculatedRent = Math.round(hostel.rent * currentOption.priceMultiplier);
  const tokenDeposit = 1000; // Simulated advance token lock

  const handleConfirm = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const newBooking: Booking = {
        id: `bk-${Date.now()}`,
        hostelName: hostel.name,
        location: hostel.location,
        image: hostel.image,
        checkIn: new Date(checkInDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        checkOut: new Date(new Date(checkInDate).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        status: "upcoming",
      };
      onConfirmBooking(newBooking, selectedBed, selectedRoom);
      setIsSubmitting(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-up">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-card border border-border/80 shadow-2xl">
        
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary/15 via-orange-400/10 to-primary/10 px-6 py-5 border-b border-border/60">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 text-xs font-extrabold text-primary uppercase tracking-wider mb-1">
            <Sparkles className="h-3.5 w-3.5" /> Bed Reservation & Escrow Lock
          </div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">{hostel.name}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{hostel.location}</p>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto scrollbar-hide">
          
          {/* 1. Sharing & Room Type Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
              1. Select Room Sharing Type
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {ROOM_OPTIONS.map((opt) => {
                const optRent = Math.round(hostel.rent * opt.priceMultiplier);
                const isSelected = selectedRoom === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setSelectedRoom(opt.type)}
                    className={`flex flex-col text-left p-3 rounded-2xl border transition-all duration-200 ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20 scale-[1.02]"
                        : "border-border bg-secondary/40 text-foreground hover:border-primary/40"
                    }`}
                  >
                    <span className="text-xs font-extrabold">{opt.type}</span>
                    <span className="text-sm font-black text-primary mt-1">₹{optRent.toLocaleString()}<span className="text-[10px] font-normal text-muted-foreground">/mo</span></span>
                    <span className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Bed Allocation Map */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
              2. Select Bed Slot Allocation
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["Bed A (Room 102)", "Bed B (Room 102)", "Bed A (Room 104)", "Bed B (Room 104)", "Bed A (Room 201)", "Bed B (Room 201)"].map((bed, idx) => {
                const isSelected = selectedBed === bed;
                const isTaken = idx === 1 || idx === 4; // Simulated occupied beds
                return (
                  <button
                    key={bed}
                    type="button"
                    disabled={isTaken}
                    onClick={() => setSelectedBed(bed)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      isTaken
                        ? "border-border bg-muted/60 text-muted-foreground opacity-50 cursor-not-allowed"
                        : isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-sm scale-105"
                        : "border-border bg-card text-foreground hover:border-primary/40"
                    }`}
                  >
                    <BedDouble className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{bed.split(" ")[0]} {bed.split(" ")[1]}</span>
                    {isTaken && <span className="ml-auto text-[9px] font-extrabold text-destructive">Taken</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Check-In Date */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              3. Expected Check-In Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full rounded-2xl border border-input bg-background py-2.5 pl-10 pr-4 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Escrow Token Summary & Gateway Notice */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Advance Token Lock</span>
              <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">₹{tokenDeposit.toLocaleString()}</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300 leading-snug">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              <span>No online gateway payment required today. Token locks your bed slot for 48 hours for physical check-in & verification.</span>
            </div>
          </div>

        </div>

        {/* Footer Action */}
        <div className="border-t border-border/80 bg-card p-4">
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="relative overflow-hidden flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground shadow-lg transition-all duration-300 hover:bg-primary/95 active:scale-[0.98] disabled:opacity-50"
          >
            <span className="absolute inset-0 w-1/2 h-full bg-white/20 -skew-x-12 animate-shimmer" />
            {isSubmitting ? (
              <span>Reserving Bed Slot…</span>
            ) : (
              <>
                <span>Reserve Bed & Generate Token Receipt</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
