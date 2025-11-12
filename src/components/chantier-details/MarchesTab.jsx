
// ⚠️ COMPOSANT FIGÉE v2.8.3 - Gestion des marchés entreprises avec modification
// Ce composant gère la liste, création, modification et export des marchés
// Export PDF : Logo CLIENT à gauche, Logo GESTIONBAT à droite
// Footer PDF : Architecte / GESTIONBAT / Autres partenaires
// GÉNÉRATION ACTE D'ENGAGEMENT : 
//   1. Si trame Excel existe dans chantier → Auto-remplissage Excel
//   2. Sinon → Fallback HTML direct (numéros de page uniformisés, pas d'instructions)
// NE PAS MODIFIER sans validation

import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Download, FileText, Lock } from "lucide-react";
import MarcheDialog from "../marches/MarcheDialog";
import MarchesList from "../marches/MarchesList";
import SearchBar from "../common/SearchBar";
import AdvancedFilters from "../common/AdvancedFilters";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { usePermissions } from "../common/usePermissions";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function MarchesTab({ chantierId }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedMarche, setSelectedMarche] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedMarcheForGenerate, setSelectedMarcheForGenerate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState({
    entreprise_id: "all",
    date_from: "",
    date_to: "",
    montant_min: "",
    montant_max: "",
    a_caution: "all"
  });
  
  const queryClient = useQueryClient();
  const { canViewMarches, canCreateMarches, canEditMarches, canExportMarches } = usePermissions();

  const { data: marches, isLoading } = useQuery({
    queryKey: ['marches', chantierId],
    queryFn: async () => {
      const allMarches = await base44.entities.MarcheEntreprise.list('-date');
      return allMarches.filter(m => m.chantier_id === chantierId);
    },
    initialData: [],
    enabled: canViewMarches,
  });

  const { data: chantier } = useQuery({
    queryKey: ['chantier', chantierId],
    queryFn: async () => {
      const chantiers = await base44.entities.Chantier.list();
      return chantiers.find(c => c.id === chantierId);
    },
    enabled: !!chantierId,
  });

  const { data: entreprises } = useQuery({
    queryKey: ['entreprises'],
    queryFn: () => base44.entities.Entreprise.list(),
    initialData: [],
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const { data: partenaires } = useQuery({
    queryKey: ['partenaires'],
    queryFn: () => base44.entities.Partenaire.list(),
    initialData: [],
  });

  const { data: membresEquipe } = useQuery({
    queryKey: ['membresEquipe'],
    queryFn: () => base44.entities.MembreEquipe.list(),
    initialData: [],
  });

  const { data: infoGestionbat } = useQuery({
    queryKey: ['info-gestionbat'],
    queryFn: async () => {
      const infos = await base44.entities.InfoGestionbat.list();
      return infos.length > 0 ? infos[0] : null;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MarcheEntreprise.create({ ...data, chantier_id: chantierId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marches'] });
      setShowDialog(false);
      setSelectedMarche(null);
      toast.success("Marché créé");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MarcheEntreprise.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marches'] });
      setShowDialog(false);
      setSelectedMarche(null);
      toast.success("Marché mis à jour");
    },
  });

  const handleSubmit = (data) => {
    if (selectedMarche) {
      if (!canEditMarches) {
        toast.error("Permission refusée");
        return;
      }
      updateMutation.mutate({ id: selectedMarche.id, data });
    } else {
      if (!canCreateMarches) {
        toast.error("Permission refusée");
        return;
      }
      createMutation.mutate(data);
    }
  };

  const filteredMarches = useMemo(() => {
    let result = marches;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => {
        const entreprise = entreprises.find(e => e.id === m.entreprise_id);
        const entrepriseNom = entreprise?.nom || "";
        return (
          m.numero_lot?.toLowerCase().includes(query) ||
          m.intitule_lot?.toLowerCase().includes(query) ||
          entrepriseNom.toLowerCase().includes(query) ||
          m.numero_marche?.toLowerCase().includes(query)
        );
      });
    }

    if (advancedFilters.entreprise_id && advancedFilters.entreprise_id !== "all") {
      result = result.filter(m => m.entreprise_id === advancedFilters.entreprise_id);
    }

    if (advancedFilters.date_from) {
      result = result.filter(m => m.date >= advancedFilters.date_from);
    }
    if (advancedFilters.date_to) {
      result = result.filter(m => m.date <= advancedFilters.date_to);
    }

    if (advancedFilters.montant_min) {
      result = result.filter(m => m.montant >= parseFloat(advancedFilters.montant_min));
    }
    if (advancedFilters.montant_max) {
      result = result.filter(m => m.montant <= parseFloat(advancedFilters.montant_max));
    }

    if (advancedFilters.a_caution !== "all") {
      const hasCaution = advancedFilters.a_caution === "oui";
      result = result.filter(m => m.a_caution === hasCaution);
    }

    return result;
  }, [marches, searchQuery, advancedFilters, entreprises]);

  const filterConfig = [
    {
      key: "entreprise_id",
      label: "Entreprise",
      type: "select",
      options: entreprises.map(e => ({ value: e.id, label: e.nom }))
    },
    {
      key: "date_from",
      label: "Date (à partir de)",
      type: "date"
    },
    {
      key: "date_to",
      label: "Date (jusqu'à)",
      type: "date"
    },
    {
      key: "montant_min",
      label: "Montant minimum (€)",
      type: "number",
      placeholder: "0"
    },
    {
      key: "montant_max",
      label: "Montant maximum (€)",
      type: "number",
      placeholder: "1000000"
    },
    {
      key: "a_caution",
      label: "Caution",
      type: "select",
      options: [
        { value: "oui", label: "Avec caution" },
        { value: "non", label: "Sans caution" }
      ]
    }
  ];

  // ⚠️ GÉNÉRATION ACTE D'ENGAGEMENT FIGÉE v2.8.3
  // 1. Si trame Excel existe → Auto-remplissage avec fillExcelTemplate
  // 2. Sinon → Fallback HTML direct (numéros de page uniformisés, pas d'instructions)
  // =======================================================================
  const handleGenerateMarche = async () => {
    if (!canExportMarches) {
      toast.error("Permission refusée");
      return;
    }

    if (!selectedMarcheForGenerate) {
      toast.error("Erreur", {
        description: "Veuillez sélectionner un marché",
      });
      return;
    }

    setGenerating(true);

    try {
      const marche = marches.find(m => m.id === selectedMarcheForGenerate);
      if (!marche) {
        throw new Error("Marché introuvable");
      }

      const entreprise = entreprises.find(e => e.id === marche.entreprise_id);
      const client = clients.find(c => c.id === chantier?.client_id);
      const tauxTVA = marche.taux_tva || 20;
      const montantHT = marche.montant || 0;
      const montantTVA = montantHT * (tauxTVA / 100);
      const montantTTC = montantHT + montantTVA;

      const dateFormatee = format(new Date(), "dd/MM/yyyy", { locale: fr });

      // ✅ PRIORITÉ 1 : Si une trame Excel existe, l'utiliser pour auto-remplissage
      if (chantier?.trame_marches_url) {
        try {
          toast.loading("Génération en cours...", {
            description: "Remplissage automatique de la trame d'acte d'engagement",
            id: "marche-generation",
          });

          // Préparer les données pour remplir la trame
          const data = {
            "{{DATE_MARCHE}}": marche.date ? format(new Date(marche.date), "dd/MM/yyyy", { locale: fr }) : dateFormatee,
            "{{DATE_GENERATION}}": dateFormatee,
            "{{CHANTIER_NOM}}": chantier?.nom || '',
            "{{CHANTIER_ADRESSE}}": chantier?.adresse || '',
            "{{CHANTIER_DATE_DEBUT}}": chantier?.date_debut ? format(new Date(chantier.date_debut), "dd MMMM yyyy", { locale: fr }) : '',
            "{{CHANTIER_DATE_FIN}}": chantier?.date_fin_prevue ? format(new Date(chantier.date_fin_prevue), "dd MMMM yyyy", { locale: fr }) : '',
            "{{CLIENT_NOM}}": client?.nom || '',
            "{{CLIENT_ADRESSE_1}}": client?.adresse_1 || '',
            "{{CLIENT_ADRESSE_2}}": client?.adresse_2 || '',
            "{{CLIENT_CODE_POSTAL}}": client?.code_postal || '',
            "{{CLIENT_VILLE}}": client?.ville || '',
            "{{CLIENT_SIRET}}": client?.siret || '',
            "{{ENTREPRISE_NOM}}": entreprise?.nom || '',
            "{{ENTREPRISE_ADRESSE_1}}": entreprise?.adresse_1 || '',
            "{{ENTREPRISE_ADRESSE_2}}": entreprise?.adresse_2 || '',
            "{{ENTREPRISE_CODE_POSTAL}}": entreprise?.code_postal || '',
            "{{ENTREPRISE_VILLE}}": entreprise?.ville || '',
            "{{ENTREPRISE_SIRET}}": entreprise?.siret || '',
            "{{ENTREPRISE_REPRESENTANT_CIVILITE}}": entreprise?.representant_civilite || '',
            "{{ENTREPRISE_REPRESENTANT_PRENOM}}": entreprise?.representant_prenom || '',
            "{{ENTREPRISE_REPRESENTANT_NOM}}": entreprise?.representant_nom || '',
            "{{ENTREPRISE_REPRESENTANT_QUALITE}}": entreprise?.representant_qualite || '',
            "{{NUMERO_LOT}}": marche.numero_lot || '',
            "{{INTITULE_LOT}}": marche.intitule_lot || '',
            "{{NUMERO_MARCHE}}": marche.numero_marche || '',
            "{{MONTANT_HT}}": montantHT.toFixed(2).replace('.', ','),
            "{{MONTANT_TVA}}": montantTVA.toFixed(2).replace('.', ','),
            "{{MONTANT_TTC}}": montantTTC.toFixed(2).replace('.', ','),
            "{{TAUX_TVA}}": tauxTVA.toString(),
            "{{MARCHE_CAUTIONNE}}": marche.a_caution ? "Oui" : "Non",
            "{{CAUTION_REFERENCE}}": marche.cautions?.[0]?.reference || '',
            "{{CAUTION_MONTANT}}": marche.cautions?.[0]?.montant?.toFixed(2).replace('.', ',') || '0,00',
            "{{GESTIONBAT_NOM}}": infoGestionbat?.nom_entreprise || 'GESTIONBAT',
            "{{GESTIONBAT_ADRESSE}}": infoGestionbat?.adresse || '',
            "{{GESTIONBAT_CODE_POSTAL}}": infoGestionbat?.code_postal || '',
            "{{GESTIONBAT_VILLE}}": infoGestionbat?.ville || '',
            "{{GESTIONBAT_TELEPHONE}}": infoGestionbat?.telephone || '',
            "{{GESTIONBAT_SIRET}}": infoGestionbat?.siret || '',
          };

          // Ajouter les cautions supplémentaires si elles existent
          if (marche.cautions && marche.cautions.length > 0) {
            marche.cautions.forEach((caution, index) => {
              const i = index + 1;
              data[`{{CAUTION_${i}_REFERENCE}}`] = caution.reference || '';
              data[`{{CAUTION_${i}_MONTANT}}`] = caution.montant?.toFixed(2).replace('.', ',') || '0,00';
              data[`{{CAUTION_${i}_DATE}}`] = caution.date_ajout ? format(new Date(caution.date_ajout), "dd/MM/yyyy", { locale: fr }) : '';
            });
          }

          const response = await base44.functions.invoke('fillExcelTemplate', {
            template_url: chantier.trame_marches_url,
            data: data
          });

          if (response.data.success && response.data.file_base64) {
            const byteCharacters = atob(response.data.file_base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            const nomChantier = (chantier?.nom || 'chantier').replace(/[^a-z0-9]/gi, '_');
            link.download = `Acte_Engagement_${marche.numero_lot || 'lot'}_${nomChantier}_${Date.now()}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setShowGenerateDialog(false);
            setSelectedMarcheForGenerate("");

            toast.success("✅ Acte d'engagement généré automatiquement !", {
              description: "Fichier Excel téléchargé avec succès",
              duration: 6000,
              id: "marche-generation",
            });

            setGenerating(false);
            return;

          } else {
            throw new Error("La réponse de l'API ne contient pas de fichier");
          }

        } catch (apiError) {
          console.error("Erreur lors du remplissage automatique:", apiError);
          toast.error("⚠️ Échec du remplissage automatique", {
            description: "Génération du fichier HTML standard...",
            id: "marche-generation",
          });
          // Fall through to HTML generation if Excel fails
        }
      }

      // ✅ FALLBACK : Génération HTML directe si pas de trame ou échec
      const logoClient = chantier?.logo_client_url 
        ? `<img src="${chantier.logo_client_url}" alt="Logo" style="max-width: 150px; max-height: 60px; object-fit: contain;" />` 
        : '';

      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Acte d'Engagement - ${marche.intitule_lot}</title>
  <style>
    @page {
      size: A4;
      margin: 2cm 2cm 2.5cm 2cm;
    }
    
    body {
      font-family: 'Calibri', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.3;
      margin: 0;
      padding: 0;
      color: #000;
    }
    
    .page {
      width: 21cm;
      min-height: 29.7cm;
      padding: 1.5cm 2cm;
      margin: 0 auto;
      background: white;
      position: relative;
      padding-bottom: 3cm; /* Ensure space for footer */
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1cm;
    }
    
    .header-logo {
      flex: 0 0 auto;
    }
    
    .header-title {
      flex: 1;
      text-align: center;
      font-weight: bold;
      font-size: 14pt;
    }
    
    .info-section {
      display: table;
      width: 100%;
      margin-bottom: 1.5cm;
      font-size: 10pt;
    }
    
    .info-left {
      display: table-cell;
      width: 50%;
      vertical-align: top;
      padding-right: 1cm;
    }
    
    .info-right {
      display: table-cell;
      width: 50%;
      vertical-align: top;
      text-align: left;
    }
    
    .info-label {
      font-weight: bold;
      display: inline;
    }
    
    h2 {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 1.2cm 0 0.3cm 0;
    }
    
    p {
      margin: 0.3cm 0;
      text-align: justify;
    }
    
    .indent {
      margin-left: 0.5cm;
    }
    
    .signatures {
      margin-top: 2cm;
    }
    
    .signatures-row {
      display: table;
      width: 100%;
      margin-top: 1cm;
    }
    
    .signature-cell {
      display: table-cell;
      width: 33%;
      vertical-align: top;
      text-align: center;
    }
    
    .annexes {
      margin-top: 1.5cm;
    }
    
    .page-number {
      position: absolute;
      bottom: 1.5cm;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 10pt;
    }
    
    ul {
      margin: 0.3cm 0;
      padding-left: 1cm;
    }
    
    li {
      margin: 0.2cm 0;
    }
    
    @media print {
      .page {
        margin: 0;
        page-break-after: always;
      }
      body {
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-logo">
        ${logoClient}
      </div>
      <div class="header-title">ACTE D'ENGAGEMENT</div>
    </div>
    
    <div class="info-section">
      <div class="info-left">
        <p><span class="info-label">Maître d'ouvrage :</span></p>
        <p><strong>${client?.nom || ''}</strong><br/>
        ${client?.adresse_1 || ''}<br/>
        ${client?.code_postal || ''} ${client?.ville || ''}</p>
      </div>
      <div class="info-right">
        <p><span class="info-label">Entreprise :</span> ${entreprise?.nom || ''}<br/>
        <span class="info-label">Siret :</span> ${entreprise?.siret || ''}<br/>
        <span class="info-label">Lot :</span> ${marche.numero_lot || ''} – ${marche.intitule_lot}</p>
        <p><span class="info-label">Montant :</span> ${montantHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT<br/>
        <span class="info-label">Valeur :</span> ferme et non révisable</p>
      </div>
    </div>

    <h2>ARTICLE I – PARTIES CONTRACTANTES</h2>
    <p>Il est passé un marché de travaux pour ${chantier?.nom || 'le projet'} – ${chantier?.adresse || ''}</p>
    
    <p>Dans les articles ci-après, entre</p>
    
    <p>D'une part de :</p>
    <p class="indent">. <strong>${client?.nom || ''}</strong> – ${client?.adresse_1 || ''} ${client?.code_postal || ''} ${client?.ville || ''}, (${client?.siret ? 'SIRET ' + client.siret : ''}), désignée dans les documents du marché sous la dénomination : « le Maître de l'Ouvrage ».</p>
    
    <p>D'autre part</p>
    <p class="indent">. L'entreprise <strong>${entreprise?.nom || ''}</strong> – ${entreprise?.adresse_1 || ''} ${entreprise?.code_postal || ''} ${entreprise?.ville || ''}, représentée par ${entreprise?.representant_civilite || ''} ${entreprise?.representant_nom || ''} ${entreprise?.representant_prenom || ''} en qualité de ${entreprise?.representant_qualite || ''}, et désignée dans les documents du marché sous la dénomination : « L'entreprise ».</p>

    <h2>ARTICLE II – OBJET DU MARCHÉ</h2>
    <p>Le présent marché a pour objet l'exécution du lot n° ${marche.numero_lot || ''} – ${marche.intitule_lot}.</p>
    <p>L'entreprise s'engage à réaliser les travaux dont la consistance est définie dans les documents contractuels.</p>
    <p>Les pièces constitutives du marché qui définissent l'ensemble des obligations de l'Entreprise sont énumérées à l'article 2 du CCAP.</p>

    <h2>ARTICLE III – COMMENCEMENT DES TRAVAUX ET DÉLAI DE RÉALISATION</h2>
    <p>Le présent Acte d'Engagement vaut Ordre de service n°1.</p>
    <p>Le délai d'exécution des travaux compris intempéries décrites au CCAP et périodes de congés payés, est fixé par le planning contractuel${chantier?.date_debut && chantier?.date_fin_prevue ? ', soit pour :' : '.'}</p>
    ${chantier?.date_debut && chantier?.date_fin_prevue ? `
    <p class="indent">- un début le : ${format(new Date(chantier.date_debut), "dd MMMM yyyy", { locale: fr })}<br/>
    - une fin le : ${format(new Date(chantier.date_fin_prevue), "dd MMMM yyyy", { locale: fr })}</p>
    ` : ''}

    <h2>ARTICLE IV – PÉNALITÉS DE RETARD DANS L'EXÉCUTION</h2>
    <p>Conformément à l'article 9.5 du CCAP</p>

    <div class="page-number">Page 1 sur 2</div>
  </div>

  <div class="page">
    <div class="header">
      <div class="header-logo">
        ${logoClient}
      </div>
      <div class="header-title">ACTE D'ENGAGEMENT</div>
    </div>

    <h2>ARTICLE V – PRIX DU MARCHÉ</h2>
    <p>L'entrepreneur, après avoir pris connaissance de toutes les pièces contractuelles, s'engage envers le Maître de l'Ouvrage à exécuter les travaux moyennant un prix global et forfaitaire de :</p>
    
    <p class="indent">- Montant hors TVA : ${montantHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €<br/>
    - TVA au taux de ${tauxTVA}% = ${montantTVA.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €<br/>
    - Montant TTC = ${montantTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>

    <h2>ARTICLE VI – MODALITÉS DE RÈGLEMENT DE TRAVAUX</h2>
    <p>Le maître de l'ouvrage s'engage à effectuer les paiements conformément aux prescriptions du CCAP sur présentation de l'état d'avancement à 45 jours fin de mois.</p>
    <p>Le prix est ferme et non révisable</p>

    <h2>ARTICLE VII – RETENUE DE GARANTIE</h2>
    <p>Conformément à l'article 20.5 du CCAP</p>

    <h2>ARTICLE VIII – CLAUSES ADMINISTRATIVES ET DIVERSES COMPLÉMENTAIRES OU MODIFICATIVES</h2>
    <p>Les prestations faisant l'objet de la présente commande sont celles :</p>
    <ul style="list-style-type: none; padding-left: 1cm;">
      <li>- du Cahier des Charges Techniques Particulières « marchés signés »</li>
      <li>- les plans techniques</li>
      <li>- les plans contractuels « Architecte »</li>
    </ul>

    <div class="signatures">
      <p>Fait en 3 exemplaires</p>
      <p>A ${client?.ville || 'NANTES'}, le ${dateFormatee} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; A &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; le</p>
      
      <div class="signatures-row">
        <div class="signature-cell">
          <p>Signature et mention manuscrite<br/>« Lu et Approuvé »</p>
          <p style="margin-top: 3cm;"><strong>L'entreprise</strong></p>
        </div>
        <div class="signature-cell">
          <p>Signature et mention manuscrite<br/>« Bon pour valoir Marché »</p>
          <p style="margin-top: 3cm;"><strong>Le Maître de l'Ouvrage</strong></p>
        </div>
        <div class="signature-cell">
          <p>Vu le Maître d'œuvre</p>
          <p>Le</p>
        </div>
      </div>
    </div>

    <div class="annexes">
      <p><strong>Annexés à la présente :</strong></p>
      <ul style="list-style-type: none; padding-left: 1cm;">
        <li>- DPGF de l'entreprise</li>
        <li>- attestation d'assurance de l'entreprise</li>
      </ul>
    </div>

    <div class="page-number">Page 2 sur 2</div>
  </div>
</body>
</html>`;

      // Télécharger le HTML
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `acte_engagement_${marche.numero_lot || marche.intitule_lot.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setShowGenerateDialog(false);
      setSelectedMarcheForGenerate("");
      
      toast.success("Fichier HTML téléchargé", {
        description: "Ouvrez le fichier et utilisez Ctrl+P pour créer le PDF",
        duration: 6000,
        id: "marche-generation",
      });

    } catch (error) {
      console.error("Erreur lors de la génération:", error);
      toast.error("Erreur", {
        description: error.message || "Une erreur est survenue",
      });
    } finally {
      setGenerating(false);
    }
  };
  // ⚠️ FIN GÉNÉRATION ACTE D'ENGAGEMENT FIGÉE v2.8.3
  // =======================================================================

  const handleExport = async (exportFormat) => {
    if (!canExportMarches) {
      toast.error("Permission refusée");
      return;
    }

    if (!chantier || marches.length === 0) {
      toast.error("Erreur", {
        description: "Aucun marché à exporter",
      });
      return;
    }

    setExporting(true);

    try {
      const partenairesList = chantier.partenaires || [];
      const partenairesData = partenairesList
        .map(p => {
          const partenaire = partenaires.find(part => part.id === p.partenaire_id);
          if (!partenaire) return null;
          return {
            nom: partenaire.nom,
            role: (p.role || '').toLowerCase()
          };
        })
        .filter(p => p !== null);
      
      const architecte = partenairesData.find(p => p.role.includes('architecte'));
      const autresPartenaires = partenairesData.filter(p => !p.role.includes('architecte'));
      
      const partenairesOrdonnes = [];
      if (architecte) {
        partenairesOrdonnes.push(architecte.nom);
      }
      partenairesOrdonnes.push(infoGestionbat?.nom_entreprise || 'GESTIONBAT');
      autresPartenaires.forEach(p => partenairesOrdonnes.push(p.nom));
      
      const partenairesString = partenairesOrdonnes.join(" / ");

      const dateFormatee = format(new Date(), "dd/MM/yyyy", { locale: fr });

      const tableauMarches = marches.map((marche, index) => {
        const entreprise = entreprises.find(e => e.id === marche.entreprise_id);
        const tauxTVA = marche.taux_tva || 20;
        const montantHT = marche.montant || 0;
        const montantTTC = montantHT + (montantHT * tauxTVA / 100);
        
        return {
          numero: index + 1,
          numero_lot: marche.numero_lot || "-",
          intitule_lot: marche.intitule_lot || "",
          entreprise: entreprise ? entreprise.nom : "Non spécifié",
          date: marche.date ? format(new Date(marche.date), "dd/MM/yyyy", { locale: fr }) : "-",
          montantHT: montantHT,
          montantHTFormate: montantHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          tauxTVA: tauxTVA,
          montantTTC: montantTTC,
          montantTTCFormate: montantTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          numero_marche: marche.numero_marche || "-",
          caution: marche.a_caution ? "Oui" : "Non"
        };
      });

      const totalHT = marches.reduce((sum, m) => sum + (m.montant || 0), 0);
      const totalTTC = tableauMarches.reduce((sum, m) => sum + m.montantTTC, 0);

      if (exportFormat === 'csv') {
        let csvContent = "N°;N° Lot;Intitulé;Entreprise;Date;Montant HT (€);Taux de TVA;Montant TTC (€);N° Marché;Caution\n";
        tableauMarches.forEach(m => {
          csvContent += `${m.numero};${m.numero_lot};${m.intitule_lot};${m.entreprise};${m.date};${m.montantHT.toFixed(2).replace('.', ',')};${m.tauxTVA}%;${m.montantTTC.toFixed(2).replace('.', ',')};${m.numero_marche};${m.caution}\n`;
        });
        csvContent += `\nTotal;;;;${totalHT.toFixed(2).replace('.', ',')};;${totalTTC.toFixed(2).replace('.', ',')};;;\n`;
        
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `marches_${chantier.nom.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success("Export réussi", {
          description: "Le fichier Excel a été téléchargé",
        });
      } else {
        const logoClient = chantier.logo_client_url 
          ? `<img src="${chantier.logo_client_url}" alt="Logo Client" style="max-width: 150px; max-height: 80px; object-fit: contain;" />` 
          : '<p style="font-weight: bold; color: #1e40af; font-size: 12pt;">' + (clients.find(c => c.id === chantier.client_id)?.nom || 'CLIENT') + '</p>';

        const logoGestionbat = infoGestionbat && infoGestionbat.logo_url 
          ? `<img src="${infoGestionbat.logo_url}" alt="Logo GESTIONBAT" style="max-width: 150px; max-height: 80px; object-fit: contain;" />` 
          : '<p style="font-weight: bold; color: #f97316; font-size: 12pt;">GESTIONBAT</p>';

        const lignesTableau = tableauMarches.map(m => `
          <tr>
            <td style="text-align: center;">${m.numero}</td>
            <td>${m.numero_lot}</td>
            <td>${m.intitule_lot}</td>
            <td>${m.entreprise}</td>
            <td style="text-align: center;">${m.date}</td>
            <td style="text-align: right;">${m.montantHTFormate} €</td>
            <td style="text-align: center;">${m.tauxTVA}%</td>
            <td style="text-align: right;">${m.montantTTCFormate} €</td>
            <td style="text-align: center;">${m.numero_marche}</td>
            <td style="text-align: center;">${m.caution}</td>
          </tr>
        `).join('');

        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Marchés - ${chantier.nom}</title>
  <style>
    @page { 
      size: A4 landscape;
      margin: 1.5cm 1.5cm 2.5cm 1.5cm;
    }
    body { font-family: Arial, sans-serif; font-size: 10pt; margin: 0; padding: 20px; }
    
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
      margin-bottom: 30px; 
      padding-bottom: 15px; 
      border-bottom: 3px solid #f97316; 
      min-height: 80px;
    }
    .header-left { 
      flex: 1; 
      text-align: left;
      display: flex;
      align-items: center;
      min-height: 80px;
    }
    .header-center { 
      flex: 2; 
      text-align: center; 
      padding: 0 20px; 
    }
    .header-right { 
      flex: 1; 
      text-align: right;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      min-height: 80px;
    }
    .header h1 { 
      margin: 0 0 10px 0; 
      font-size: 18pt; 
      color: #f97316; 
    }
    .header p { 
      margin: 5px 0; 
      color: #666; 
      font-size: 11pt; 
    }
    
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 20px; 
      font-size: 9pt; 
    }
    th { 
      background-color: #f97316; 
      color: white; 
      padding: 10px 8px; 
      text-align: left; 
      font-weight: bold; 
      border: 1px solid #e86710; 
    }
    td { 
      padding: 8px; 
      border: 1px solid #ddd; 
    }
    tr:nth-child(even) { 
      background-color: #f9f9f9; 
    }
    tr:hover { 
      background-color: #fff3e0; 
    }
    .total-row { 
      font-weight: bold; 
      background-color: #fff3e0 !important; 
      border-top: 2px solid #f97316; 
    }
    .total-row td { 
      padding: 12px 8px; 
      font-size: 10pt; 
    }
    
    .footer { 
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 1.5cm;
      font-size: 9pt;
      color: #666;
      border-top: 1px solid #ddd;
      background: white;
    }
    .footer-left { 
      flex: 1; 
      text-align: left;
      font-size: 8pt;
    }
    .footer-center { 
      flex: 1; 
      text-align: center;
      font-weight: bold;
    }
    .footer-right { 
      flex: 1; 
      text-align: right;
    }
    
    @media print {
      .footer {
        position: fixed;
        bottom: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">${logoClient}</div>
    <div class="header-center">
      <h1>${chantier.nom}</h1>
      <p>${chantier.description || ''}</p>
    </div>
    <div class="header-right">${logoGestionbat}</div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th style="width: 5%;">N°</th>
        <th style="width: 8%;">N° Lot</th>
        <th style="width: 20%;">Intitulé</th>
        <th style="width: 15%;">Entreprise</th>
        <th style="width: 8%;">Date</th>
        <th style="width: 12%;">Montant HT</th>
        <th style="width: 8%;">Taux TVA</th>
        <th style="width: 12%;">Montant TTC</th>
        <th style="width: 8%;">N° Marché</th>
        <th style="width: 6%;">Caution</th>
      </tr>
    </thead>
    <tbody>
      ${lignesTableau}
      <tr class="total-row">
        <td colspan="5"><strong>TOTAL</strong></td>
        <td style="text-align: right;"><strong>${totalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
        <td></td>
        <td style="text-align: right;"><strong>${totalTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
        <td colspan="2"></td>
      </tr>
    </tbody>
  </table>
  
  <div class="footer">
    <div class="footer-left">${partenairesString}</div>
    <div class="footer-center">Page 1</div>
    <div class="footer-right">${dateFormatee}</div>
  </div>
</body>
</html>`;

        toast.loading("Conversion en PDF...", {
          description: "Génération du fichier PDF en cours",
          id: "export-marches",
        });

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          const response = await base44.functions.invoke('htmlToPdf', {
            html_content: htmlContent,
            css: ''
          });

          clearTimeout(timeoutId);

          if (response.data && response.data.success && response.data.pdf_base64) {
            const byteCharacters = atob(response.data.pdf_base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `marches_${chantier.nom.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success("PDF généré", {
              description: "Téléchargement réussi",
              id: "export-marches",
            });
          } else {
            throw new Error(response.data?.error || "La conversion PDF a échoué");
          }
        } catch (conversionError) {
          console.error("Erreur conversion PDF, fallback sur HTML:", conversionError);
          
          const htmlAvecInstructions = htmlContent.replace(
            '</body>',
            `
            <div style="position: fixed; top: 10px; left: 10px; right: 10px; background: #fff3cd; border: 2px solid #ffc107; padding: 15px; border-radius: 5px; z-index: 9999;">
              <h3 style="margin: 0 0 10px 0; color: #856404;">⚠️ Instructions pour générer le PDF</h3>
              <ol style="margin: 0; padding-left: 20px; color: #856404;">
                <li>Ouvrez ce fichier dans votre navigateur</li>
                <li>Appuyez sur <strong>Ctrl + P</strong> (Windows) ou <strong>Cmd + P</strong> (Mac)</li>
                <li>Sélectionnez <strong>"Enregistrer au format PDF"</strong></li>
                <li>Choisissez <strong>Paysage</strong> comme orientation</li>
                <li>Cliquez sur <strong>Enregistrer</strong></li>
              </ol>
            </div>
            </body>`
          );
          
          const blob = new Blob([htmlAvecInstructions], { type: 'text/html;charset=utf-8' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.href = url;
          link.download = `marches_${chantier.nom.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.html`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          toast.warning("Fichier HTML téléchargé", {
            description: "Utilisez Ctrl+P pour créer le PDF",
            id: "export-marches",
          });
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      toast.error("Erreur lors de l'export", {
        description: error.message || "Une erreur est survenue",
      });
    } finally {
      setExporting(false);
    }
  };

  if (!canViewMarches) {
    return (
      <Card className="p-12 text-center">
        <Lock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Accès restreint
        </h3>
        <p className="text-gray-500">
          Vous n'avez pas la permission de consulter les marchés. Contactez un administrateur.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Marchés Entreprises</h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredMarches.length} marché{filteredMarches.length > 1 ? 's' : ''} trouvé{filteredMarches.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canExportMarches && (
            <>
              <Button 
                variant="outline"
                className="gap-2"
                onClick={() => handleExport('pdf')}
                disabled={exporting || marches.length === 0}
              >
                <Download className="w-4 h-4" />
                Exporter PDF
              </Button>
              <Button 
                variant="outline"
                className="gap-2"
                onClick={() => handleExport('csv')}
                disabled={exporting || marches.length === 0}
              >
                <Download className="w-4 h-4" />
                Exporter Excel
              </Button>
            </>
          )}
          {canCreateMarches && (
            <Button 
              className="bg-orange-600 hover:bg-orange-700 gap-2"
              onClick={() => {
                setSelectedMarche(null);
                setShowDialog(true);
              }}
            >
              <Plus className="w-5 h-5" />
              Nouveau marché
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <SearchBar 
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher par n° lot, intitulé, entreprise..."
        />
        <AdvancedFilters
          filters={advancedFilters}
          onFiltersChange={setAdvancedFilters}
          filterConfig={filterConfig}
        />
      </div>

      <MarchesList 
        marches={filteredMarches}
        chantiers={[chantier]}
        entreprises={entreprises}
        onEdit={canEditMarches ? (marche) => {
          setSelectedMarche(marche);
          setShowDialog(true);
        } : undefined}
      />

      {canExportMarches && marches.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button 
            variant="outline"
            className="gap-2 border-orange-600 text-orange-600 hover:bg-orange-50"
            onClick={() => setShowGenerateDialog(true)}
          >
            <FileText className="w-5 h-5" />
            Générer un acte d'engagement
          </Button>
        </div>
      )}

      {canCreateMarches && (
        <MarcheDialog 
          open={showDialog}
          onOpenChange={setShowDialog}
          marche={selectedMarche}
          chantiers={[{ id: chantierId }]}
          entreprises={entreprises}
          clients={clients}
          partenaires={partenaires}
          membresEquipe={membresEquipe}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {canExportMarches && (
        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Générer un acte d'engagement</DialogTitle>
              <DialogDescription>
                Sélectionnez le marché pour générer un acte d'engagement
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {chantier?.trame_marches_url ? (
                <Alert className="bg-green-50 border-green-200">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    ✅ Une trame Excel personnalisée est configurée pour ce chantier. Le document sera généré automatiquement avec vos données.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Aucune trame personnalisée. Un fichier HTML standard sera généré (utilisez Ctrl+P pour créer le PDF).
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="marche-select">Sélectionner le marché *</Label>
                <Select
                  value={selectedMarcheForGenerate}
                  onValueChange={setSelectedMarcheForGenerate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un marché" />
                  </SelectTrigger>
                  <SelectContent>
                    {marches.map(marche => {
                      const entreprise = entreprises.find(e => e.id === marche.entreprise_id);
                      return (
                        <SelectItem key={marche.id} value={marche.id}>
                          {marche.numero_lot ? `${marche.numero_lot} - ` : ''}{marche.intitule_lot} - {entreprise?.nom || 'Entreprise'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowGenerateDialog(false);
                  setSelectedMarcheForGenerate("");
                }}
                disabled={generating}
              >
                Annuler
              </Button>
              <Button 
                type="button" 
                className="bg-orange-600 hover:bg-orange-700"
                onClick={handleGenerateMarche}
                disabled={generating || !selectedMarcheForGenerate}
              >
                {generating ? "Génération..." : "Générer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
