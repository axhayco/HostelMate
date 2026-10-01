import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { Hostel } from "@/types/database";

export interface HostelFilters {
  city?: string;
  area?: string;
}

export function useHostels(filters?: HostelFilters) {
  return useQuery<Hostel[], Error>({
    queryKey: ["hostels", filters?.city, filters?.area],
    queryFn: async () => {
      let query = supabase.from("hostels").select("*");

      if (filters?.city && filters.city.trim() !== "") {
        query = query.eq("city", filters.city.trim());
      }

      if (filters?.area && filters.area.trim() !== "") {
        query = query.eq("area", filters.area.trim());
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch hostels: ${error.message}`);
      }

      return data ?? [];
    },
  });
}
