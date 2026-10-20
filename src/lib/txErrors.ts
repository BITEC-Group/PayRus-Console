// Turns what the backend (or the network) throws when a money action fails into a message the user can act on, in the user's
// language: "insufficient wallet balance: you need 208.00 EUR but your wallet holds 50.00 EUR", "unauthorised corridor", and so on.
// The same recognition rules as App/src/lib/transaction-errors.ts (the database raises the same plain-English exceptions for both).
import type { Locale } from "../types.ts";

export type TxErrorCode =
  | "insufficient_balance" | "insufficient_balance_plain" | "no_wallet" | "unauthorised" | "permission" | "session" | "network"
  | "corridor_not_offered" | "corridor_suspended" | "corridor_below_min" | "corridor_above_max" | "corridor_below_floor" | "corridor_no_rate" | "corridor_invalid"
  | "payout_not_connected" | "partner_not_live" | "agent_not_allowed" | "no_agent" | "agents_only" | "wallet_receiver"
  | "approval_limit" | "role_permission" | "self_transfer" | "unknown_recipient" | "bad_amount" | "currency_unsupported"
  | "quote_expired" | "sold_out" | "duplicate" | "unknown";

export interface TxError { code: TxErrorCode; params: Record<string, string> }

const CORRIDOR: Record<string, TxErrorCode> = {
  not_offered: "corridor_not_offered", suspended: "corridor_suspended", below_min: "corridor_below_min", above_max: "corridor_above_max",
  below_floor: "corridor_below_floor", no_rate: "corridor_no_rate", invalid: "corridor_invalid",
};

const raw = (e: unknown): string => (e instanceof Error ? e.message : typeof e === "string" ? e : e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "");

export function classifyTxError(e: unknown): TxError {
  const text = raw(e);
  const m = text.toLowerCase();
  const done = (code: TxErrorCode, params: Record<string, string> = {}): TxError => ({ code, params });

  const corridor = /corridor_blocked:\s*([a-z_]+)/.exec(m);
  if (corridor) return done(CORRIDOR[corridor[1]] ?? "corridor_invalid");

  const bal = /insufficient (?:wallet )?balance(?:\s*\(\s*need\s+([\d.,]+)\s*([a-z]{3})?\s*,\s*have\s+([\d.,]+)\s*([a-z]{3})?\s*\))?/i.exec(text);
  if (bal) return bal[1] ? done("insufficient_balance", { need: bal[1], have: bal[3] ?? "", currency: (bal[2] ?? bal[4] ?? "").toUpperCase() }) : done("insufficient_balance_plain");

  if (/has no wallet|no wallet yet|open a wallet first|no \w+ wallet yet/.test(m)) return done("no_wallet");

  if (/acting user does not match|not permitted|not authori[sz]ed|only .* can |only the superadmin|admin role required/.test(m) && !/does not allow this step/.test(m)) {
    return done(/agent/.test(m) ? "agents_only" : "unauthorised");
  }
  if (/permission denied|row-level security|violates row-level/.test(m)) return done("permission");
  if (/jwt|not signed in|auth session missing|invalid refresh token|session (?:has )?expired/.test(m)) return done("session");

  const notConnected = /(.+?) is not connected in ([a-z]{2})/i.exec(text);
  if (notConnected) return done("payout_not_connected", { method: notConnected[1].replace(/^.*?:\s*/, ""), country: notConnected[2].toUpperCase() });
  if (/partner route is not live|route is not live|contract not active/.test(m)) return done("partner_not_live");
  if (/agent cannot pay out|cannot pay out to this receiver/.test(m)) return done("agent_not_allowed");
  if (/no pickup agent is available/.test(m)) return done("no_agent");
  if (/only agents can pay out/.test(m)) return done("agents_only");
  if (/use a payrus transfer for wallet receivers/.test(m)) return done("wallet_receiver");

  const approval = /above your approval limit of ([\d.,]+)/i.exec(text);
  if (approval) return done("approval_limit", { limit: approval[1] });
  if (/does not allow this step|needs the .* permission/.test(m)) return done("role_permission");

  if (/cannot send to yourself/.test(m)) return done("self_transfer");
  if (/unknown (?:recipient|receiver|sender|user|customer)|no such (?:user|customer|receiver)/.test(m)) return done("unknown_recipient");
  if (/amount must be positive|amount must be|must be greater than/.test(m)) return done("bad_amount");
  if (/not a supported currency|no reference rate|no branding available/.test(m)) return done("currency_unsupported");
  if (/expired/.test(m)) return done("quote_expired");
  if (/sold out/.test(m)) return done("sold_out");
  if (/duplicate key|already (?:booked|exists)|unique constraint/.test(m)) return done("duplicate");
  if (/failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout|timed out/.test(m)) return done("network");
  return done("unknown");
}

const MESSAGES: Record<Locale, Record<Exclude<TxErrorCode, "unknown">, string>> = {
  en: {
    insufficient_balance: "Insufficient wallet balance: you need {need} {currency} but your wallet holds {have} {currency}. Top up or choose a smaller amount.",
    insufficient_balance_plain: "Insufficient wallet balance. Top up your wallet or choose a smaller amount.",
    no_wallet: "You have no wallet to pay from. Open a wallet and top it up first.",
    unauthorised: "Not authorised: this action doesn't match the account you are signed in with. Sign in again with the right account.",
    permission: "You don't have permission to do this. Contact support if you think you should.",
    session: "Your session has expired. Sign in again to continue.",
    network: "Can't reach PayRus. Check your connection and try again.",
    corridor_not_offered: "Unauthorised corridor: PayRus is not authorised to send on this route yet. Choose a supported corridor.",
    corridor_suspended: "This corridor is temporarily suspended. Try again later or choose another route.",
    corridor_below_min: "This amount is below the minimum for this corridor. Send a larger amount.",
    corridor_above_max: "This amount is above the maximum for this corridor. Send a smaller amount.",
    corridor_below_floor: "Transfers this small are not available on this corridor. Please send a larger amount.",
    corridor_no_rate: "No exchange rate is available for this currency pair right now. Try again later.",
    corridor_invalid: "Check the amount and the two currencies, then try again.",
    payout_not_connected: "{method} payouts are not connected in {country} yet. Choose another delivery method.",
    partner_not_live: "The payout partner for this route isn't live yet. Choose another route or try later.",
    agent_not_allowed: "Unauthorised agent: this agent isn't allowed to pay out to this receiver (different country or currency zone). Pick another agent.",
    no_agent: "No pickup agent is available for this receiver yet. Choose another delivery method.",
    agents_only: "Only a PayRus agent can complete this step.",
    wallet_receiver: "This receiver has a PayRus wallet — use a PayRus transfer instead of a payout.",
    approval_limit: "This is above your approval limit of {limit}. Ask someone with a higher limit to approve it.",
    role_permission: "Your role in this workspace doesn't allow this step. Ask an administrator for the permission.",
    self_transfer: "You can't send money to yourself.",
    unknown_recipient: "We couldn't find that recipient. Check the details and try again.",
    bad_amount: "Enter an amount greater than zero.",
    currency_unsupported: "This currency can't be used for this transaction right now (no reference rate).",
    quote_expired: "The quote has expired. Refresh and try again for an up-to-date price.",
    sold_out: "Sold out: there aren't enough places left.",
    duplicate: "This has already been done. Check your history before trying again.",
  },
  fr: {
    insufficient_balance: "Solde du portefeuille insuffisant : il vous faut {need} {currency} mais votre portefeuille contient {have} {currency}. Alimentez-le ou choisissez un montant plus faible.",
    insufficient_balance_plain: "Solde du portefeuille insuffisant. Alimentez-le ou choisissez un montant plus faible.",
    no_wallet: "Vous n'avez aucun portefeuille pour payer. Ouvrez-en un et alimentez-le d'abord.",
    unauthorised: "Non autorisé : cette action ne correspond pas au compte connecté. Reconnectez-vous avec le bon compte.",
    permission: "Vous n'avez pas la permission d'effectuer cette action. Contactez le support si vous pensez que c'est une erreur.",
    session: "Votre session a expiré. Reconnectez-vous pour continuer.",
    network: "Impossible de joindre PayRus. Vérifiez votre connexion et réessayez.",
    corridor_not_offered: "Corridor non autorisé : PayRus n'est pas encore autorisé à envoyer sur cette route. Choisissez un corridor pris en charge.",
    corridor_suspended: "Ce corridor est temporairement suspendu. Réessayez plus tard ou choisissez une autre route.",
    corridor_below_min: "Ce montant est inférieur au minimum de ce corridor. Envoyez un montant plus élevé.",
    corridor_above_max: "Ce montant dépasse le maximum de ce corridor. Envoyez un montant plus faible.",
    corridor_below_floor: "Les transferts de ce montant ne sont pas disponibles sur ce corridor. Envoyez un montant plus élevé.",
    corridor_no_rate: "Aucun taux de change n'est disponible pour cette paire de devises actuellement. Réessayez plus tard.",
    corridor_invalid: "Vérifiez le montant et les deux devises, puis réessayez.",
    payout_not_connected: "Les paiements {method} ne sont pas encore connectés pour {country}. Choisissez un autre mode de livraison.",
    partner_not_live: "Le partenaire de paiement de cette route n'est pas encore actif. Choisissez une autre route ou réessayez plus tard.",
    agent_not_allowed: "Agent non autorisé : cet agent ne peut pas payer ce bénéficiaire (autre pays ou zone monétaire). Choisissez un autre agent.",
    no_agent: "Aucun agent de retrait n'est disponible pour ce bénéficiaire. Choisissez un autre mode de livraison.",
    agents_only: "Seul un agent PayRus peut effectuer cette étape.",
    wallet_receiver: "Ce bénéficiaire a un portefeuille PayRus — utilisez un transfert PayRus plutôt qu'un paiement externe.",
    approval_limit: "Ce montant dépasse votre limite d'approbation de {limit}. Demandez à une personne ayant une limite plus élevée de l'approuver.",
    role_permission: "Votre rôle dans cet espace ne permet pas cette étape. Demandez l'autorisation à un administrateur.",
    self_transfer: "Vous ne pouvez pas vous envoyer de l'argent à vous-même.",
    unknown_recipient: "Nous n'avons pas trouvé ce bénéficiaire. Vérifiez les informations et réessayez.",
    bad_amount: "Saisissez un montant supérieur à zéro.",
    currency_unsupported: "Cette devise ne peut pas être utilisée pour cette opération actuellement (pas de taux de référence).",
    quote_expired: "Le devis a expiré. Actualisez et réessayez pour un prix à jour.",
    sold_out: "Complet : il ne reste pas assez de places.",
    duplicate: "Cette opération a déjà été effectuée. Consultez votre historique avant de réessayer.",
  },
  pt: {
    insufficient_balance: "Saldo da carteira insuficiente: precisa de {need} {currency} mas a carteira tem {have} {currency}. Carregue-a ou escolha um valor menor.",
    insufficient_balance_plain: "Saldo da carteira insuficiente. Carregue-a ou escolha um valor menor.",
    no_wallet: "Não tem nenhuma carteira para pagar. Abra uma e carregue-a primeiro.",
    unauthorised: "Não autorizado: esta ação não corresponde à conta com sessão iniciada. Inicie sessão com a conta certa.",
    permission: "Não tem permissão para fazer isto. Contacte o suporte se achar que devia ter.",
    session: "A sua sessão expirou. Inicie sessão novamente para continuar.",
    network: "Não é possível ligar à PayRus. Verifique a ligação e tente novamente.",
    corridor_not_offered: "Corredor não autorizado: a PayRus ainda não está autorizada a enviar nesta rota. Escolha um corredor suportado.",
    corridor_suspended: "Este corredor está temporariamente suspenso. Tente mais tarde ou escolha outra rota.",
    corridor_below_min: "Este valor está abaixo do mínimo deste corredor. Envie um valor maior.",
    corridor_above_max: "Este valor está acima do máximo deste corredor. Envie um valor menor.",
    corridor_below_floor: "Transferências tão pequenas não estão disponíveis neste corredor. Envie um valor maior.",
    corridor_no_rate: "Não há taxa de câmbio disponível para este par de moedas neste momento. Tente mais tarde.",
    corridor_invalid: "Verifique o valor e as duas moedas e tente novamente.",
    payout_not_connected: "Os pagamentos {method} ainda não estão ligados em {country}. Escolha outro método de entrega.",
    partner_not_live: "O parceiro de pagamento desta rota ainda não está ativo. Escolha outra rota ou tente mais tarde.",
    agent_not_allowed: "Agente não autorizado: este agente não pode pagar a este beneficiário (outro país ou zona monetária). Escolha outro agente.",
    no_agent: "Não há agente de levantamento disponível para este beneficiário. Escolha outro método de entrega.",
    agents_only: "Só um agente PayRus pode concluir este passo.",
    wallet_receiver: "Este beneficiário tem uma carteira PayRus — use uma transferência PayRus em vez de um pagamento externo.",
    approval_limit: "Este valor ultrapassa o seu limite de aprovação de {limit}. Peça a alguém com um limite maior para aprovar.",
    role_permission: "A sua função neste espaço não permite este passo. Peça a permissão a um administrador.",
    self_transfer: "Não pode enviar dinheiro para si próprio.",
    unknown_recipient: "Não encontrámos esse beneficiário. Verifique os dados e tente novamente.",
    bad_amount: "Introduza um valor superior a zero.",
    currency_unsupported: "Esta moeda não pode ser usada nesta operação neste momento (sem taxa de referência).",
    quote_expired: "A cotação expirou. Atualize e tente novamente para um preço atual.",
    sold_out: "Esgotado: já não há lugares suficientes.",
    duplicate: "Esta operação já foi feita. Consulte o histórico antes de tentar novamente.",
  },
  es: {
    insufficient_balance: "Saldo del monedero insuficiente: necesita {need} {currency} pero su monedero tiene {have} {currency}. Recárguelo o elija un importe menor.",
    insufficient_balance_plain: "Saldo del monedero insuficiente. Recárguelo o elija un importe menor.",
    no_wallet: "No tiene ningún monedero con el que pagar. Abra uno y recárguelo primero.",
    unauthorised: "No autorizado: esta acción no coincide con la cuenta con la que inició sesión. Inicie sesión con la cuenta correcta.",
    permission: "No tiene permiso para hacer esto. Contacte con soporte si cree que debería tenerlo.",
    session: "Su sesión ha caducado. Inicie sesión de nuevo para continuar.",
    network: "No se puede conectar con PayRus. Compruebe su conexión e inténtelo de nuevo.",
    corridor_not_offered: "Corredor no autorizado: PayRus aún no está autorizado a enviar por esta ruta. Elija un corredor compatible.",
    corridor_suspended: "Este corredor está suspendido temporalmente. Inténtelo más tarde o elija otra ruta.",
    corridor_below_min: "Este importe está por debajo del mínimo de este corredor. Envíe un importe mayor.",
    corridor_above_max: "Este importe supera el máximo de este corredor. Envíe un importe menor.",
    corridor_below_floor: "Las transferencias tan pequeñas no están disponibles en este corredor. Envíe un importe mayor.",
    corridor_no_rate: "No hay tipo de cambio disponible para este par de monedas ahora. Inténtelo más tarde.",
    corridor_invalid: "Revise el importe y las dos monedas e inténtelo de nuevo.",
    payout_not_connected: "Los pagos {method} aún no están conectados en {country}. Elija otro método de entrega.",
    partner_not_live: "El socio de pago de esta ruta aún no está activo. Elija otra ruta o inténtelo más tarde.",
    agent_not_allowed: "Agente no autorizado: este agente no puede pagar a este beneficiario (otro país o zona monetaria). Elija otro agente.",
    no_agent: "No hay agente de recogida disponible para este beneficiario. Elija otro método de entrega.",
    agents_only: "Solo un agente de PayRus puede completar este paso.",
    wallet_receiver: "Este beneficiario tiene un monedero PayRus — use una transferencia PayRus en lugar de un pago externo.",
    approval_limit: "Esto supera su límite de aprobación de {limit}. Pida a alguien con un límite mayor que lo apruebe.",
    role_permission: "Su rol en este espacio no permite este paso. Pida el permiso a un administrador.",
    self_transfer: "No puede enviarse dinero a sí mismo.",
    unknown_recipient: "No encontramos a ese destinatario. Revise los datos e inténtelo de nuevo.",
    bad_amount: "Introduzca un importe mayor que cero.",
    currency_unsupported: "Esta moneda no puede usarse para esta operación ahora (sin tipo de referencia).",
    quote_expired: "La cotización ha caducado. Actualice e inténtelo de nuevo para un precio al día.",
    sold_out: "Agotado: no quedan suficientes plazas.",
    duplicate: "Esto ya se ha hecho. Consulte su historial antes de intentarlo de nuevo.",
  },
};

/** The message to show; `fallback` (the screen's own generic wording) is used only when the failure is not recognised. */
export function describeTxError(e: unknown, locale: Locale, fallback: string): string {
  const { code, params } = classifyTxError(e);
  if (code === "unknown") return fallback;
  const template = (MESSAGES[locale] ?? MESSAGES.en)[code];
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => params[key] ?? "");
}
