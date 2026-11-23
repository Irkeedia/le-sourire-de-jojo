/**
 * Base de connaissances de Jojo, l'assistant du site (sans IA).
 * Tout est construit à partir des mêmes données que les pages (tarifs, catalogue,
 * FAQ, communes) : si Céline change un prix ou une activité, Jojo suit tout seul.
 *
 * Règles de contenu respectées ici comme sur le site :
 * - le prix TTC est toujours donné en premier ; le prix après crédit d'impôt est
 *   présenté à part, plus discret, avec « sous conditions » ;
 * - publics : seniors autonomes, personnes temporairement immobilisées, parents solos
 *   (garde d'enfants de plus de 3 ans, en journée hors week-end) ;
 * - aucune mention des activités en pause.
 */
import {
  FORFAIT_MENSUEL,
  FORFAITS_ACTIVITES,
  PACK_DECOUVERTE,
  TARIF_HORAIRE_BRUT_EUR as H,
  TARIF_HORAIRE_NET_EUR as HN,
  tarifNetApresCredit as net,
} from "@/lib/tarif";
import { COMMUNES_ZONE, EXCLUSIONS, INCLUS, POLES } from "@/lib/catalogue";
import { CONTACT_PHONE, CONTACT_PHONE_E164, HOME_FAQ, MORE_FAQ } from "@/lib/seo";

export type Mood = "bonjour" | "reflechit" | "agenda" | "joie" | "guide" | "oups" | "telephone";

export type ChatAction = {
  label: string;
  /** Lien vers une page du site ; `#ancre` pour une section */
  href?: string;
  /** Démarre un parcours dans le chat */
  flow?: "booking" | "question";
  /** Enchaîne sur un autre sujet */
  intent?: string;
  primary?: boolean;
};

export type PriceLine = { label: string; ttc: number; unit: string; net?: number; netUnit?: string };

export type Answer = {
  text: string[];
  list?: string[];
  prices?: PriceLine[];
  /** Petite mention en bas de bulle (conditions, sources) */
  note?: string;
  actions?: ChatAction[];
  /** Sujets proposés ensuite (identifiants d'intentions) */
  next?: string[];
  mood?: Mood;
};

export type Intent = {
  id: string;
  /** Libellé court pour les puces de suggestion */
  chip: string;
  /** Mots-clés (normalisés, sans accents). « ! » devant = mot très parlant. */
  keys: string[];
  answer: Answer;
};

const faq = (q: string) => [...HOME_FAQ, ...MORE_FAQ].find((f) => f.question.startsWith(q))?.answer ?? "";
const pole = (id: string) => POLES.find((p) => p.id === id)!;
const activites = (id: string) => pole(id).activites.map((a) => (a.detail ? `${a.nom} : ${a.detail}` : a.nom));
const CREDIT_NOTE = "Crédit d’impôt de 50 %, sous conditions (art. 199 sexdecies du CGI). Montants indicatifs, précisés au devis.";
const TEL: ChatAction = { label: `Appeler ${CONTACT_PHONE}`, href: `tel:${CONTACT_PHONE_E164}` };
const BOOK: ChatAction = { label: "Demander la visite offerte", flow: "booking", primary: true };

export const PHONE = { display: CONTACT_PHONE, e164: CONTACT_PHONE_E164 };
export const COMMUNES = COMMUNES_ZONE;
export const RATE = { ttc: H, net: HN };

export const INTENTS: Intent[] = [
  {
    id: "rdv",
    chip: "Prendre rendez-vous",
    keys: ["!rendez vous", "!rdv", "!reserver", "!creneau", "prendre", "disponibilite", "dispo", "inscrire", "inscription service", "demande", "commencer", "rappeler", "rappel", "!visite offerte"],
    answer: {
      text: ["Avec plaisir ! Je vous pose quelques questions ici, ça prend une minute. Céline vous rappelle ensuite pour fixer le jour exact de la visite d’évaluation offerte."],
      actions: [{ label: "C’est parti", flow: "booking", primary: true }, TEL],
      mood: "agenda",
    },
  },
  {
    id: "tarifs",
    chip: "Les tarifs",
    keys: ["!prix", "!tarif", "!combien", "!cout", "coute", "cher", "payer", "euro", "euros", "facture", "budget", "heure"],
    answer: {
      text: [`Une heure d’accompagnement coûte ${H} € TTC. Les visites de 2 h et 3 h sont un peu moins chères à l’heure.`],
      prices: FORFAITS_ACTIVITES.filter((f, i, all) => all.findIndex((g) => g.heures === f.heures) === i).map((f) => ({
        label: `Visite de ${f.duree}`,
        ttc: f.brutEur,
        unit: "TTC",
        net: net(f.brutEur),
        netUnit: "après crédit d’impôt*",
      })),
      note: CREDIT_NOTE,
      actions: [{ label: "Voir les formules", href: "/offres#formules" }, { label: "Simuler mon budget", href: "/offres#simulateur" }],
      next: ["forfaits", "credit", "rdv"],
      mood: "guide",
    },
  },
  {
    id: "forfaits",
    chip: "Les formules",
    keys: ["!forfait", "!formule", "!pack", "mensuel", "decouverte", "abonnement", "offre", "offres", "sur mesure", "devis"],
    answer: {
      text: ["Il y a quatre façons de faire appel à Céline :"],
      prices: [
        { label: `Pack découverte · ${PACK_DECOUVERTE.heures} h`, ttc: PACK_DECOUVERTE.brutEur, unit: "TTC", net: net(PACK_DECOUVERTE.brutEur), netUnit: "après crédit d’impôt*" },
        { label: `Forfait mensuel · ${FORFAIT_MENSUEL.heures} h / mois`, ttc: FORFAIT_MENSUEL.brutEur, unit: "TTC / mois", net: net(FORFAIT_MENSUEL.brutEur), netUnit: "après crédit d’impôt*" },
        { label: "Accompagnement ponctuel", ttc: H, unit: "TTC / heure", net: HN, netUnit: "après crédit d’impôt*" },
      ],
      list: ["Sur-mesure : un devis après l’entretien, sur la même base horaire."],
      note: CREDIT_NOTE,
      actions: [{ label: "Comparer les formules", href: "/offres#formules" }, BOOK],
      next: ["credit", "inclus"],
      mood: "guide",
    },
  },
  {
    id: "credit",
    chip: "Crédit d’impôt",
    keys: ["!impot", "!credit", "fiscal", "deduction", "deduire", "reduction", "!avance immediate", "urssaf", "rembourse", "remboursement", "moitie", "50", "aide financiere", "aides", "financer", "financement"],
    answer: {
      text: [
        "La moitié des sommes versées vous est remboursée par l’État, que vous soyez imposable ou non (crédit d’impôt de 50 %, dans la limite des plafonds).",
        "Avec l’Avance immédiate de l’URSSAF, vous ne payez directement que la moitié de la facture.",
      ],
      list: [
        "Il est payé par la personne aidée, et jamais en espèces.",
        "Pour les sorties, seules les heures passées au domicile comptent.",
        "La rédaction d’une biographie n’y ouvre pas droit.",
      ],
      note: "Article 199 sexdecies du CGI. Montants précisés au devis.",
      actions: [{ label: "Voir les aides", href: "/offres#aides" }],
      next: ["cesu", "apa", "tarifs"],
      mood: "guide",
    },
  },
  {
    id: "cesu",
    chip: "CESU",
    keys: ["!cesu", "cheque emploi", "mutuelle", "caisse de retraite", "employeur"],
    answer: {
      text: ["Les CESU préfinancés (offerts par certaines caisses de retraite, mutuelles ou employeurs) sont acceptés lorsque le devis ou le contrat le prévoit."],
      actions: [{ label: "Voir les aides", href: "/offres#aides" }],
      next: ["credit", "paiement"],
    },
  },
  {
    id: "apa",
    chip: "APA et PCH",
    keys: ["!apa", "!pch", "mdph", "departement", "aide sociale", "conseil departemental"],
    answer: {
      text: ["L’APA et la PCH ne financent pas ces prestations. En revanche, Céline peut intervenir en complément des aides déjà en place."],
      next: ["credit", "dependance"],
    },
  },
  {
    id: "paiement",
    chip: "Moyens de paiement",
    keys: ["!paiement", "!payer comment", "virement", "cheque", "carte bancaire", "!espece", "!especes", "!liquide", "regler"],
    answer: {
      text: ["Le paiement se fait selon ce qui est prévu au contrat : virement, chèque, ou CESU préfinancés quand c’est possible."],
      list: ["Les paiements en espèces n’ouvrent pas droit au crédit d’impôt."],
      actions: [{ label: "Lire les CGV", href: "/informations-legales#cgv" }],
      next: ["credit"],
    },
  },
  {
    id: "activites",
    chip: "Les activités",
    keys: ["!activite", "!activites", "!service", "!services", "prestation", "prestations", "proposez", "programme", "occuper", "pole", "poles"],
    answer: {
      text: ["Céline propose trois pôles d’activités, qu’on peut mélanger selon les envies du jour :"],
      list: POLES.map((p) => `${p.titre} (${p.dureeMin.toLowerCase()})`),
      actions: [{ label: "Voir toutes les activités", href: "/services" }],
      next: ["compagnie", "sorties", "repit"],
      mood: "guide",
    },
  },
  {
    id: "compagnie",
    chip: "Compagnie & lien social",
    keys: ["!compagnie", "lecture", "lire", "jeux", "jeu", "memoire", "mots croises", "discuter", "discussion", "parler", "isole", "isolement", "solitude", "seul", "seule", "musique", "photo", "photos", "puzzle", "creatif", "couture", "perles", "mandala", "vernis", "manucure", "cafe", "the", "recit de vie", "souvenirs"],
    answer: {
      text: [pole("compagnie").accroche, "Au programme, au choix :"],
      list: activites("compagnie"),
      actions: [{ label: "Voir ce pôle", href: "/services#compagnie" }],
      next: ["sorties", "tarifs", "rdv"],
    },
  },
  {
    id: "sorties",
    chip: "Sorties & balades",
    keys: ["!sortie", "!sorties", "!balade", "!promenade", "!promener", "marcher", "marche", "courses", "commerces", "opticien", "pharmacie", "exposition", "jardin", "jardinage", "dehors", "accompagner", "accompagnement rendez vous", "mobilite"],
    answer: {
      text: [pole("mobilite").accroche, "Les sorties durent au moins 2 h :"],
      list: activites("mobilite"),
      note: "Pour le crédit d’impôt, seules les heures passées au domicile comptent.",
      actions: [{ label: "Voir ce pôle", href: "/services#mobilite" }],
      next: ["compagnie", "tarifs", "rdv"],
    },
  },
  {
    id: "repit",
    chip: "Répit & vie pratique",
    keys: ["!repit", "souffler", "relais", "relayer", "courrier", "papiers", "administratif", "demarches", "tablette", "ordinateur", "internet", "vie pratique"],
    answer: {
      text: [pole("repit").accroche],
      list: activites("repit"),
      actions: [{ label: "Voir ce pôle", href: "/services#repit" }],
      next: ["enfants", "aidants", "rdv"],
    },
  },
  {
    id: "enfants",
    chip: "Garde d’enfants",
    keys: ["!enfant", "!enfants", "!garde", "bebe", "nounou", "baby", "parent solo", "maman solo", "papa solo", "famille monoparentale", "ecole", "mercredi", "fils", "fille"],
    answer: {
      text: [
        "Oui, pour les parents solos : Céline peut garder ponctuellement des enfants de plus de 3 ans, en journée et hors week-end.",
        "La garde des enfants de moins de 3 ans n’est pas proposée.",
      ],
      actions: [{ label: "Voir le pôle Répit", href: "/services#repit" }, BOOK],
      next: ["tarifs", "credit"],
    },
  },
  {
    id: "aidants",
    chip: "Pour les aidants",
    keys: ["!aidant", "!aidants", "fatigue", "epuise", "epuisement", "soutien", "!proche aidant"],
    answer: {
      text: [faq("Les aidants")],
      actions: [BOOK],
      next: ["repit", "carnet"],
    },
  },
  {
    id: "public",
    chip: "Pour qui ?",
    keys: ["!pour qui", "public", "senior", "seniors", "personne agee", "ages", "retraite", "!convalescence", "immobilise", "operation", "hopital", "!fracture", "platre", "jambe"],
    answer: {
      text: ["L’accompagnement s’adresse à trois publics :"],
      list: [
        "Les seniors autonomes",
        "Les personnes temporairement immobilisées (convalescence, retour à domicile)",
        "Les parents solos (garde d’enfants de plus de 3 ans, en journée hors week-end)",
      ],
      next: ["dependance", "activites"],
    },
  },
  {
    id: "role",
    chip: "Le rôle de Céline",
    keys: ["!prevention", "!fragile", "fragilite", "fragilise", "l autonomie", "!preservation", "!role", "observer", "observation", "reperer", "reperage", "!coordinatrice", "structurante", "!stimulation", "stimuler", "!cognitif", "cognitive", "cognitives", "motricite", "motrice", "motrices", "multi competences", "competences", "substitue"],
    answer: {
      text: [
        "Auprès des personnes fragiles, Céline est une présence structurante, au service de la prévention du quotidien et de la préservation de l’autonomie. Son rôle tient en trois mots :",
      ],
      list: [
        "Observer : l’humeur, l’envie de faire, les habitudes, le cadre de vie",
        "Repérer : ce qui change (fatigue inhabituelle, isolement, obstacle dans la maison)",
        "Transmettre : à la famille via le carnet de sourires, et vers les professionnels compétents si c’est utile, avec votre accord",
      ],
      note: "Coordinatrice de proximité, elle ne se substitue pas aux familles : elle favorise les échanges et respecte l’histoire familiale. Ses activités multi-compétences stimulent les capacités cognitives et motrices.",
      actions: [{ label: "Sa façon de travailler", href: "/a-propos#facon" }],
      next: ["activites", "carnet", "rdv"],
    },
  },
  {
    id: "dependance",
    chip: "Personnes dépendantes",
    keys: ["!dependant", "!dependante", "!dependance", "!alzheimer", "!parkinson", "grabataire", "alite", "gir", "ehpad", "!perte d autonomie", "!perte de l autonomie"],
    answer: { text: [faq("Intervenez-vous")], next: ["public", "medical"] },
  },
  {
    id: "medical",
    chip: "Soins et médical",
    keys: ["!medical", "!soin", "soins", "infirmier", "infirmiere", "!toilette", "!laver", "habiller", "medicament", "medicaments", "nursing", "pansement", "piqure", "paramedical", "douche"],
    answer: {
      text: [faq("Est-ce du médical")],
      list: EXCLUSIONS,
      next: ["public", "activites"],
    },
  },
  {
    id: "situation",
    chip: "Une situation particulière",
    keys: ["handicap", "fauteuil", "pmr", "mobilite reduite", "particulier", "particuliere", "specifique"],
    answer: {
      text: ["Chaque situation est différente : le plus simple est d’en parler directement avec Céline. La visite d’évaluation est faite pour ça, et elle est offerte."],
      actions: [BOOK, TEL],
      mood: "telephone",
    },
  },
  {
    id: "zone",
    chip: "Zone d’intervention",
    keys: ["!zone", "!secteur", "!commune", "communes", "ville", "villes", "venez", "deplacez", "deplacement", "frais", "kilometre", "km", "intervenez", "habite", "region", "alentours", "corbarieu", "montauban", "tarn et garonne"],
    answer: {
      text: ["Céline part de Corbarieu. Dans ces communes, les déplacements sont compris dans le tarif :"],
      list: COMMUNES_ZONE,
      note: "Au-delà : barème kilométrique de l’administration, chaque demande est étudiée au cas par cas.",
      actions: [{ label: "Voir la carte", href: "/a-propos#zone" }],
      next: ["rdv", "tarifs"],
      mood: "guide",
    },
  },
  {
    id: "deroule",
    chip: "Comment ça se passe ?",
    keys: ["!comment ca marche", "!comment ca se passe", "etapes", "etape", "deroulement", "deroule", "fonctionne", "fonctionnement", "debuter", "premiere fois", "procedure"],
    answer: {
      text: ["Quatre étapes, sans engagement au départ :"],
      list: [
        "Premier échange, par téléphone ou formulaire",
        "Visite d’évaluation offerte à domicile (environ 45 min)",
        "Devis et contrat signés en ligne, puis les visites à votre rythme",
        "Suivi et ajustements grâce au carnet et à l’espace familles",
      ],
      actions: [{ label: "Voir les étapes", href: "/services#deroule" }, BOOK],
      next: ["visite", "contrat"],
      mood: "guide",
    },
  },
  {
    id: "visite",
    chip: "La visite offerte",
    keys: ["!evaluation", "premiere visite", "gratuit", "gratuite", "offerte", "offert", "essai", "rencontrer", "rencontre", "sans engagement"],
    answer: {
      text: ["La visite d’évaluation est offerte : environ 45 minutes à domicile, avec la famille si vous le souhaitez, pour cerner les besoins et le rythme. Sans engagement."],
      actions: [BOOK],
      next: ["deroule", "tarifs"],
      mood: "agenda",
    },
  },
  {
    id: "duree",
    chip: "Durée des visites",
    keys: ["!duree", "combien de temps", "minimum", "minimale", "longtemps", "frequence", "combien de fois", "regulier", "reguliere", "par semaine"],
    answer: {
      text: ["Une visite dure au moins 1 h, et au moins 2 h pour les sorties.", faq("Comment fixez-vous")],
      next: ["tarifs", "forfaits"],
    },
  },
  {
    id: "horaires",
    chip: "Jours et horaires",
    keys: ["!horaire", "!horaires", "jour", "jours", "week end", "weekend", "samedi", "dimanche", "soir", "nuit", "matin", "apres midi", "quand", "ouvert"],
    answer: {
      text: [
        "Les jours et heures se fixent ensemble, selon vos besoins, lors de la visite d’évaluation.",
        "Pour la garde d’enfants (parents solos), c’est en journée et hors week-end.",
      ],
      actions: [BOOK],
      next: ["ouverture", "duree"],
    },
  },
  {
    id: "ouverture",
    chip: "Date d’ouverture",
    keys: ["!ouverture", "!ouvrir", "!ouvre", "!ouvrez", "lancement", "2027", "janvier", "debut", "quand commencez"],
    answer: {
      text: ["Le Sourire de Jojo ouvre le 2 janvier 2027. Vous pouvez déjà faire votre demande : Céline vous recontacte pour organiser la visite d’évaluation."],
      actions: [BOOK],
    },
  },
  {
    id: "inclus",
    chip: "Ce qui est compris",
    keys: ["!inclus", "compris", "comprend", "materiel", "fourni", "fournit", "apporte", "apporter"],
    answer: { text: ["Dans toutes les formules :"], list: [...INCLUS, "Le matériel des activités, apporté par Céline"], next: ["carnet", "forfaits"] },
  },
  {
    id: "carnet",
    chip: "Le carnet de sourires",
    keys: ["!carnet", "sourires", "journal", "suivi", "nouvelles", "liaison", "raconter"],
    answer: {
      text: ["Le carnet de sourires est rempli à chaque visite : petits faits marquants, préférences, photos, envies. Pas un dossier médical : une histoire à plusieurs voix.", "Les familles peuvent aussi suivre les visites à distance dans l’espace familles."],
      actions: [{ label: "Découvrir le carnet", href: "/services#carnet" }],
      next: ["espace"],
    },
  },
  {
    id: "espace",
    chip: "Espace familles",
    keys: ["!espace familles", "!espace famille", "!compte", "connexion", "connecter", "identifiant", "mot de passe", "!s inscrire", "creer un compte", "login", "acces"],
    answer: {
      text: ["Chaque famille accompagnée reçoit un compte personnel pour suivre les visites. Il se crée avec le lien d’invitation envoyé par Céline, une fois l’accompagnement mis en place."],
      actions: [{ label: "Se connecter", href: "/compte/connexion" }, { label: "Mot de passe oublié", href: "/compte/mot-de-passe-oublie" }],
      next: ["carnet", "rdv"],
    },
  },
  {
    id: "contrat",
    chip: "Contrat et signature",
    keys: ["!contrat", "signer", "signature", "engagement", "resilier", "resiliation", "devis"],
    answer: {
      text: [faq("Comment se passe la signature"), "Il n’y a aucun engagement au moment de la visite d’évaluation."],
      actions: [{ label: "Voir le contrat type", href: "/informations-legales#contrat" }],
      next: ["annulation"],
    },
  },
  {
    id: "annulation",
    chip: "Annuler une visite",
    keys: ["!annuler", "!annulation", "reporter", "report", "decaler", "absent", "empeche", "malade"],
    answer: {
      text: [
        "Prévenez dès que possible, par téléphone ou message. Le délai de prévenance est précisé dans votre contrat ou devis (par exemple 24 h ou 48 h ouvrées).",
        "Si Céline doit annuler (maladie, force majeure), elle vous propose un report au plus vite.",
      ],
      actions: [{ label: "Conditions d’annulation", href: "/informations-legales#annulation" }, TEL],
    },
  },
  {
    id: "difficile",
    chip: "Les jours difficiles",
    keys: ["difficile", "mauvais jour", "fatigue du jour", "pas envie", "humeur", "triste"],
    answer: { text: [faq("Que se passe-t-il")], next: ["duree"] },
  },
  {
    id: "celine",
    chip: "Qui est Céline ?",
    keys: ["!celine", "!qui etes", "!vous etes qui", "c est qui", "fondatrice", "histoire", "parcours", "presentation", "pourquoi jojo", "nom jojo", "boiteries"],
    answer: {
      text: ["Céline Meunier Ben Neji a fondé Le Sourire de Jojo à Corbarieu. Tout a commencé avec sa maman, et un livre tombé au bon moment : Faire de nos boiteries une danse.", "Jojo, c’est le surnom qui rassemble le sourire, la légèreté et la dignité."],
      actions: [{ label: "Lire son histoire", href: "/a-propos#histoire" }],
      next: ["role", "activites", "rdv"],
    },
  },
  {
    id: "bot",
    chip: "Qui es-tu ?",
    keys: ["!qui es tu", "!tu es qui", "robot", "!ia", "intelligence artificielle", "humain", "chatgpt", "bot", "jojo"],
    answer: {
      text: ["Je suis Jojo, l’assistant du site ! Je ne suis pas une intelligence artificielle : je connais simplement tout le site par cœur, et je peux transmettre votre demande à Céline."],
      next: ["rdv", "tarifs", "activites"],
      mood: "bonjour",
    },
  },
  {
    id: "legal",
    chip: "Informations légales",
    keys: ["!cgv", "!mentions legales", "conditions generales", "legal", "siret", "nova", "mediateur", "assurance", "rgpd", "donnees", "confidentialite", "confidentiel", "vie privee"],
    answer: {
      text: ["Mentions légales, conditions générales, annulation, consentement et contrat sont réunis sur une seule page. Ce qui se dit à la maison reste à la maison : les données sont traitées dans le cadre du RGPD."],
      actions: [{ label: "Informations légales", href: "/informations-legales" }],
    },
  },
  {
    id: "partenaires",
    chip: "Partenariats",
    keys: ["!partenaire", "!partenariat", "professionnel", "ccas", "association", "collaborer", "collaboration", "structure"],
    answer: {
      text: ["Le réseau de partenaires locaux est en construction (santé, mairies, structures locales), pour orienter sans jamais remplacer les soins. Pour devenir partenaire, le plus simple est d’écrire via le formulaire."],
      actions: [{ label: "Proposer un partenariat", href: "/contact?objet=partenariat#formulaire" }, { label: "En savoir plus", href: "/a-propos#partenaires" }],
    },
  },
  {
    id: "contact",
    chip: "Contacter Céline",
    keys: ["!telephone", "!appeler", "!numero", "joindre", "contacter", "contact", "mail", "email", "e mail", "ecrire", "message", "adresse"],
    answer: {
      text: [`Vous pouvez joindre Céline au ${CONTACT_PHONE}, ou lui laisser une demande ici : je la lui transmets.`],
      actions: [TEL, { label: "Laisser une demande", flow: "booking", primary: true }, { label: "Formulaire de contact", href: "/contact#formulaire" }],
      mood: "telephone",
    },
  },
];

export const INTENT_BY_ID = Object.fromEntries(INTENTS.map((i) => [i.id, i]));

/** Réponses hors catalogue */
export const URGENCE: Answer = {
  text: [
    "En cas d’urgence vitale, appelez tout de suite les secours : le 15 (SAMU), le 18 (pompiers) ou le 112. Le 114 par SMS pour les personnes sourdes ou malentendantes.",
    "Céline n’est pas un service d’urgence.",
  ],
  actions: [{ label: "Appeler le 15", href: "tel:15", primary: true }, { label: "Appeler le 112", href: "tel:112" }],
  next: ["contact"],
  mood: "telephone",
};

export const MERCI: Answer = { text: ["Avec plaisir ! Autre chose ?"], next: ["rdv", "tarifs", "activites"], mood: "joie" };
export const BONJOUR: Answer = { text: ["Bonjour ! Posez-moi votre question, ou choisissez un sujet :"], next: ["rdv", "tarifs", "activites", "zone"], mood: "bonjour" };
export const AU_REVOIR: Answer = { text: ["Au revoir, et belle journée ! Je reste là, en bas à droite, si besoin."], mood: "joie" };

/** Suggestions d'accueil selon la page visitée */
export const PAGE_HINTS: Record<string, { text: string; next: string[] }> = {
  "/": { text: "Je connais le site par cœur. Je peux vous renseigner, calculer un prix ou demander une visite pour vous.", next: ["rdv", "tarifs", "activites", "zone", "credit", "espace"] },
  "/services": { text: "Vous regardez les activités : je peux vous détailler un pôle ou vous dire ce qui est compris.", next: ["compagnie", "sorties", "repit", "rdv"] },
  "/offres": { text: "Une question de prix ? Dites-moi un nombre d’heures, par exemple « 3 h par semaine », et je calcule.", next: ["forfaits", "credit", "cesu", "rdv"] },
  "/a-propos": { text: "Envie d’en savoir plus sur Céline ou sur la zone ? Demandez-moi.", next: ["celine", "role", "zone", "rdv"] },
  "/contact": { text: "Je peux remplir la demande avec vous, ici, en quelques questions.", next: ["rdv", "contact", "zone"] },
  "/informations-legales": { text: "Je peux vous résumer un point : annulation, contrat, paiement…", next: ["annulation", "contrat", "paiement", "legal"] },
};

/** Calcul de prix à partir d'un nombre d'heures (même base que le simulateur) */
export function priceFor(hours: number, per: "seance" | "semaine" | "mois"): Answer {
  const seance = FORFAITS_ACTIVITES.find((f) => f.heures === hours);
  if (per === "seance") {
    const ttc = seance ? seance.brutEur : hours * H;
    return {
      text: [`Pour une visite de ${hours} h :`],
      prices: [{ label: `${hours} h d’accompagnement`, ttc, unit: "TTC", net: net(ttc), netUnit: "après crédit d’impôt*" }],
      note: CREDIT_NOTE,
      actions: [{ label: "Simuler sur la page Tarifs", href: "/offres#simulateur" }, BOOK],
      next: ["forfaits", "credit"],
      mood: "guide",
    };
  }
  const monthHours = per === "semaine" ? hours * 4 : hours;
  // Par semaine : une visite de cette durée, 4 fois dans le mois (prix dégressif des visites de 2 h et 3 h)
  const ttc = per === "semaine" && seance ? seance.brutEur * 4 : monthHours * H;
  const prices: PriceLine[] = [
    {
      label: per === "semaine" ? `4 visites de ${hours} h par mois` : `${monthHours} h par mois, à l’heure`,
      ttc,
      unit: "TTC / mois",
      net: net(ttc),
      netUnit: "après crédit d’impôt*",
    },
  ];
  const text = [per === "semaine" ? `${hours} h par semaine, c’est environ ${monthHours} h par mois (4 semaines) :` : `Pour ${hours} h par mois :`];
  if (monthHours === FORFAIT_MENSUEL.heures) {
    prices.push({ label: `Forfait mensuel · ${FORFAIT_MENSUEL.heures} h`, ttc: FORFAIT_MENSUEL.brutEur, unit: "TTC / mois", net: net(FORFAIT_MENSUEL.brutEur), netUnit: "après crédit d’impôt*" });
    text.push("Bonne nouvelle : c’est exactement le forfait mensuel, plus avantageux.");
  } else if (monthHours > FORFAIT_MENSUEL.heures) {
    text.push(`À partir de ${FORFAIT_MENSUEL.heures} h par mois, le forfait mensuel ou un sur-mesure peut être plus avantageux : Céline vous fera un devis.`);
  }
  return {
    text,
    prices,
    note: CREDIT_NOTE,
    actions: [{ label: "Simuler sur la page Tarifs", href: "/offres#simulateur" }, BOOK],
    next: ["forfaits", "credit"],
    mood: "guide",
  };
}
