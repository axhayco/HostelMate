export const isEmailVerified = (user: { email?: string | null; email_confirmed_at?: string | null } | null | undefined): boolean => {
    if (!user) return false;
    // Phone-only and OAuth users either have no email or a provider-confirmed one.
    if (!user.email) return true;
    return Boolean(user.email_confirmed_at);
};
