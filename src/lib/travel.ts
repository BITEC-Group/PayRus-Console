// Console oversight of Travel (supabase/migrations/0062): bookings, catalogue switches and review moderation.
// Every RPC here is staff-only in the database.
import { supabase } from "./supabase-client.ts";

const n = (v: unknown) => Number(v ?? 0);

export interface TravelOverview {
  bookingsTotal: number; confirmed: number; cancelled: number; gross: Record<string, number>; refunded: Record<string, number>;
  installmentsPending: number; installmentsOverdue: number; installmentsPendingValue: number;
  favorites: number; reviews: number; hiddenReviews: number; avgRating: number | null;
  flightsActive: number; hotelsActive: number; flightsLowSeats: number;
}

const numberMap = (v: unknown): Record<string, number> =>
  Object.fromEntries(Object.entries((v ?? {}) as Record<string, unknown>).map(([k, x]) => [k, n(x)]));

export async function getTravelOverview(): Promise<TravelOverview> {
  const res = await supabase.rpc("admin_travel_overview");
  if (res.error) throw new Error(res.error.message);
  const r = ((res.data ?? [])[0] ?? {}) as Record<string, unknown>;
  return {
    bookingsTotal: n(r.bookings_total), confirmed: n(r.confirmed), cancelled: n(r.cancelled), gross: numberMap(r.gross), refunded: numberMap(r.refunded),
    installmentsPending: n(r.installments_pending), installmentsOverdue: n(r.installments_overdue), installmentsPendingValue: n(r.installments_pending_value),
    favorites: n(r.favorites), reviews: n(r.reviews), hiddenReviews: n(r.hidden_reviews), avgRating: r.avg_rating === null || r.avg_rating === undefined ? null : n(r.avg_rating),
    flightsActive: n(r.flights_active), hotelsActive: n(r.hotels_active), flightsLowSeats: n(r.flights_low_seats),
  };
}

export interface TravelBookingRow {
  id: string; reference: string; userName: string; userEmail: string; kind: "flight" | "hotel"; title: string; amount: number; currency: string;
  status: "confirmed" | "cancelled"; travelDate: string | null; nights: number; passengers: number; bookedAt: string; refundedAmount: number;
  installmentsPaid: number; installmentsTotal: number;
  /** Where the offer came from: the PayRus catalogue or a partner platform. */
  source: "payrus" | "amadeus";
}

export async function listTravelBookings(limit = 100): Promise<TravelBookingRow[]> {
  const res = await supabase.rpc("admin_list_travel_bookings", { p_limit: limit });
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, reference: r.reference as string, userName: r.user_name as string, userEmail: r.user_email as string, kind: r.kind as "flight" | "hotel",
    title: r.title as string, amount: n(r.amount), currency: r.currency as string, status: r.status as "confirmed" | "cancelled", travelDate: (r.travel_date as string | null) ?? null,
    nights: n(r.nights), passengers: n(r.passengers), bookedAt: r.booked_at as string, refundedAmount: n(r.refunded_amount),
    installmentsPaid: n(r.installments_paid), installmentsTotal: n(r.installments_total), source: (r.source ?? "payrus") as "payrus" | "amadeus",
  }));
}

export interface TravelCatalogRow {
  kind: "flight" | "hotel"; id: string; title: string; subtitle: string; price: number; currency: string; active: boolean; seatsLeft: number | null; bookings: number; favorites: number;
}

export async function listTravelCatalog(): Promise<TravelCatalogRow[]> {
  const res = await supabase.rpc("admin_list_travel_catalog");
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as Record<string, unknown>[]).map((r) => ({
    kind: r.kind as "flight" | "hotel", id: r.id as string, title: r.title as string, subtitle: r.subtitle as string, price: n(r.price), currency: r.currency as string,
    active: Boolean(r.active), seatsLeft: r.seats_left === null || r.seats_left === undefined ? null : n(r.seats_left), bookings: n(r.bookings), favorites: n(r.favorites),
  }));
}

export async function setTravelActive(kind: "flight" | "hotel", id: string, active: boolean): Promise<void> {
  const res = await supabase.rpc("admin_travel_set_active", { p_kind: kind, p_item_id: id, p_active: active });
  if (res.error) throw new Error(res.error.message);
}

export interface TravelReviewRow {
  id: string; userName: string; kind: "flight" | "hotel"; entity: string; rating: number; comment: string; verified: boolean; hidden: boolean; createdAt: string;
}

export async function listTravelReviews(limit = 100): Promise<TravelReviewRow[]> {
  const res = await supabase.rpc("admin_list_travel_reviews", { p_limit: limit });
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, userName: r.user_name as string, kind: r.kind as "flight" | "hotel", entity: r.entity as string, rating: n(r.rating),
    comment: r.comment as string, verified: Boolean(r.verified), hidden: Boolean(r.hidden), createdAt: r.created_at as string,
  }));
}

export async function setTravelReviewHidden(id: string, hidden: boolean): Promise<void> {
  const res = await supabase.rpc("admin_travel_set_review_hidden", { p_review_id: id, p_hidden: hidden });
  if (res.error) throw new Error(res.error.message);
}
