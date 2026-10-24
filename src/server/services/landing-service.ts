import type { Student } from "@/lib/landing-data";
import { STUDENTS } from "@/lib/landing-data";
import { toLandingStudent } from "@/lib/landing/adapters";
import type { SessionUser } from "../auth";
import { getRecommendations } from "./match-service";

export const LANDING_STUDENT_LIMIT = 6;

export type LandingMode = "demo" | "live";

export interface LandingData {
  /** Real same-school recommendations for matchable users; curated samples otherwise. */
  students: Student[];
  mode: LandingMode;
}

function canReadLivePool(user: SessionUser | null): user is SessionUser {
  return Boolean(user && user.status === "matchable" && user.gender && user.matchGenderPref);
}

/**
 * Data for the public landing page. The matching pool is only read for a
 * signed-in, matchable student; guests and incomplete profiles keep the
 * curated marketing samples (explicitly labelled as demo in the UI).
 */
export async function getLandingData(user: SessionUser | null): Promise<LandingData> {
  if (!canReadLivePool(user)) {
    return { students: STUDENTS, mode: "demo" };
  }

  // `record: false` keeps a marketing page visit from writing a matching batch.
  const items = await getRecommendations(user, { record: false });

  return {
    // A 0-score candidate is technically recommended but reads as broken on a
    // discovery card; the homepage only surfaces actual overlap.
    students: items
      .filter((item) => item.score > 0)
      .slice(0, LANDING_STUDENT_LIMIT)
      .map((item) => toLandingStudent(item, user.hobbies)),
    mode: "live",
  };
}
