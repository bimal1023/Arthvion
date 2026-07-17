/** Shapes returned by /api/v1/admin/* — keep in sync with backend/api/admin_routes.py */

export type AdminOverview = {
  total_users: number;
  verified_users: number;
  plan_counts: Record<string, number>;
  reports_total: number;
  reports_30d: number;
  credits_used_30d: number;
};

export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  is_verified: boolean;
  created_at: string | null;
  plan_tier: string;
  memo_credits: number;
  workspace_id: string | null;
  workspace_name: string | null;
  subscription_status: string | null;
  reports_total: number;
  reports_30d: number;
  last_report_at: string | null;
};

export type AdminVoucher = {
  id: string;
  code: string;
  credits: number;
  max_redemptions: number;
  redeemed_count: number;
  expires_at: string | null;
  note: string | null;
  created_at: string | null;
};
