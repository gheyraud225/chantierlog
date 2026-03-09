import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité — ChantierLog",
};

const LAST_UPDATED = "9 mars 2026";

export default function ConfidentialitePage() {
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
          <h1 className="text-3xl font-bold text-white">Politique de confidentialité</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Conforme à la loi fédérale suisse sur la protection des données révisée (nLPD / revDSG),
            entrée en vigueur le 1er septembre 2023.
          </p>
        </div>

        <Section title="1. Responsable du traitement">
          <p>
            ChantierLog est un <strong className="text-gray-200">projet étudiant</strong> développé
            dans le canton de Neuchâtel (NE), Suisse. Entité responsable :{" "}
            <strong className="text-gray-200">Projet Étudiant (NE)</strong>.
          </p>
          <p>
            Pour toute question relative à vos données, contactez-nous via l&apos;interface de
            l&apos;application.
          </p>
        </Section>

        <Section title="2. Données collectées">
          <p>Nous collectons uniquement les données nécessaires au fonctionnement du service :</p>
          <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
            <li>Adresse e-mail et mot de passe (authentification)</li>
            <li>Notes de chantier, photos et champs personnalisés saisis par l&apos;utilisateur</li>
            <li>Transcriptions vocales générées automatiquement depuis vos enregistrements audio</li>
            <li>Données d&apos;usage anonymisées (Vercel Analytics)</li>
          </ul>
          <p className="text-sm text-gray-500 bg-white/[0.03] border border-white/5 rounded-lg px-4 py-3">
            Aucun enregistrement audio n&apos;est conservé sur nos serveurs. Le fichier audio est
            transmis directement à OpenAI pour transcription puis supprimé.
          </p>
        </Section>

        <Section title="3. Hébergement et stockage (Supabase — UE)">
          <p>
            Vos données sont stockées sur{" "}
            <strong className="text-gray-200">Supabase</strong>, dont les serveurs sont localisés
            dans l&apos;Union Européenne (Frankfurt, AWS eu-central-1). L&apos;UE bénéficie d&apos;une
            décision d&apos;adéquation reconnue par la Suisse ; le transfert est donc conforme à l&apos;art. 16
            nLPD.
          </p>
        </Section>

        <Section title="4. Traitement IA — OpenAI & Anthropic (États-Unis)">
          <p>
            Certaines fonctionnalités utilisent des modèles d&apos;intelligence artificielle de tiers
            établis aux États-Unis :
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
            <li>
              <strong className="text-gray-200">OpenAI (Whisper)</strong> — transcription des notes
              vocales
            </li>
            <li>
              <strong className="text-gray-200">Anthropic (Claude)</strong> — résumé et amélioration
              des notes
            </li>
          </ul>
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-orange-300">Politique Zéro-Entraînement</p>
            <p className="text-sm text-gray-400">
              OpenAI et Anthropic s&apos;engagent contractuellement à ne pas utiliser les données
              soumises via l&apos;API pour entraîner leurs modèles (
              <em>Zero-Training Data Policy</em> — API Terms of Service). Vos contenus ne servent
              jamais à l&apos;amélioration de leurs modèles.
            </p>
          </div>
          <p>
            Ce transfert vers les États-Unis est encadré par des garanties appropriées conformément
            à l&apos;art. 16 al. 2 nLPD (clauses contractuelles types).
          </p>
        </Section>

        <Section title="5. Base légale du traitement">
          <p>
            Le traitement de vos données repose sur l&apos;exécution du contrat (fourniture du service)
            et, pour les fonctionnalités IA, sur votre consentement explicite au moment de
            l&apos;utilisation.
          </p>
        </Section>

        <Section title="6. Durée de conservation">
          <p>
            Vos données sont conservées tant que votre compte est actif. En cas de suppression de
            compte, toutes les données associées sont effacées dans un délai de{" "}
            <strong className="text-gray-200">30 jours</strong>.
          </p>
        </Section>

        <Section title="7. Vos droits (nLPD art. 25–27)">
          <p>Conformément à la nLPD, vous disposez des droits suivants :</p>
          <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
            <li>
              <strong className="text-gray-200">Droit d&apos;accès</strong> — obtenir une copie de vos
              données personnelles
            </li>
            <li>
              <strong className="text-gray-200">Droit de rectification</strong> — corriger des
              données inexactes
            </li>
            <li>
              <strong className="text-gray-200">Droit à l&apos;effacement (« droit à l&apos;oubli »)</strong>{" "}
              — demander la suppression complète de votre compte et de toutes vos données
            </li>
            <li>
              <strong className="text-gray-200">Droit à la portabilité</strong> — exporter vos
              données dans un format standard
            </li>
            <li>
              <strong className="text-gray-200">Droit d&apos;opposition</strong> — vous opposer à
              certains traitements
            </li>
          </ul>
          <p>
            Pour exercer ces droits, contactez-nous via l&apos;application. Toute demande sera traitée
            dans un délai de <strong className="text-gray-200">30 jours</strong>.
          </p>
        </Section>

        <Section title="8. Cookies et traceurs">
          <p>
            ChantierLog n&apos;utilise pas de cookies publicitaires ou de tracking tiers. Seuls des
            cookies techniques strictement nécessaires au fonctionnement de l&apos;authentification sont
            utilisés (session Supabase).
          </p>
        </Section>

        <Section title="9. Modifications">
          <p>
            Nous nous réservons le droit de modifier cette politique. En cas de modification
            substantielle, vous serez informé par notification dans l&apos;application. La date de
            dernière mise à jour est indiquée en haut de cette page.
          </p>
        </Section>

        <div className="border-t border-white/5 pt-6 flex flex-wrap gap-4 text-xs text-gray-600">
          <Link href="/cgu" className="hover:text-orange-400 transition-colors">
            Conditions Générales d&apos;Utilisation →
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
