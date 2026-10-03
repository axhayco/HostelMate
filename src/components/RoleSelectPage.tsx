import logo from "@/assets/logo.png";
import travelerImg from "@/assets/traveler.png";
import { GraduationCap, Building2, MapPin, Sparkles, Compass, ShieldCheck, ArrowRight } from "lucide-react";

interface RoleSelectPageProps {
  onSelect: (role: "student" | "owner") => void;
  onBack?: () => void;
}

const RoleSelectPage = ({ onSelect }: RoleSelectPageProps) => {
  return (
    <div className="relative min-h-screen w-full bg-background overflow-hidden flex flex-col justify-center">
      {/* Background Decorative Ambient Gradient Blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -right-24 h-96 w-96 rounded-full bg-orange-400/10 blur-3xl" />

      <div className="mx-auto flex w-full max-w-6xl flex-col-reverse lg:flex-row items-center justify-between px-6 py-8 lg:py-12 gap-10 lg:gap-16">
        
        {/* LEFT COLUMN: Motion Graphics & Animated Traveler Character */}
        <div className="relative flex w-full lg:w-1/2 items-center justify-center">
          {/* Animated Background Aura Circle */}
          <div className="absolute h-[340px] w-[340px] sm:h-[420px] sm:w-[420px] rounded-full bg-gradient-to-tr from-primary/20 via-orange-400/15 to-amber-300/20 blur-2xl animate-aura-pulse" />
          
          {/* Main Traveler Container with Floating & Motion Graphics */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            
            {/* Animated Location Beacon Badge */}
            <div className="absolute top-4 left-4 sm:-left-4 z-20 flex items-center gap-2 rounded-2xl border border-white/60 bg-card/90 py-2 px-3.5 shadow-xl backdrop-blur-md animate-float-gentle">
              <div className="relative flex h-3 w-3 items-center justify-center">
                <span className="absolute h-full w-full rounded-full bg-primary opacity-75 animate-beacon-ping" />
                <span className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <Compass className="h-4 w-4 text-primary animate-spin" style={{ animationDuration: "12s" }} />
              <span className="text-xs font-bold text-foreground">Explore Hostels</span>
            </div>

            {/* Verified Hostels Feature Badge */}
            <div className="absolute bottom-12 right-2 sm:-right-6 z-20 flex items-center gap-2 rounded-2xl border border-white/60 bg-card/95 py-2 px-3.5 shadow-xl backdrop-blur-md animate-sway-map" style={{ animationDelay: "1s" }}>
              <ShieldCheck className="h-4.5 w-4.5 text-success" />
              <div>
                <p className="text-[11px] font-extrabold text-foreground">Verified Stays</p>
                <p className="text-[9px] text-muted-foreground">100% Safe & Near Campus</p>
              </div>
            </div>

            {/* Character Image with Motion Graphic Floating Effect */}
            <div className="relative group cursor-pointer transition-transform duration-500 hover:scale-105">
              <img
                src={travelerImg}
                alt="Student Traveler searching for hostel"
                className="max-h-[380px] sm:max-h-[460px] lg:max-h-[500px] w-auto object-contain drop-shadow-2xl animate-float-gentle"
              />

              {/* Interactive Sparkle Highlights */}
              <div className="absolute top-12 right-12 text-amber-400 animate-bounce" style={{ animationDuration: "2.5s" }}>
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
            
            {/* Decorative Ground Shadow */}
            <div className="mt-[-10px] h-4 w-48 rounded-[100%] bg-foreground/10 blur-sm animate-aura-pulse" />
          </div>
        </div>

        {/* RIGHT COLUMN: Welcome Header & Role Selection Options */}
        <div className="w-full lg:w-1/2 max-w-md mx-auto animate-fade-up" style={{ animationFillMode: "both" }}>
          <div className="mb-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary mb-3">
              <Sparkles className="h-3.5 w-3.5" /> Welcome to Hozztl
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Find Your Perfect <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">Student Stay</span>
            </h1>
            <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
              Choose your role below to get started with verified hostels, rent rates, and room availability.
            </p>
          </div>

          <div className="space-y-4">
            {/* Student Card Option */}
            <button
              onClick={() => onSelect("student")}
              className="group relative flex w-full items-center gap-4 rounded-2xl border-2 border-border bg-card p-5 text-left shadow-card transition-all duration-300 hover:border-primary hover:shadow-card-hover hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground shadow-sm">
                <GraduationCap className="h-7 w-7 transition-transform group-hover:scale-110" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-base text-foreground group-hover:text-primary transition-colors">I'm a Student</p>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-primary" />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                  Explore & book verified hostels, room types & amenities near your campus
                </p>
              </div>
            </button>

            {/* Owner Card Option */}
            <button
              onClick={() => onSelect("owner")}
              className="group relative flex w-full items-center gap-4 rounded-2xl border-2 border-border bg-card p-5 text-left shadow-card transition-all duration-300 hover:border-amber-500 hover:shadow-card-hover hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors group-hover:bg-amber-500 group-hover:text-white shadow-sm">
                <Building2 className="h-7 w-7 transition-transform group-hover:scale-110" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-base text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">I'm a Hostel Owner</p>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-amber-500" />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                  List your property, manage vacancies, room pricing & guest enquiries
                </p>
              </div>
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center lg:justify-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" />
            <span>Trusted by 10,000+ students and hostel owners across Hyderabad</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RoleSelectPage;
