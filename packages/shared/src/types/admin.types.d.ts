export type AdminRole = 'superadmin' | 'admin' | 'manager' | 'moderator' | 'kyc_reviewer' | 'finance' | 'support';
export interface AdminAccount {
    id: string;
    userId: string;
    email: string;
    fullName: string;
    role: AdminRole;
    status: 'active' | 'suspended';
    mfaEnabled: boolean;
    lastLogin?: string;
    createdAt?: string;
}
export interface AdminDashboardStats {
    users: number;
    listings: number;
    orders: number;
    pendingKyc: number;
    openDisputes: number;
}
//# sourceMappingURL=admin.types.d.ts.map