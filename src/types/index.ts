export type Locale = "cs" | "sk";

// NAV API types
export interface NavFeedItem {
  id: string;
  url: string;
  title: string;
  content_text: string;
  date_modified: string;
  _feed_entry: {
    uuid: string;
    status: "ACTIVE" | "INACTIVE";
    title: string;
    businessName: string;
    municipal: string;
    sistEndret: string;
  };
}

export interface NavFeedPage {
  version: string;
  title: string;
  feed_url: string;
  next_url: string | null;
  next_id: string | null;
  items: NavFeedItem[];
}

export interface NavVacancy {
  uuid: string;
  status?: "ACTIVE" | "INACTIVE"; // only present when INACTIVE
  sistEndret?: string;
  ad_content?: {
    uuid: string;
    published: string;
    expires: string;
    updated: string;
    title: string;
    description: string;
    jobtitle?: string;
    applicationUrl?: string;
    applicationDue?: string;
    sourceurl?: string;
    engagementtype?: string;
    extent?: string;
    sector?: string;
    positioncount?: string;
    starttime?: string;
    employer?: {
      name: string;
      orgnr: string;
      description: string;
      homepage: string;
    };
    workLocations?: Array<{
      country: string;
      address: string;
      city: string;
      postalCode: string;
      county: string;
      municipal: string;
    }>;
    occupationCategories?: Array<{
      level1: string;
      level2: string;
    }>;
    categoryList?: Array<{
      categoryType: string;
      code: string;
      name: string;
      score: number;
    }>;
    contactList?: Array<{
      name: string;
      email: string;
      phone: string;
      role: string;
      title: string;
    }>;
  };
}

// Database types (Supabase)
export interface Job {
  id: string;
  nav_id: string;
  source: "nav" | "finn";
  slug: string;
  title_no: string | null;
  title_cs: string | null;
  title_sk: string | null;
  description_no: string | null;
  description_cs: string | null;
  description_sk: string | null;
  company: string | null;
  location_city: string | null;
  location_county: string | null;
  category_level1: string | null;
  category_level2: string | null;
  engagement_type: string | null;
  extent: string | null;
  sector: string | null;
  salary: string | null;
  position_count: number | null;
  application_due: string | null;
  published_at: string | null;
  expires_at: string | null;
  source_url: string | null;
  application_url: string | null;
  is_featured: boolean;
  is_premium: boolean;
  is_active: boolean;
  requires_norwegian: boolean;
  includes_accommodation: boolean;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

// Localized job for display
export interface LocalizedJob {
  id: string;
  slug: string;
  title: string;
  description: string;
  company: string | null;
  location: string | null;
  category: string | null;
  engagementType: string | null;
  extent: string | null;
  applicationDue: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  sourceUrl: string | null;
  applicationUrl: string | null;
  isFeatured: boolean;
  isPremium: boolean;
  includesAccommodation: boolean;
  source: "nav" | "finn";
}

// Blog types
export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  category: string;
  readingTime?: number;
  content?: string;
}
