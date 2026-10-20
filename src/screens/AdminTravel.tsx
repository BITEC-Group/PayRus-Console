// Travel tab: bookings across customers, what is on sale, and review moderation. Staff-only in the database.
// Staff can switch a flight or hotel off (customers stop seeing it and cannot book it) and hide a review;
// they cannot book or refund on a customer's behalf here (refunds stay a customer or escalation action).
import { useCallback, useEffect, useState } from "react";
import type { Locale } from "../types.ts";
import { errorText } from "../lib/adminStaff.ts";
import {
  getTravelOverview, listTravelBookings, listTravelCatalog, listTravelReviews, setTravelActive, setTravelReviewHidden,
  type TravelBookingRow, type TravelCatalogRow, type TravelOverview, type TravelReviewRow,
} from "../lib/travel.ts";

const COPY: Record<Locale, Record<string, string>> = {
  en: { title: "Travel", partner: "Partner · Amadeus", intro: "Flight and hotel bookings across customers. You can switch catalogue items off and hide reviews; refunds stay with the customer.", loading: "Loading…", denied: "Staff access required.",
    bookings: "Bookings", confirmed: "confirmed", cancelled: "cancelled", gross: "Confirmed value", refunded: "Refunded", pending: "Pending instalments", overdue: "overdue", favorites: "Saved by customers", reviews: "Reviews", hidden: "hidden", avg: "average", onSale: "On sale", flights: "flights", hotels: "hotels", lowSeats: "Flights with 3 seats or fewer",
    secBookings: "Latest bookings", secCatalog: "Catalogue", secReviews: "Reviews", reference: "Reference", customer: "Customer", item: "Item", date: "Date", amount: "Amount", status: "Status", plan: "Instalments", none: "None yet",
    price: "Price", seats: "Seats", booked: "Booked", saved: "Saved", live: "Live", off: "Switched off", switchOff: "Switch off", switchOn: "Switch on", hide: "Hide", unhide: "Show", verified: "Verified booking", flight: "Flight", hotel: "Hotel", failed: "Couldn't update — try again", updated: "Updated", refundedOn: "refunded" },
  fr: { title: "Voyages", partner: "Partenaire · Amadeus", intro: "Réservations de vols et d'hôtels de tous les clients. Vous pouvez désactiver des offres du catalogue et masquer des avis ; les remboursements restent côté client.", loading: "Chargement…", denied: "Accès personnel requis.",
    bookings: "Réservations", confirmed: "confirmées", cancelled: "annulées", gross: "Valeur confirmée", refunded: "Remboursé", pending: "Échéances à venir", overdue: "en retard", favorites: "Favoris clients", reviews: "Avis", hidden: "masqués", avg: "moyenne", onSale: "En vente", flights: "vols", hotels: "hôtels", lowSeats: "Vols avec 3 places ou moins",
    secBookings: "Dernières réservations", secCatalog: "Catalogue", secReviews: "Avis", reference: "Référence", customer: "Client", item: "Offre", date: "Date", amount: "Montant", status: "Statut", plan: "Échéances", none: "Aucune pour l'instant",
    price: "Prix", seats: "Places", booked: "Réservées", saved: "Favoris", live: "En ligne", off: "Désactivé", switchOff: "Désactiver", switchOn: "Activer", hide: "Masquer", unhide: "Afficher", verified: "Réservation vérifiée", flight: "Vol", hotel: "Hôtel", failed: "Mise à jour impossible — réessayez", updated: "Mis à jour", refundedOn: "remboursé" },
  pt: { title: "Viagens", partner: "Parceiro · Amadeus", intro: "Reservas de voos e hotéis de todos os clientes. Pode desativar itens do catálogo e ocultar opiniões; os reembolsos ficam com o cliente.", loading: "A carregar…", denied: "Acesso de equipa necessário.",
    bookings: "Reservas", confirmed: "confirmadas", cancelled: "canceladas", gross: "Valor confirmado", refunded: "Reembolsado", pending: "Prestações pendentes", overdue: "em atraso", favorites: "Guardados por clientes", reviews: "Opiniões", hidden: "ocultas", avg: "média", onSale: "À venda", flights: "voos", hotels: "hotéis", lowSeats: "Voos com 3 lugares ou menos",
    secBookings: "Últimas reservas", secCatalog: "Catálogo", secReviews: "Opiniões", reference: "Referência", customer: "Cliente", item: "Item", date: "Data", amount: "Valor", status: "Estado", plan: "Prestações", none: "Nenhuma ainda",
    price: "Preço", seats: "Lugares", booked: "Reservados", saved: "Guardados", live: "Ativo", off: "Desativado", switchOff: "Desativar", switchOn: "Ativar", hide: "Ocultar", unhide: "Mostrar", verified: "Reserva verificada", flight: "Voo", hotel: "Hotel", failed: "Não foi possível atualizar — tente novamente", updated: "Atualizado", refundedOn: "reembolsado" },
  es: { title: "Viajes", partner: "Socio · Amadeus", intro: "Reservas de vuelos y hoteles de todos los clientes. Puede desactivar ofertas del catálogo y ocultar opiniones; los reembolsos quedan del lado del cliente.", loading: "Cargando…", denied: "Se requiere acceso de personal.",
    bookings: "Reservas", confirmed: "confirmadas", cancelled: "canceladas", gross: "Valor confirmado", refunded: "Reembolsado", pending: "Cuotas pendientes", overdue: "vencidas", favorites: "Guardados por clientes", reviews: "Opiniones", hidden: "ocultas", avg: "media", onSale: "En venta", flights: "vuelos", hotels: "hoteles", lowSeats: "Vuelos con 3 asientos o menos",
    secBookings: "Últimas reservas", secCatalog: "Catálogo", secReviews: "Opiniones", reference: "Referencia", customer: "Cliente", item: "Oferta", date: "Fecha", amount: "Importe", status: "Estado", plan: "Cuotas", none: "Ninguna todavía",
    price: "Precio", seats: "Asientos", booked: "Reservadas", saved: "Guardados", live: "Activo", off: "Desactivado", switchOff: "Desactivar", switchOn: "Activar", hide: "Ocultar", unhide: "Mostrar", verified: "Reserva verificada", flight: "Vuelo", hotel: "Hotel", failed: "No se pudo actualizar — inténtelo de nuevo", updated: "Actualizado", refundedOn: "reembolsado" },
};

export function TravelTab({ locale }: { locale: Locale }) {
  const C = COPY[locale] ?? COPY.en;
  const [overview, setOverview] = useState<TravelOverview | null>(null);
  const [bookings, setBookings] = useState<TravelBookingRow[] | null>(null);
  const [catalog, setCatalog] = useState<TravelCatalogRow[]>([]);
  const [reviews, setReviews] = useState<TravelReviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((v) => v + 1), []);

  useEffect(() => {
    void getTravelOverview().then(setOverview).catch((e) => { setOverview(null); setError(errorText(e, C.denied)); });
    void listTravelBookings(100).then(setBookings).catch((e) => { setBookings([]); setError(errorText(e, C.denied)); });
    void listTravelCatalog().then(setCatalog).catch(() => setCatalog([]));
    void listTravelReviews(100).then(setReviews).catch(() => setReviews([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const money = (amount: number, currency: string) => {
    try { return new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "code", maximumFractionDigits: 2 }).format(amount); } catch { return `${amount.toFixed(2)} ${currency}`; }
  };
  const moneyMap = (m: Record<string, number>) => {
    const parts = Object.entries(m).map(([c, v]) => money(v, c));
    return parts.length ? parts.join(" · ") : "—";
  };
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) : "—");

  const run = async (action: () => Promise<void>) => {
    try { await action(); setNotice(C.updated); reload(); } catch (e) { setNotice(errorText(e, C.failed)); }
  };

  return (
    <div style={{ display: "grid", gap: "var(--space-4)" }} data-testid="travel-tab">
      <div><h2 style={{ margin: "0 0 4px" }}>{C.title}</h2><p className="text-muted" style={{ margin: 0 }}>{C.intro}</p></div>
      {overview === null && !error && <div className="tag tag-neutral">{C.loading}</div>}
      {error && <div className="tag tag-neutral">{error}</div>}
      {notice && <div className="tag tag-neutral" role="status">{notice}</div>}

      {overview && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }}>
          <div className="card elev-sm"><div className="text-muted" style={{ fontSize: 12 }}>{C.bookings}</div><strong style={{ fontSize: 24 }}>{overview.bookingsTotal}</strong><div className="text-muted" style={{ fontSize: 11 }}>{overview.confirmed} {C.confirmed} · {overview.cancelled} {C.cancelled}</div></div>
          <div className="card elev-sm"><div className="text-muted" style={{ fontSize: 12 }}>{C.gross}</div><strong style={{ fontSize: 18 }}>{moneyMap(overview.gross)}</strong><div className="text-muted" style={{ fontSize: 11 }}>{C.refunded}: {moneyMap(overview.refunded)}</div></div>
          <div className="card elev-sm"><div className="text-muted" style={{ fontSize: 12 }}>{C.pending}</div><strong style={{ fontSize: 24 }}>{overview.installmentsPending}</strong><div className="text-muted" style={{ fontSize: 11 }}>{overview.installmentsOverdue > 0 ? <span className="tag tag-warning">{overview.installmentsOverdue} {C.overdue}</span> : `0 ${C.overdue}`} · {money(overview.installmentsPendingValue, "USD")}</div></div>
          <div className="card elev-sm"><div className="text-muted" style={{ fontSize: 12 }}>{C.reviews}</div><strong style={{ fontSize: 24 }}>{overview.reviews}</strong><div className="text-muted" style={{ fontSize: 11 }}>{C.avg} {overview.avgRating ?? "—"} · {overview.hiddenReviews} {C.hidden} · {overview.favorites} {C.favorites.toLowerCase()}</div></div>
          <div className="card elev-sm"><div className="text-muted" style={{ fontSize: 12 }}>{C.onSale}</div><strong style={{ fontSize: 24 }}>{overview.flightsActive + overview.hotelsActive}</strong><div className="text-muted" style={{ fontSize: 11 }}>{overview.flightsActive} {C.flights} · {overview.hotelsActive} {C.hotels}{overview.flightsLowSeats > 0 ? ` · ${C.lowSeats}: ${overview.flightsLowSeats}` : ""}</div></div>
        </div>
      )}

      <div className="card elev-sm" style={{ overflowX: "auto", gap: 8 }}>
        <strong>{C.secBookings}</strong>
        {bookings && bookings.length === 0 && <div className="text-muted">{C.none}</div>}
        {bookings && bookings.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }} data-testid="travel-bookings">
            <thead><tr className="text-muted" style={{ textAlign: "left" }}><th style={{ padding: 6 }}>{C.reference}</th><th>{C.customer}</th><th>{C.item}</th><th>{C.date}</th><th>{C.amount}</th><th>{C.plan}</th><th>{C.status}</th></tr></thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} style={{ borderTop: "1px solid var(--border, #ddd)" }}>
                  <td style={{ padding: 6, fontFamily: "monospace" }}>{b.reference}</td>
                  <td>{b.userName || "—"}<div className="text-muted" style={{ fontSize: 11 }}>{b.userEmail}</div></td>
                  <td>{b.title}{b.source !== "payrus" && <> <span className="tag tag-neutral">{C.partner}</span></>}<div className="text-muted" style={{ fontSize: 11 }}>{b.kind === "flight" ? C.flight : C.hotel} · {b.kind === "hotel" ? `${b.nights}n · ` : ""}{b.passengers}×</div></td>
                  <td>{date(b.travelDate)}</td>
                  <td>{money(b.amount, b.currency)}{b.refundedAmount > 0 && <div className="text-muted" style={{ fontSize: 11 }}>{money(b.refundedAmount, b.currency)} {C.refundedOn}</div>}</td>
                  <td>{b.installmentsTotal > 0 ? `${b.installmentsPaid}/${b.installmentsTotal}` : "—"}</td>
                  <td><span className={b.status === "confirmed" ? "tag tag-success" : "tag tag-neutral"}>{b.status === "confirmed" ? C.confirmed : C.cancelled}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card elev-sm" style={{ overflowX: "auto", gap: 8 }}>
        <strong>{C.secCatalog}</strong>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }} data-testid="travel-catalog">
          <thead><tr className="text-muted" style={{ textAlign: "left" }}><th style={{ padding: 6 }}>{C.item}</th><th>{C.price}</th><th>{C.seats}</th><th>{C.booked}</th><th>{C.saved}</th><th>{C.status}</th><th /></tr></thead>
          <tbody>
            {catalog.map((c) => (
              <tr key={`${c.kind}:${c.id}`} style={{ borderTop: "1px solid var(--border, #ddd)" }}>
                <td style={{ padding: 6 }}>{c.title}<div className="text-muted" style={{ fontSize: 11 }}>{c.kind === "flight" ? C.flight : C.hotel} · {c.subtitle}</div></td>
                <td>{money(c.price, c.currency)}</td>
                <td>{c.seatsLeft === null ? "—" : c.seatsLeft <= 3 ? <span className="tag tag-warning">{c.seatsLeft}</span> : c.seatsLeft}</td>
                <td>{c.bookings}</td><td>{c.favorites}</td>
                <td><span className={c.active ? "tag tag-success" : "tag tag-neutral"}>{c.active ? C.live : C.off}</span></td>
                <td><button type="button" className="btn btn-ghost" onClick={() => void run(() => setTravelActive(c.kind, c.id, !c.active))}>{c.active ? C.switchOff : C.switchOn}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card elev-sm" style={{ gap: 8 }}>
        <strong>{C.secReviews}</strong>
        {reviews.length === 0 && <div className="text-muted">{C.none}</div>}
        <div style={{ display: "grid", gap: 8 }} data-testid="travel-reviews">
          {reviews.map((r) => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, opacity: r.hidden ? 0.55 : 1 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13 }}><strong>{r.userName}</strong> · {r.entity} · {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} {r.verified && <span className="tag tag-success">{C.verified}</span>} {r.hidden && <span className="tag tag-neutral">{C.hidden}</span>}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>{r.comment}</div>
              </div>
              <button type="button" className="btn btn-ghost" style={{ whiteSpace: "nowrap" }} onClick={() => void run(() => setTravelReviewHidden(r.id, !r.hidden))}>{r.hidden ? C.unhide : C.hide}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
