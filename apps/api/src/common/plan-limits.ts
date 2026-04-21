import { Plan } from "@prisma/client";

export const PLAN_LIMITS = {
  [Plan.free]: {
    monthlyPostLimit: 3,
  },
  [Plan.premium]: {
    monthlyPostLimit: null,
  },
} as const;

export function getMonthlyPostLimit(plan: Plan): number | null {
  return PLAN_LIMITS[plan].monthlyPostLimit;
}
