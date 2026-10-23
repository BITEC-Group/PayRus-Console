import type { Locale } from "../types.ts";

// PRS-KYC-007: business workspaces collect the organisation's owners (UBOs) and an authorised representative.
export interface KybCopy {
  title: string; note: string; ownersCount: string; ownerName: string; ownerPct: string; addOwner: string;
  repName: string; repNote: string; incomplete: string;
}

export const KYB: Record<Locale, KybCopy> = {
  en: {
    title: "Business verification", note: "This workspace belongs to an organisation. Tell us who owns it and who may act for it; it stays restricted until the owners and representative are approved.",
    ownersCount: "How many people own 25% or more, or control the organisation?", ownerName: "Owner full name", ownerPct: "Ownership %", addOwner: "Add owner",
    repName: "Authorised representative (full name)", repNote: "The person who may sign and act for the organisation.", incomplete: "Add every owner you declared and the authorised representative.",
  },
  fr: {
    title: "Vérification de l'entreprise", note: "Cet espace appartient à une organisation. Indiquez qui la détient et qui peut agir en son nom ; il reste restreint tant que les propriétaires et le représentant ne sont pas approuvés.",
    ownersCount: "Combien de personnes détiennent 25 % ou plus, ou contrôlent l'organisation ?", ownerName: "Nom complet du propriétaire", ownerPct: "Détention %", addOwner: "Ajouter un propriétaire",
    repName: "Représentant autorisé (nom complet)", repNote: "La personne qui peut signer et agir au nom de l'organisation.", incomplete: "Ajoutez chaque propriétaire déclaré et le représentant autorisé.",
  },
  pt: {
    title: "Verificação da empresa", note: "Este espaço pertence a uma organização. Indique quem é o proprietário e quem pode agir em seu nome; fica restrito até os proprietários e o representante serem aprovados.",
    ownersCount: "Quantas pessoas detêm 25% ou mais, ou controlam a organização?", ownerName: "Nome completo do proprietário", ownerPct: "Participação %", addOwner: "Adicionar proprietário",
    repName: "Representante autorizado (nome completo)", repNote: "A pessoa que pode assinar e agir em nome da organização.", incomplete: "Adicione cada proprietário declarado e o representante autorizado.",
  },
  es: {
    title: "Verificación de la empresa", note: "Este espacio pertenece a una organización. Indica quién es el propietario y quién puede actuar en su nombre; permanece restringido hasta que se aprueben los propietarios y el representante.",
    ownersCount: "¿Cuántas personas poseen el 25 % o más, o controlan la organización?", ownerName: "Nombre completo del propietario", ownerPct: "Participación %", addOwner: "Añadir propietario",
    repName: "Representante autorizado (nombre completo)", repNote: "La persona que puede firmar y actuar en nombre de la organización.", incomplete: "Añade cada propietario declarado y el representante autorizado.",
  },
};

export const BUSINESS_ROLES = new Set(["Merchant", "Agent", "Treasury", "Institution", "NGO", "Group"]);
