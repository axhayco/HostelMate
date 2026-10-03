import { z } from "zod";

/**
 * Strips HTML tags and normalizes whitespace.
 */
export function sanitizeText(text: string): string {
    if (!text) return "";
    // Strip HTML
    let clean = text.replace(/<[^>]*>?/gm, "");
    // Normalize whitespace (no repeated spaces or newlines)
    clean = clean.replace(/\s+/g, " ").trim();
    return clean;
}

// ─── Reusable Base Fields ───
const nameField = z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters");
const emailField = z.string().email("Invalid email address").max(254, "Email too long");
const phoneField = z
    .string()
    .regex(/^(\+91[\s-]?)?[6-9]\d{9}$|^(\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$|^[6-9]\d{9}$/, "Invalid Indian mobile number (e.g. +91 9876543210)")
    .or(z.literal("")); // Allow empty for optional fields

// Password policy for NEW passwords (sign-up, reset, change). Length is the dominant factor;
// the character-class rules block the most trivially guessable choices.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const strongPasswordField = z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(PASSWORD_MAX_LENGTH, "Password too long")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/\d/, "Password must include a number");

// Sign-in deliberately does NOT apply the strength policy: existing users may hold older, weaker
// passwords and must still be able to authenticate (the server is the authority on correctness).
const signInPasswordField = z.string().min(1, "Password is required").max(PASSWORD_MAX_LENGTH, "Password too long");

// ─── Form Schemas ───

export const signInSchema = z.object({
    email: emailField,
    password: signInPasswordField,
}).strip();

export const signUpSchema = z.object({
    email: emailField,
    password: strongPasswordField,
    fullName: nameField,
}).strip();

export const resetEmailSchema = z.object({
    email: emailField,
}).strip();

export const newPasswordSchema = z.object({
    password: strongPasswordField,
    confirmPassword: z.string(),
}).strip().refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export const loginPhoneSchema = z.object({
    phone: z.string().regex(/^(\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/, "Invalid Indian mobile number"),
}).strip();

export const otpVerifySchema = z.object({
    phone: z.string().regex(/^(\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/, "Invalid Indian mobile number"),
    otp: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must contain only digits"),
}).strip();

export const complaintSchema = z.object({
    studentName: nameField,
    category: z.enum([
        "Plumbing / Water",
        "Electricity / AC / Fan",
        "Wi-Fi / Internet",
        "Cleaning / Housekeeping",
        "Food / Mess Quality",
        "Security / Discipline",
        "Furniture / Bedding",
        "Other",
    ]),
    description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description cannot exceed 500 characters"),
}).strip();

export const contactFormSchema = z.object({
    name: nameField,
    email: emailField,
    message: z.string().min(5, "Message must be at least 5 characters").max(1000, "Message cannot exceed 1000 characters"),
}).strip();

export const profileSchema = z.object({
    name: nameField,
    email: emailField,
    phone: phoneField,
    college: z.string().max(120, "College name cannot exceed 120 characters").optional().or(z.literal("")),
    branchYear: z.string().max(100, "Branch/Year cannot exceed 100 characters").optional().or(z.literal("")),
    hometown: z.string().max(100, "Hometown cannot exceed 100 characters").optional().or(z.literal("")),
    emergencyPhone: phoneField.optional().or(z.literal("")),
    businessName: z.string().max(120, "Business name cannot exceed 120 characters").optional().or(z.literal("")),
    businessAddress: z.string().max(200, "Business address cannot exceed 200 characters").optional().or(z.literal("")),
    operatingSince: z.string().max(50, "Operating experience cannot exceed 50 characters").optional().or(z.literal("")),
    bio: z.string().max(250, "Bio cannot exceed 250 characters").optional().or(z.literal("")),
}).strip();

export const hostelFormSchema = z.object({
    name: nameField,
    location: z.string().min(1, "Location is required").max(120, "Location cannot exceed 120 characters"),
    rent: z.number().min(100, "Rent must be at least 100").max(500000, "Rent cannot exceed 500,000"),
    vacancies: z.number().min(0, "Vacancies cannot be negative"),
    totalCapacity: z.number().min(1, "Total capacity must be at least 1").max(1000, "Capacity cannot exceed 1000"),
    gender: z.enum(["male", "female"]),
    description: z.string().max(1000, "Description cannot exceed 1000 characters").optional().or(z.literal("")),
    contactPhone: phoneField.optional().or(z.literal("")),
    amenities: z.array(z.string()).max(20, "Too many amenities"),
}).strip().refine((data) => data.vacancies <= data.totalCapacity, {
    message: "Vacancies cannot exceed total capacity",
    path: ["vacancies"],
});

export const chatMessageSchema = z.object({
    text: z.string().min(1, "Message cannot be empty").max(1000, "Message cannot exceed 1000 characters"),
}).strip();

export const agentMessageSchema = z.object({
    text: z.string().min(1, "Message cannot be empty").max(500, "Message cannot exceed 500 characters"),
}).strip();

/**
 * Validates data against a Zod schema. Returns formatted error strings if invalid.
 */
export function validateField<T>(schema: z.ZodType<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    // Join all validation errors into a single string
    const errorMessage = result.error.errors.map(err => err.message).join(", ");
    return { success: false, error: errorMessage };
}
