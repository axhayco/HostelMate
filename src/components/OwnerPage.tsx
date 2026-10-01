import { Hostel, mockHostels, ALL_AMENITIES } from "@/data/hostels";
import { useState, useMemo, useEffect, useRef } from "react";
import { DEFAULT_HOSTEL_IMAGE, handleImageError } from "@/lib/imageUtils";
import {
  ArrowLeft, Plus, X, Pencil, Trash2, Users, BedDouble,
  Building2, Eye, Check, MapPin, Star, Wifi, WifiOff, ImagePlus, Loader2,
  TrendingUp, TrendingDown, IndianRupee
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, AreaChart, Area
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { uploadHostelImage } from "@/lib/upload";
import { hostelFormSchema, validateField, sanitizeText } from "@/lib/validation";
import { formSubmitLimiter } from "@/lib/rateLimiter";
import hostel1 from "@/assets/hostel1.jpg";

interface OwnerPageProps {
  hostels: Hostel[];
  onHostelsChange: (hostels: Hostel[]) => void;
  onBack: () => void;
  ownerId: string;
}

type ModalMode = "add" | "edit" | "occupancy" | null;

interface HostelForm {
  name: string;
  location: string;
  rent: string;
  vacancies: string;
  totalCapacity: string;
  gender: "male" | "female";
  description: string;
  contactPhone: string;
  /** Existing image URL (for saved hostels) */
  image: string;
  amenities: string[];
}

const emptyForm: HostelForm = {
  name: "",
  location: "",
  rent: "",
  vacancies: "",
  totalCapacity: "",
  gender: "male",
  description: "",
  contactPhone: "",
  image: "",
  amenities: [],
};

const OwnerPage = ({ hostels, onHostelsChange, onBack, ownerId }: OwnerPageProps) => {
  const setHostels = (updated: Hostel[] | ((prev: Hostel[]) => Hostel[])) => {
    const next = typeof updated === "function" ? updated(hostels) : updated;
    onHostelsChange(next);
  };

  // `hostels` already contains only this owner's listings (enforced by Index.tsx).
  // No further filtering needed. We alias for readability.
  const myHostels = hostels;

  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState<HostelForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("")
  const [uploading, setUploading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewHostel, setViewHostel] = useState<Hostel | null>(null);
  const [hwOnline, setHwOnline] = useState(true);
  const [lastPing, setLastPing] = useState(new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulate hardware ping every 30s with random online/offline
  useEffect(() => {
    const interval = setInterval(() => {
      const online = Math.random() > 0.15; // 85% chance online
      setHwOnline(online);
      setLastPing(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const totalBeds = myHostels.reduce((s, h) => s + h.totalCapacity, 0);
    const occupied = myHostels.reduce((s, h) => s + (h.totalCapacity - h.vacancies), 0);
    const vacant = myHostels.reduce((s, h) => s + h.vacancies, 0);
    return { totalBeds, occupied, vacant, occupancyRate: totalBeds ? Math.round((occupied / totalBeds) * 100) : 0 };
  }, [myHostels]);

  // Mock revenue data for the chart
  const revenueData = useMemo(() => [
    { month: "Jan", revenue: stats.occupied * 6000, occupancy: 65 },
    { month: "Feb", revenue: stats.occupied * 6200, occupancy: 68 },
    { month: "Mar", revenue: stats.occupied * 6500, occupancy: 72 },
    { month: "Apr", revenue: stats.occupied * 6800, occupancy: 75 },
    { month: "May", revenue: stats.occupied * (Number(form.rent) || 7000), occupancy: stats.occupancyRate },
  ], [stats, form.rent]);

  const getSmartPrice = (h: Hostel) => {
    const occ = h.totalCapacity ? ((h.totalCapacity - h.vacancies) / h.totalCapacity) * 100 : 0;
    if (occ >= 90) return Math.round(h.rent * 1.15); // Demand is high
    if (occ >= 75) return Math.round(h.rent * 1.05);
    if (occ <= 30) return Math.round(h.rent * 0.90); // Low demand
    return h.rent;
  };

  const openAdd = () => {
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview("");
    setEditId(null);
    setModal("add");
  };

  const openEdit = (h: Hostel) => {
    setForm({
      name: h.name,
      location: h.location,
      rent: String(h.rent),
      vacancies: String(h.vacancies),
      totalCapacity: String(h.totalCapacity),
      gender: h.gender,
      description: h.description,
      contactPhone: h.contactPhone,
      image: h.image,
      amenities: [...h.amenities],
    });
    setImageFile(null);
    setImagePreview(h.image);
    setEditId(h.id);
    setModal("edit");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const openOccupancy = (h: Hostel) => {
    setViewHostel(h);
    setModal("occupancy");
  };

  const handleSave = async () => {
    // Rate Limiting
    const limit = formSubmitLimiter.tryConsume("owner_save");
    if (!limit.allowed) {
      alert(`Too many save attempts. Please try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`);
      return;
    }

    // Validation & Sanitization
    const validation = validateField(hostelFormSchema, {
      name: sanitizeText(form.name),
      location: sanitizeText(form.location),
      rent: Number(form.rent) || 0,
      totalCapacity: Number(form.totalCapacity) || 0,
      vacancies: Number(form.vacancies) || 0,
      gender: form.gender,
      description: sanitizeText(form.description),
      contactPhone: sanitizeText(form.contactPhone),
    });

    if ("success" in validation && "data" in validation && validation.success) {
      const validData = validation.data;
      setUploading(true);
      try {
        let img = form.image || hostel1;
        if (imageFile) {
          img = await uploadHostelImage(imageFile);
        }
        const hostelData: Hostel = {
          id: editId || Date.now().toString(),
          ownerId,
          name: validData.name,
          location: validData.location || "New Location",
          area: (validData.location || "New Location").split(",")[0]?.trim(),
          city: (validData.location || "New Locations, Hyderabad").split(",")[1]?.trim() || "Hyderabad",
          nearbyCollege: "",
          rent: validData.rent,
          rating: 4.0,
          vacancies: Math.min(validData.vacancies || 0, validData.totalCapacity || 0),
          totalCapacity: validData.totalCapacity || 10,
          gender: validData.gender as "male" | "female",
          image: img,
          photos: [img],
          amenities: form.amenities,
          description: validData.description || "No description provided.",
          contactPhone: validData.contactPhone || "+91 00000 00000",
          lat: 17.385,
          lng: 78.4867,
        };
        if (editId) {
          setHostels(hostels.map((h) => (h.id === editId ? { ...h, ...hostelData } : h)));
        } else {
          setHostels([hostelData, ...hostels]);
        }
        setModal(null);
        setForm(emptyForm);
        setImageFile(null);
        setImagePreview("");
        setEditId(null);
      } catch (err) {
        alert(`Upload failed: ${(err as Error).message}`);
      } finally {
        setUploading(false);
      }
    } else if ("error" in validation) {
      alert(validation.error as string);
      return;
    }
  };

  const handleDelete = (id: string) => {
    // Safety guard: only delete hostels belonging to this owner
    const target = hostels.find((h) => h.id === id);
    if (!target) return;
    if (!window.confirm(`Delete "${target.name}"? This cannot be undone.`)) return;
    setHostels(hostels.filter((h) => h.id !== id));
  };

  const toggleAmenity = (a: string) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter((x) => x !== a)
        : [...prev.amenities, a],
    }));
  };

  const inputClass =
    "w-full rounded-xl border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="rounded-lg p-2 text-foreground transition-colors hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Owner Dashboard</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4 space-y-5">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "My Hostels", value: myHostels.length, icon: <Building2 className="h-5 w-5" />, color: "text-primary" },
            { label: "Total Beds", value: stats.totalBeds, icon: <BedDouble className="h-5 w-5" />, color: "text-accent-foreground" },
            { label: "Occupied", value: stats.occupied, icon: <Users className="h-5 w-5" />, color: "text-success" },
            { label: "Occupancy Rate", value: `${stats.occupancyRate}%`, icon: <Eye className="h-5 w-5" />, color: "text-warning" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-card p-4 shadow-card">
              <div className={`mb-2 ${s.color}`}>{s.icon}</div>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Hardware Status Indicator */}
        <div className={`rounded-2xl border p-4 flex items-center gap-4 ${hwOnline ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${hwOnline ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
            {hwOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Occupancy Monitoring System</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${hwOnline ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${hwOnline ? "bg-success animate-pulse" : "bg-destructive"}`} />
                {hwOnline ? "Online" : "Offline"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Last ping: {lastPing.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
        </div>

        {/* Revenue & Analytics Section */}
        <section className="rounded-2xl bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-foreground">Revenue & Analytics</h2>
            <div className="flex items-center gap-1 text-xs font-semibold text-success">
              <TrendingUp className="h-3 w-3" /> +12% from last month
            </div>
          </div>
          <div className="h-52 w-full overflow-hidden">
            <ChartContainer
              className="h-full w-full aspect-auto"
              config={{
                revenue: { label: "Revenue", color: "hsl(var(--primary))" },
                occupancy: { label: "Occupancy %", color: "hsl(var(--accent))" }
              }}
            >
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorRev)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Estimated Revenue</p>
              <p className="text-lg font-bold text-foreground">₹{(stats.occupied * (Number(form.rent) || 7000)).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Potential Revenue</p>
              <p className="text-lg font-bold text-muted-foreground">₹{(stats.totalBeds * (Number(form.rent) || 7000)).toLocaleString()}</p>
            </div>
          </div>
        </section>

        {/* ── MY HOSTELS SECTION ───────────────────────────────────────────── */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              My Hostels
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {myHostels.length}
              </span>
            </h2>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" /> Add Hostel
            </button>
          </div>

          {myHostels.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-12 text-center">
              <Building2 className="mx-auto h-10 w-10 mb-3 text-muted-foreground/40" />
              <p className="font-semibold text-foreground">No hostels added yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Tap "Add Hostel" to list your first property</p>
              <button
                onClick={openAdd}
                className="mt-4 flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
              >
                <Plus className="h-4 w-4" /> Add Your First Hostel
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myHostels.map((h) => {
                const occupied = h.totalCapacity - h.vacancies;
                const occupancyPct = h.totalCapacity ? Math.round((occupied / h.totalCapacity) * 100) : 0;
                return (
                  <div key={h.id} className="rounded-2xl bg-card shadow-card overflow-hidden ring-1 ring-primary/15">
                    <div className="flex gap-3 p-3">
                      <img
                        src={h.image || DEFAULT_HOSTEL_IMAGE}
                        alt={h.name}
                        onError={handleImageError}
                        className="h-24 w-24 rounded-xl object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground truncate">{h.name}</h3>
                              <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary tracking-wide">MINE</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{h.location}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-semibold">
                            <Star className="h-3 w-3 fill-warning text-warning" /> {h.rating}
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-3 text-xs">
                          <span className="font-bold text-primary">₹{h.rent.toLocaleString()}<span className="font-normal text-muted-foreground">/mo</span></span>
                          <span className="capitalize rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">{h.gender}</span>
                        </div>

                        {/* Smart Pricing Suggestion */}
                        {h.totalCapacity > 0 && (
                          <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary/5 p-2 border border-primary/10">
                            <IndianRupee className="h-3 w-3 text-primary" />
                            <div className="flex-1">
                              <p className="text-[10px] text-muted-foreground font-medium">Smart Pricing Suggestion</p>
                              <p className="text-xs font-bold text-foreground">
                                Suggest ₹{getSmartPrice(h).toLocaleString()}
                                <span className={`ml-2 text-[10px] ${getSmartPrice(h) > h.rent ? "text-success" : getSmartPrice(h) < h.rent ? "text-destructive" : "text-muted-foreground"}`}>
                                  ({getSmartPrice(h) > h.rent ? "+" : ""}{Math.round(((getSmartPrice(h) - h.rent) / h.rent) * 100)}%)
                                </span>
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Mini occupancy bar */}
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                            <span>{occupied}/{h.totalCapacity} occupied</span>
                            <span className="font-semibold">{occupancyPct}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${occupancyPct >= 90 ? "bg-destructive" : occupancyPct >= 60 ? "bg-warning" : "bg-success"}`}
                              style={{ width: `${occupancyPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex border-t border-border divide-x divide-border">
                      <button
                        onClick={() => openEdit(h)}
                        className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => openOccupancy(h)}
                        className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                      >
                        <Eye className="h-3.5 w-3.5" /> Occupancy
                      </button>
                      <button
                        onClick={() => handleDelete(h.id)}
                        className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>


        {/* Bottom padding for FAB */}
        <div className="h-6" />
      </main>

      {/* FAB — Add Hostel */}
      <button
        onClick={openAdd}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 active:scale-95"
        aria-label="Add hostel"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Add / Edit Modal */}
      {(modal === "add" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/40 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-lg animate-fade-up rounded-2xl bg-card p-6 shadow-card-hover" style={{ animationFillMode: "both" }}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                {modal === "add" ? "Add New Hostel" : "Edit Hostel"}
              </h2>
              <button onClick={() => setModal(null)} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {/* Basic Info */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Hostel Name *</label>
                <input type="text" placeholder="e.g. Sunrise Boys Hostel" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Location</label>
                <input type="text" placeholder="e.g. Kukatpally, Hyderabad" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Monthly Rent (₹) *</label>
                  <input type="number" placeholder="6500" value={form.rent} onChange={(e) => setForm({ ...form, rent: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Gender</label>
                  <div className="flex gap-2">
                    {(["male", "female"] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setForm({ ...form, gender: g })}
                        className={`flex-1 rounded-xl py-2.5 text-xs font-semibold capitalize transition-all ${
                          form.gender === g ? "bg-primary text-primary-foreground" : "border border-input bg-background text-foreground hover:bg-secondary"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Total Capacity (beds)</label>
                  <input type="number" placeholder="30" value={form.totalCapacity} onChange={(e) => setForm({ ...form, totalCapacity: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Vacant Beds</label>
                  <input type="number" placeholder="5" value={form.vacancies} onChange={(e) => setForm({ ...form, vacancies: e.target.value })} className={inputClass} />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe your hostel..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Contact Phone</label>
                <input type="tel" placeholder="+91 98765 43210" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className={inputClass} />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Hostel Photo (optional)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-background py-5 transition-colors hover:border-primary hover:bg-primary/5"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="h-28 w-full rounded-lg object-cover" />
                  ) : (
                    <>
                      <ImagePlus className="h-7 w-7 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Click to select a photo</p>
                    </>
                  )}
                  {imagePreview && (
                    <span className="absolute bottom-2 right-2 rounded-lg bg-primary/80 px-2 py-1 text-[10px] font-semibold text-white">Change</span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Amenities */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-muted-foreground">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_AMENITIES.map((a) => {
                    const active = form.amenities.includes(a);
                    return (
                      <button
                        key={a}
                        onClick={() => toggleAmenity(a)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "border border-input bg-background text-foreground hover:bg-secondary"
                        }`}
                      >
                        {active && <Check className="h-3 w-3" />}
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={uploading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Uploading photo...</>
              ) : (
                modal === "add" ? "Add Hostel" : "Save Changes"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Occupancy Modal */}
      {modal === "occupancy" && viewHostel && (() => {
        const occupied = viewHostel.totalCapacity - viewHostel.vacancies;
        const pct = viewHostel.totalCapacity ? Math.round((occupied / viewHostel.totalCapacity) * 100) : 0;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm px-4">
            <div className="w-full max-w-md animate-fade-up rounded-2xl bg-card p-6 shadow-card-hover" style={{ animationFillMode: "both" }}>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Occupancy Details</h2>
                <button onClick={() => setModal(null)} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="text-center mb-5">
                <h3 className="font-semibold text-foreground">{viewHostel.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{viewHostel.location}</p>
              </div>

              {/* Circular-like visual */}
              <div className="flex justify-center mb-5">
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-[6px] border-secondary">
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 128 128">
                    <circle cx="64" cy="64" r="58" fill="none" strokeWidth="6"
                      className={pct >= 90 ? "stroke-destructive" : pct >= 60 ? "stroke-warning" : "stroke-success"}
                      strokeDasharray={`${(pct / 100) * 364} 364`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-foreground">{pct}%</div>
                    <div className="text-[10px] text-muted-foreground">Occupied</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-secondary p-3">
                  <div className="text-lg font-bold text-foreground">{viewHostel.totalCapacity}</div>
                  <div className="text-[10px] text-muted-foreground">Total Beds</div>
                </div>
                <div className="rounded-xl bg-secondary p-3">
                  <div className="text-lg font-bold text-success">{occupied}</div>
                  <div className="text-[10px] text-muted-foreground">Occupied</div>
                </div>
                <div className="rounded-xl bg-secondary p-3">
                  <div className="text-lg font-bold text-primary">{viewHostel.vacancies}</div>
                  <div className="text-[10px] text-muted-foreground">Vacant</div>
                </div>
              </div>

              <div className="mt-4 text-center text-xs text-muted-foreground">
                Monthly Rent: <span className="font-semibold text-primary">₹{viewHostel.rent.toLocaleString()}</span>
                {" · "}
                Revenue Potential: <span className="font-semibold text-foreground">₹{(occupied * viewHostel.rent).toLocaleString()}/mo</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default OwnerPage;
