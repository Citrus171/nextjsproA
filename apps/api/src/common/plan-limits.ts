import { Plan } from "@prisma/client";

export const PLAN_LIMITS = {
  [Plan.free]: {
    monthlyPostLimit: 3,
    imageUploadLimit: 3,
  },
  [Plan.premium]: {
    monthlyPostLimit: null,
    imageUploadLimit: 10,
  },
} as const;

export function getMonthlyPostLimit(plan: Plan): number | null {
  return PLAN_LIMITS[plan].monthlyPostLimit;
}

export function getImageUploadLimit(plan: Plan): number {
  return PLAN_LIMITS[plan].imageUploadLimit;
}
