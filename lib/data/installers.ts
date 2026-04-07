// ============================================================
// lib/data/installers.ts
// Vetted Power 24 partner installers across Nigeria.
// In production, this data would come from a CRM/database.
// ============================================================

import type { RecommendedInstaller } from "@/lib/types";

const ALL_INSTALLERS: RecommendedInstaller[] = [
  {
    id: "ins_001",
    name: "SolarNest Nigeria Ltd.",
    city: "Lagos",
    state: "Lagos",
    rating: 4.9,
    reviewCount: 284,
    phone: "+234 803 456 7890",
    certifications: ["NAESCO", "NESI", "REA Certified"],
    specialties: ["Residential", "Hybrid Systems", "Lithium Retrofit"],
  },
  {
    id: "ins_002",
    name: "Greenwave Power Solutions",
    city: "Lagos",
    state: "Lagos",
    rating: 4.8,
    reviewCount: 197,
    phone: "+234 705 321 9812",
    certifications: ["NAESCO", "Victron Trained"],
    specialties: ["Commercial", "Residential", "Off-Grid"],
  },
  {
    id: "ins_003",
    name: "SunRoost Electrical Works",
    city: "Abuja",
    state: "FCT",
    rating: 4.7,
    reviewCount: 143,
    phone: "+234 810 876 5432",
    certifications: ["NAESCO", "NESI"],
    specialties: ["Residential", "Security Systems", "Hybrid"],
  },
  {
    id: "ins_004",
    name: "Capital Solar Abuja",
    city: "Abuja",
    state: "FCT",
    rating: 4.6,
    reviewCount: 88,
    phone: "+234 901 234 5678",
    certifications: ["NAESCO"],
    specialties: ["Government Projects", "Residential", "Grid-Tie"],
  },
  {
    id: "ins_005",
    name: "PhCity Solar Hub",
    city: "Port Harcourt",
    state: "Rivers",
    rating: 4.8,
    reviewCount: 175,
    phone: "+234 803 111 2345",
    certifications: ["NAESCO", "Schneider Certified"],
    specialties: ["Oil & Gas Residential", "Hybrid", "Commercial"],
  },
  {
    id: "ins_006",
    name: "Delta Bright Energy",
    city: "Warri",
    state: "Delta",
    rating: 4.5,
    reviewCount: 62,
    phone: "+234 706 543 2109",
    certifications: ["NAESCO"],
    specialties: ["Residential", "Off-Grid", "Water Pump Integration"],
  },
  {
    id: "ins_007",
    name: "Kano Solar & Power Co.",
    city: "Kano",
    state: "Kano",
    rating: 4.7,
    reviewCount: 121,
    phone: "+234 812 765 4321",
    certifications: ["NAESCO", "NESI"],
    specialties: ["Residential", "Small Business", "Agri-Solar"],
  },
  {
    id: "ins_008",
    name: "Ibadan Energy Systems",
    city: "Ibadan",
    state: "Oyo",
    rating: 4.6,
    reviewCount: 95,
    phone: "+234 708 234 5678",
    certifications: ["NAESCO"],
    specialties: ["Residential", "Schools", "Hybrid"],
  },
];

// ─── State to city mapping for location matching ─────────────
const STATE_TO_CITIES: Record<string, string[]> = {
  lagos: ["Lagos"],
  fct: ["Abuja"],
  abuja: ["Abuja"],
  rivers: ["Port Harcourt"],
  "port harcourt": ["Port Harcourt"],
  delta: ["Warri", "Asaba"],
  kano: ["Kano"],
  oyo: ["Ibadan"],
};

/**
 * Returns up to `limit` installers filtered by location.
 * Falls back to top-rated national picks if no local match.
 */
export function getInstallersByLocation(
  location: string | undefined,
  limit: number = 3
): RecommendedInstaller[] {
  if (!location) {
    // Return top-rated across Nigeria
    return ALL_INSTALLERS.sort((a, b) => b.rating - a.rating).slice(0, limit);
  }

  const loc = location.toLowerCase().trim();

  // Try to find matching installers
  const matches = ALL_INSTALLERS.filter((inst) => {
    const instState = inst.state.toLowerCase();
    const instCity = inst.city.toLowerCase();
    return (
      instState.includes(loc) ||
      instCity.includes(loc) ||
      loc.includes(instCity) ||
      loc.includes(instState) ||
      (STATE_TO_CITIES[loc] ?? []).some((city) =>
        city.toLowerCase() === instCity
      )
    );
  });

  // If we found local matches, use them; otherwise fall back
  const pool = matches.length > 0 ? matches : ALL_INSTALLERS;
  return pool.sort((a, b) => b.rating - a.rating).slice(0, limit);
}
