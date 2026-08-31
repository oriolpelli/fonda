import type { Metadata } from "next";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { HotelDetailsForm } from "@/components/dashboard/hotel-details-form";
import { HotelProfileForm } from "@/components/dashboard/hotel-profile-form";
import { SettingsGroupHeader } from "@/components/dashboard/settings-nav";
import { TripAdvisorForm } from "@/components/dashboard/tripadvisor-form";
import { localizedHref } from "@/lib/i18n/navigation";
import { settingsGroups } from "@/lib/settings-groups";
import { createClient } from "@/lib/supabase/server";
import type { RoomType, Upsell } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.settings.groups.hotel.label };
}

/**
 * Settings → Hotel information: everything the AI needs to know about the
 * property itself — the name and size, the profile and tone it writes in, and
 * the reviews it draws on.
 */
export default async function HotelSettingsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);
  const supabase = await createClient();

  // Select explicit columns — the encrypted token columns are revoked from the
  // client role (migration 0002), so `select('*')` would error here.
  const { data: hotel } = await supabase
    .from("hotels")
    .select("name, rooms_count")
    .single();

  const { data: settings } = await supabase
    .from("hotel_settings")
    .select(
      "star_rating, property_type, check_in_time, check_out_time, policies, positioning_vibe, target_guest, local_recommendations, preferred_greeting, signoff_name, languages_spoken, tripadvisor_url, review_highlights, review_summary, parking_transport, wifi_info, breakfast_info, room_types, upsells"
    )
    .maybeSingle();

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <SettingsGroupHeader
        title={dict.settings.groups.hotel.label}
        desc={dict.settings.groups.hotel.desc}
        groups={settingsGroups(locale, dict)}
        active="hotel"
        navLabel={dict.settings.groups.navLabel}
        backHref={localizedHref(locale, "/dashboard/settings")}
        backLabel={dict.settings.groups.back}
      />

      <HotelDetailsForm
        name={hotel?.name ?? ""}
        roomsCount={hotel?.rooms_count ?? 1}
      />

      <HotelProfileForm
        starRating={settings?.star_rating ?? null}
        propertyType={settings?.property_type ?? ""}
        checkInTime={(settings?.check_in_time ?? "").slice(0, 5)}
        checkOutTime={(settings?.check_out_time ?? "").slice(0, 5)}
        policies={settings?.policies ?? ""}
        positioningVibe={settings?.positioning_vibe ?? ""}
        targetGuest={settings?.target_guest ?? ""}
        localRecommendations={settings?.local_recommendations ?? ""}
        preferredGreeting={settings?.preferred_greeting ?? ""}
        signoffName={settings?.signoff_name ?? ""}
        languagesSpoken={settings?.languages_spoken ?? ""}
        parkingTransport={settings?.parking_transport ?? ""}
        wifiInfo={settings?.wifi_info ?? ""}
        breakfastInfo={settings?.breakfast_info ?? ""}
        roomTypes={(settings?.room_types as RoomType[] | null) ?? []}
        upsells={(settings?.upsells as Upsell[] | null) ?? []}
      />

      <TripAdvisorForm
        tripadvisorUrl={settings?.tripadvisor_url ?? ""}
        reviewHighlights={settings?.review_highlights ?? ""}
        reviewSummary={settings?.review_summary ?? null}
      />
    </div>
  );
}
