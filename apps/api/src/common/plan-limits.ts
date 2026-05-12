import { Plan } from "@prisma/client";

type PlanLimitEntry = {
  monthlyPostLimit: number | null;
  imageUploadLimit: number;
};

export const PLAN_LIMITS: Record<Plan, PlanLimitEntry> = {
  [Plan.free]: {
    monthlyPostLimit: 3,
    imageUploadLimit: 3,
  },
  [Plan.premium]: {
    monthlyPostLimit: null,
    imageUploadLimit: 10,
  },
};

export function getMonthlyPostLimit(plan: Plan): number | null {
  return PLAN_LIMITS[plan].monthlyPostLimit;
}

export function getImageUploadLimit(plan: Plan): number {
  return PLAN_LIMITS[plan].imageUploadLimit;
}
