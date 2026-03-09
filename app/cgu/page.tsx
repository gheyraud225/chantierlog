import Link from "next/link";

export const metadata = {
  title: "Conditions Générales d'Utilisation — ChantierLog",
};

const LAST_UPDATED = "9 mars 2026";

export default function CguPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-gray-300">
      <header className="border-b border-white/5">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            <span>←</span>
            <span className="font-semibold text-white">ChantierLog</span>
          </Link>
          <span className="text-xs text-gray-600">Mise à jour : {LAST_UPDATED}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12 space-y-10">
        <div className="space-y-3">
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest">Légal</p>
          <h1 className="text-3xl font-bold text-white">Conditions Générales d&apos;Utilisation</h1>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-full px-3 py-1">
              ⚠ Projet Bêta Étudiant
            </span>
            <span className="text-xs text-gray-600 self-center">Fourni « en l&apos;état » (as-is)</span>
          </div>
        </div>

        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-5 py-4 space-y-2">
          <p className="text-sm font-semibold text-yellow-300">
            ⚠ Avis important — Projet Bêta Étudiant
          </p>
          <p className="text-sm text-gray-400 leading-relaxed">
            ChantierLog est un <strong className="text-gray-200">projet étudiant en phase bêta</strong>,
            développé à titre pédagogique dans le canton de Neuchâtel (NE), Suisse. Il est fourni{" "}
            <strong className="text-gray-200">« en l&apos;état »</strong>, sans garantie de disponibilité,
            d&apos;exactitude ou de continuité du service. Toute utilisation professionnelle critique
            se fait sous la seule responsabilité de l&apos;utilisateur.
          </p>
        </div>

        <Section title="1. Acceptation des conditions">
          <p>
            En accédant à ChantierLog, vous acceptez les présentes Conditions Générales
            d&apos;Utilisation ainsi que notre{" "}
            <Link href="/confidentialite" className="text-orange-400 hover:text-orange-300 underline underline-offset-2">
              Politique de confidentialité
            </Link>
            . Si vous n&apos;acceptez pas ces conditions, veuillez ne pas utiliser le service.
          </p>
        </Section>

        <Section title="2. Description du service">
          <p>
            ChantierLog est une application web de journal de chantier numérique permettant la
            saisie de notes quotidiennes, la gestion d&apos;équipes, la capture de photos et l&apos;export
            de rapports PDF. Des fonctionnalités d&apos;intelligence artificielle (transcription vocale,
            résumé automatique) sont proposées à titre optionnel.
          </p>
        </Section>

        <Section title="3. Utilisation des notes vocales — Avertissement légal suisse">
          <div className="bg-red-500/5 border border-red-500/30 rounded-xl px-5 py-4 space-y-3">
            <p className="text-sm font-bold text-red-400 uppercase tracking-wide">
              ⚠ Obligation légale — Art. 179bis CP suisse
            </p>
            <p className="text-sm text-gray-300 leading-relaxed">
              La fonctionnalité d&apos;enregistrement vocal de ChantierLog est destinée à l&apos;enregistrement
              de <strong>vos propres notes</strong>. L&apos;enregistrement de conversations ou de déclarations
              de tiers sans leur consentement est{" "}
              <strong className="text-red-300">strictement interdit</strong> en Suisse.
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">
              <strong className="text-gray-200">Article 179bis du Code pénal suisse (CP)</strong> —
              Écoute et enregistrement de conversations d&apos;autrui : quiconque, sans le consentement
              de tous les participants, écoute à l&apos;aide d&apos;un appareil d&apos;écoute ou enregistre sur
              un porteur de sons une conversation non publique est puni d&apos;une peine privative de
              liberté de trois ans au plus ou d&apos;une peine pécuniaire.
            </p>
            <p className="text-sm font-medium text-gray-300">
              Les utilisateurs doivent se conformer strictement à l&apos;art. 179bis CP concernant
              l&apos;enregistrement vocal de tiers sans consentement. L&apos;équipe ChantierLog décline
              toute responsabilité en cas de violation de cette disposition.
            </p>
          </div>
        </Section>

        <Section title="4. Comptes utilisateurs">
          <p>
            L&apos;accès au service nécessite la création d&apos;un compte. Vous êtes responsable de la
            confidentialité de vos identifiants et de toute activité réalisée depuis votre compte.
            Vous vous engagez à fournir des informations exactes et à notifier immédiatement toute
            utilisation non autorisée.
          </p>
        </Section>

        <Section title="5. Contenu utilisateur">
          <p>
            Vous conservez l&apos;intégralité des droits sur les contenus que vous publiez
            (notes, photos, enregistrements). Vous accordez à ChantierLog une licence limitée,
            non exclusive, nécessaire au seul fonctionnement technique du service.
          </p>
          <p>
            Vous vous engagez à ne pas publier de contenu illicite, diffamatoire, portant atteinte
            à la vie privée de tiers ou violant des droits de propriété intellectuelle.
          </p>
        </Section>

        <Section title="6. Intelligence artificielle — Limitations">
          <p>
            Les résumés, transcriptions et titres générés automatiquement par l&apos;IA sont fournis à
            titre indicatif. ChantierLog ne garantit pas leur exactitude. L&apos;utilisateur doit
            toujours vérifier et valider les contenus générés avant tout usage professionnel ou
            contractuel.
          </p>
        </Section>

        <Section title="7. Disponibilité du service">
          <p>
            En tant que projet bêta étudiant, ChantierLog est fourni <strong className="text-gray-200">« en l&apos;état »
            et « selon disponibilité »</strong> (<em>as-is, as-available</em>). Nous ne garantissons
            aucun niveau de disponibilité (SLA). Des interruptions, pertes de données ou modifications
            sans préavis peuvent survenir.
          </p>
        </Section>

        <Section title="8. Limitation de responsabilité">
          <p>
            Dans les limites autorisées par le droit suisse, l&apos;équipe ChantierLog ne saurait être
            tenue responsable de tout dommage indirect, perte de données, manque à gagner ou
            interruption d&apos;activité résultant de l&apos;utilisation ou de l&apos;impossibilité d&apos;utiliser
            le service.
          </p>
        </Section>

        <Section title="9. Droit applicable et for juridictionnel">
          <p>
            Les présentes CGU sont soumises au <strong className="text-gray-200">droit suisse</strong>.
            Tout litige découlant de leur interprétation ou exécution sera soumis à la compétence
            exclusive des tribunaux du canton de Neuchâtel, Suisse, sous réserve d&apos;un recours au
            Tribunal fédéral.
          </p>
        </Section>

        <Section title="10. Modifications">
          <p>
            Nous nous réservons le droit de modifier ces CGU à tout moment. La poursuite de
            l&apos;utilisation du service après notification d&apos;une modification vaut acceptation des
            nouvelles conditions.
          </p>
        </Section>

        <div className="border-t border-white/5 pt-6 flex flex-wrap gap-4 text-xs text-gray-600">
          <Link href="/confidentialite" className="hover:text-orange-400 transition-colors">
            Politique de confidentialité →
          </Link>
          <Link href="/" className="hover:text-gray-400 transition-colors">
            Retour à l&apos;application
          </Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="space-y-3 text-sm text-gray-400 leading-relaxed">{children}</div>
    </section>
  );
}
