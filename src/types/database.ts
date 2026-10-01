// ─── Database Types strictly matching 001_initial_schema.sql ─────────────────

export type UserRole = 'student' | 'owner';
export type GenderPreference = 'boys' | 'girls' | 'any';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Hostel {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  area: string;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  hostel_id: string;
  room_type: string;
  gender_preference: GenderPreference;
  total_beds: number;
  available_beds: number;
  price_per_month: number;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  room_id: string;
  student_id: string;
  start_date: string;
  end_date: string;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  hostel_id: string;
  student_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string };
        Update: Partial<Omit<Profile, 'id'>>;
      };
      hostels: {
        Row: Hostel;
        Insert: Omit<Hostel, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Hostel, 'id'>>;
      };
      rooms: {
        Row: Room;
        Insert: Omit<Room, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Room, 'id'>>;
      };
      bookings: {
        Row: Booking;
        Insert: Omit<Booking, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Booking, 'id'>>;
      };
      reviews: {
        Row: Review;
        Insert: Omit<Review, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Review, 'id'>>;
      };
    };
    Enums: {
      user_role: UserRole;
      gender_preference: GenderPreference;
      booking_status: BookingStatus;
    };
  };
}
