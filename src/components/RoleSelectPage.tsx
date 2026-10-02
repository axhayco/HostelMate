import logo from "@/assets/logo.png";
import { GraduationCap, Building2 } from "lucide-react";

interface RoleSelectPageProps {
  onSelect: (role: "student" | "owner") => void;
  onBack?: () => void;
}

const RoleSelectPage = ({ onSelect, onBack }: RoleSelectPageProps) => {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6 pt-12">
      <div className="w-full max-w-sm animate-fade-up" style={{ animationFillMode: "both" }}>
        <div className="mb-8 flex flex-col items-center">
          <img src={logo} alt="HostelMate" className="mb-4 h-20 w-20" />
          <h1 className="text-2xl font-bold text-foreground">Welcome to HostelMate</h1>
          <p className="mt-1 text-sm text-muted-foreground">How would you like to continue?</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => onSelect("student")}
            className="flex w-full items-center gap-4 rounded-2xl border border-input bg-card p-5 text-left shadow-sm transition-all hover:border-primary hover:shadow-card-hover active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">I'm a Student</p>
              <p className="text-xs text-muted-foreground">Search & book hostels near your campus</p>
            </div>
          </button>

          <button
            onClick={() => onSelect("owner")}
            className="flex w-full items-center gap-4 rounded-2xl border border-input bg-card p-5 text-left shadow-sm transition-all hover:border-primary hover:shadow-card-hover active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/50">
              <Building2 className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">I'm an Owner</p>
              <p className="text-xs text-muted-foreground">Manage your hostel listings & bookings</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelectPage;
