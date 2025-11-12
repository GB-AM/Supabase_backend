
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Download, FileText, Pencil, Trash2, Upload, X, FileDown, Building, FolderOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MOIS_LABELS = {
  "01": "Janvier", "02": "Février", "03": "Mars", "04": "Avril",
  "05": "Mai", "06": "Juin", "07": "Juillet", "08": "Août",
  "09": "Septembre", "10": "Octobre", "11": "Novembre", "12": "Décembre"
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - 5 + i);

export default function CertificatsTab({ chantierId }) {
  // ⚠️ COMPOSANT FIGÉ v2.8.5 - Export PDF avec template CISN ou standard
  // - Deux templates : Template CISN (format détaillé) ou Template Standard
  // - Sélection automatique selon le client ou choix manuel
  // - Header : Logo CLIENT à gauche, Logo GESTIONBAT à droite (standard)
  // - Footer : Architecte / GESTIONBAT / Autres partenaires (standard)
  // ========================================================================

  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCertificat, setSelectedCertificat] = useState(null);
  const [certificatToDelete, setCertificatToDelete] = useState(null);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState("by-entreprise");
  const [useFormatCisn, setUseFormatCisn] = useState(false);

  const [formData, setFormData] = useState({
    mois: "",
    annee: CURRENT_YEAR.toString(),
    entreprise_id: "",
    date_situation: "",
    montant_ht: "",
    facture_pdf_url: "",
    statut: "brouillon",
    notes: "",
    paiements_sous_traitants: [],
    penalites_appliquees: []
  });

  const queryClient = useQueryClient();

  const { data: certificats, isLoading } = useQuery({
    queryKey: ['certificats', chantierId],
    queryFn: async () => {
      const allCertificats = await base44.entities.CertificatPaiement.list('-numero');
      return allCertificats.filter(c => c.chantier_id === chantierId);
    },
    initialData: [],
  });

  const { data: chantier } = useQuery({
    queryKey: ['chantier', chantierId],
    queryFn: async () => {
      const chantiers = await base44.entities.Chantier.list();
      return chantiers.find(c => c.id === chantierId);
    },
    enabled: !!chantierId,
  });

  const { data: marches } = useQuery({
    queryKey: ['marches', chantierId],
    queryFn: async () => {
      const allMarches = await base44.entities.MarcheEntreprise.list();
      return allMarches.filter(m => m.chantier_id === chantierId);
    },
    initialData: [],
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

  const { data: infoGestionbat } = useQuery({
    queryKey: ['info-gestionbat'],
    queryFn: async () => {
      const infos = await base44.entities.InfoGestionbat.list();
      return infos.length > 0 ? infos[0] : null;
    },
  });

  const { data: partenaires } = useQuery({
    queryKey: ['partenaires'],
    queryFn: () => base44.entities.Partenaire.list(),
    initialData: [],
  });

  const { data: sousTraitances } = useQuery({
    queryKey: ['sous-traitance', chantierId],
    queryFn: async () => {
      const allSousTraitances = await base44.entities.SousTraitance.list();
      return allSousTraitances.filter(s => s.chantier_id === chantierId);
    },
    initialData: [],
    enabled: !!chantierId,
  });

  const entreprisesSousTraitantesIds = useMemo(() => {
    return [...new Set(sousTraitances.map(st => st.entreprise_sous_traitant_id))];
  }, [sousTraitances]);

  const entreprisesSousTraitantes = useMemo(() => {
    return entreprises.filter(e => entreprisesSousTraitantesIds.includes(e.id));
  }, [entreprises, entreprisesSousTraitantesIds]);

  const entreprisesAvecMarche = useMemo(() => {
    const entrepriseIds = [...new Set(marches.map(m => m.entreprise_id))];
    return entreprises.filter(e => entrepriseIds.includes(e.id));
  }, [marches, entreprises]);

  const certificatsParEntreprise = useMemo(() => {
    const grouped = {};
    
    certificats.forEach(cert => {
      if (!grouped[cert.entreprise_id]) {
        const entreprise = entreprises.find(e => e.id === cert.entreprise_id);
        grouped[cert.entreprise_id] = {
          entreprise: entreprise,
          certificats: [],
          montantTotal: 0,
          montantValide: 0
        };
      }
      
      grouped[cert.entreprise_id].certificats.push(cert);
      grouped[cert.entreprise_id].montantTotal += cert.montant_ht || 0;
      
      if (cert.statut === 'valide') {
        grouped[cert.entreprise_id].montantValide += cert.montant_ht || 0;
      }
    });

    return Object.values(grouped).sort((a, b) => 
      (a.entreprise?.nom || '').localeCompare(b.entreprise?.nom || '')
    );
  }, [certificats, entreprises]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const certificatsPourEntreprise = certificats.filter(c => c.entreprise_id === data.entreprise_id);
      const nextNumero = (certificatsPourEntreprise.length + 1).toString().padStart(2, '0');
      
      return base44.entities.CertificatPaiement.create({
        ...data,
        chantier_id: chantierId,
        numero: nextNumero
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificats'] });
      setShowDialog(false);
      resetForm();
      toast.success("Certificat créé", {
        description: "Le certificat de paiement a été créé avec succès",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CertificatPaiement.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificats'] });
      setShowDialog(false);
      resetForm();
      toast.success("Situation mise à jour", {
        description: "La situation a été mise à jour avec succès",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CertificatPaiement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificats'] });
      toast.success("Situation supprimée", {
        description: "La situation a été supprimée avec succès",
      });
    },
  });

  const validateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CertificatPaiement.update(id, { ...data, statut: "valide" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificats'] });
      toast.success("Situation validée", {
        description: "La situation a été validée",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      mois: "",
      annee: CURRENT_YEAR.toString(),
      entreprise_id: "",
      date_situation: "",
      montant_ht: "",
      facture_pdf_url: "",
      statut: "brouillon",
      notes: "",
      paiements_sous_traitants: [],
      penalites_appliquees: []
    });
    setSelectedCertificat(null);
  };

  const handleEdit = (cert) => {
    setSelectedCertificat(cert);
    setFormData({
      mois: cert.mois || "",
      annee: cert.annee || CURRENT_YEAR.toString(),
      entreprise_id: cert.entreprise_id || "",
      date_situation: cert.date_situation || "",
      montant_ht: cert.montant_ht ? cert.montant_ht.toString() : "",
      facture_pdf_url: cert.facture_pdf_url || "",
      statut: cert.statut || "brouillon",
      notes: cert.notes || "",
      paiements_sous_traitants: cert.paiements_sous_traitants || [],
      penalites_appliquees: cert.penalites_appliquees || []
    });
    setShowDialog(true);
  };

  const handleDelete = (cert) => {
    setCertificatToDelete(cert);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (certificatToDelete) {
      deleteMutation.mutate(certificatToDelete.id);
      setShowDeleteDialog(false);
      setCertificatToDelete(null);
    }
  };

  const handleValidate = (cert) => {
    validateMutation.mutate({ id: cert.id, data: cert });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSubmit = {
      ...formData,
      montant_ht: parseFloat(formData.montant_ht) || 0,
      paiements_sous_traitants: formData.paiements_sous_traitants.map(p => ({
        entreprise_id: p.entreprise_id,
        montant_ht: parseFloat(p.montant_ht) || 0
      })),
      penalites_appliquees: formData.penalites_appliquees.map(p => ({
        type_penalite: p.type_penalite,
        base: p.base,
        valeur: parseFloat(p.valeur) || 0,
        nombre: parseFloat(p.nombre) || 0,
        valeur_minimum: parseFloat(p.valeur_minimum) || 0,
        utiliser_valeur_minimum: p.utiliser_valeur_minimum || false,
        montant_calcule: parseFloat(p.montant_calcule) || 0
      }))
    };

    if (selectedCertificat) {
      updateMutation.mutate({ id: selectedCertificat.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const handlePDFUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPDF(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, facture_pdf_url: file_url });
      toast.success("Fichier téléchargé", {
        description: "La facture a été téléchargée avec succès",
      });
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
      toast.error("Erreur", {
        description: "Erreur lors du téléchargement du fichier",
      });
    } finally {
      setUploadingPDF(false);
    }
  };

  const getEntrepriseName = (entrepriseId) => {
    const entreprise = entreprises.find(e => e.id === entrepriseId);
    return entreprise?.nom || "Non spécifié";
  };

  const getFileName = (url) => {
    if (!url) return "";
    return url.split('/').pop().split('?')[0];
  };

  const handleAddSousTraitant = () => {
    if (formData.paiements_sous_traitants.length < 10) {
      setFormData({
        ...formData,
        paiements_sous_traitants: [
          ...formData.paiements_sous_traitants,
          { entreprise_id: "", montant_ht: "" }
        ]
      });
    }
  };

  const handleRemoveSousTraitant = (index) => {
    const newPaiements = formData.paiements_sous_traitants.filter((_, i) => i !== index);
    setFormData({ ...formData, paiements_sous_traitants: newPaiements });
  };

  const handleUpdateSousTraitant = (index, field, value) => {
    const newPaiements = [...formData.paiements_sous_traitants];
    newPaiements[index] = { ...newPaiements[index], [field]: value };
    setFormData({ ...formData, paiements_sous_traitants: newPaiements });
  };

  const handleAddPenalite = () => {
    if (chantier?.penalites && chantier.penalites.length > 0) {
      const premierePenalite = chantier.penalites[0];
      setFormData({
        ...formData,
        penalites_appliquees: [
          ...formData.penalites_appliquees,
          {
            type_penalite: premierePenalite.type_penalite,
            base: premierePenalite.base,
            valeur: premierePenalite.valeur,
            nombre: "0",
            valeur_minimum: premierePenalite.valeur_minimum,
            utiliser_valeur_minimum: false,
            montant_calcule: 0
          }
        ]
      });
    } else {
      toast.error("Pénalités non définies", {
        description: "Veuillez définir des pénalités dans les paramètres du chantier d'abord.",
      });
    }
  };

  const handleRemovePenalite = (index) => {
    const newPenalites = formData.penalites_appliquees.filter((_, i) => i !== index);
    setFormData({ ...formData, penalites_appliquees: newPenalites });
  };

  const handleUpdatePenalite = (index, field, value) => {
    const newPenalites = [...formData.penalites_appliquees];
    newPenalites[index] = { ...newPenalites[index], [field]: value };

    if (field === 'nombre' || field === 'utiliser_valeur_minimum' || field === 'type_penalite') {
      if (field === 'type_penalite') {
        const penaliteChantier = chantier?.penalites?.find(p => p.type_penalite === value);
        if (penaliteChantier) {
          newPenalites[index] = {
            ...newPenalites[index],
            type_penalite: penaliteChantier.type_penalite,
            base: penaliteChantier.base,
            valeur: penaliteChantier.valeur,
            valeur_minimum: penaliteChantier.valeur_minimum,
          };
        }
      }
      
      const penalite = newPenalites[index];
      const nombre = parseFloat(penalite.nombre) || 0;
      const valeur = parseFloat(penalite.valeur) || 0;
      const valeurMinimum = parseFloat(penalite.valeur_minimum) || 0;
      const utiliserMinimum = penalite.utiliser_valeur_minimum;
      
      let montantCalcule = nombre * valeur;
      
      if (utiliserMinimum && montantCalcule < valeurMinimum) {
        montantCalcule = valeurMinimum;
      }
      
      newPenalites[index].montant_calcule = montantCalcule;
    }

    setFormData({ ...formData, penalites_appliquees: newPenalites });
  };

  const montantTotalPenalites = useMemo(() => {
    return formData.penalites_appliquees.reduce((sum, p) => sum + (parseFloat(p.montant_calcule) || 0), 0);
  }, [formData.penalites_appliquees]);

  // ⚠️ GÉNÉRATION PDF CERTIFICAT FIGÉE v2.8.5
  // Choix entre template CISN (détaillé) ou template standard
  // ===================================================================================
  const handleExportCP = async (cert) => {
    setExporting(true);
    
    // Déterminer si on utilise le format CISN
    const client = clients.find(c => c.id === chantier?.client_id);
    const useCisnFormat = useFormatCisn || client?.nom?.toUpperCase().includes('CISN');

    try {
      const entreprise = entreprises.find(e => e.id === cert.entreprise_id);
      const marche = marches.find(m => m.entreprise_id === cert.entreprise_id);
      
      const tauxTVA = marche?.taux_tva || chantier?.taux_tva?.[0] || 20;
      const montantTVA = cert.montant_ht * (tauxTVA / 100);
      const montantTTC = cert.montant_ht + montantTVA;

      const certTotalPenalties = cert.penalites_appliquees?.reduce((sum, p) => sum + (parseFloat(p.montant_calcule) || 0), 0) || 0;

      const situationsPrecedentes = certificats
        .filter(c => 
          c.entreprise_id === cert.entreprise_id && 
          c.statut === 'valide' &&
          (parseInt(c.annee) < parseInt(cert.annee) || 
           (parseInt(c.annee) === parseInt(cert.annee) && parseInt(c.mois) < parseInt(cert.mois)))
        );
      
      const montantCumulePrecedentHT = situationsPrecedentes.reduce((sum, c) => sum + (c.montant_ht || 0), 0);
      const montantCumuleTotalHT = montantCumulePrecedentHT + cert.montant_ht;
      // montantCumulePrecedentTTC variable was declared but not used for standard template, removed for clean up
      // const montantCumulePrecedentTTC = situationsPrecedentes.reduce((sum, c) => {
      //   const tva = (c.montant_ht || 0) * (tauxTVA / 100);
      //   return sum + (c.montant_ht || 0) + tva;
      // }, 0);
      const montantCumuleTotalTTC = montantCumuleTotalHT * (1 + tauxTVA / 100);

      const avenants = await base44.entities.Avenant.list();
      const avenantsDeLEntreprise = avenants.filter(a => a.chantier_id === chantierId && a.entreprise_id === cert.entreprise_id && (a.statut === 'valide' || a.statut === 'signe'));
      const montantMarcheBase = marche?.montant || 0;
      const montantMarcheBaseTTC = montantMarcheBase * (1 + tauxTVA / 100);
      const montantTotalAvenantsHT = avenantsDeLEntreprise.reduce((sum, av) => sum + (av.montant_total_ht || 0), 0);
      const montantTotalAvenantsTTC = montantTotalAvenantsHT * (1 + tauxTVA / 100);
      const nouveauMontantMarcheHT = montantMarcheBase + montantTotalAvenantsHT;
      const nouveauMontantMarcheTTC = nouveauMontantMarcheHT * (1 + tauxTVA / 100);

      const pourcentageAvancement = nouveauMontantMarcheHT > 0 ? ((montantCumuleTotalHT / nouveauMontantMarcheHT) * 100).toFixed(2) : 0;
      
      const resteAPayerHT = nouveauMontantMarcheHT - montantCumuleTotalHT;
      const resteAPayerTTC = nouveauMontantMarcheTTC - montantCumuleTotalTTC;

      let retentionGarantie = 0;
      if (marche?.a_caution && marche?.cautions && marche.cautions.length > 0) {
        retentionGarantie = 0;
      } else {
        retentionGarantie = nouveauMontantMarcheHT * 0.05;
      }

      const montantCIE = 0;
      const totalDeductions = retentionGarantie + certTotalPenalties + montantCIE;
      const netAPayer = montantTTC - totalDeductions;

      const paiementsST = cert.paiements_sous_traitants || [];
      const totalSousTraitants = paiementsST.reduce((sum, p) => sum + (parseFloat(p.montant_ht) || 0), 0);
      const totalSousTraitantsTTC = totalSousTraitants * (1 + tauxTVA / 100);
      const netAPayerEntreprise = netAPayer - totalSousTraitantsTTC;

      // ✅ PRIORITÉ 1 : Si trame Excel existe, l'utiliser
      if (chantier?.trame_certificats_url) {
        try {
          toast.loading("Génération en cours...", {
            description: "Remplissage automatique de la trame de certificat",
            id: "certificat-generation",
          });

          const dateFormatee = format(new Date(), "dd/MM/yyyy", { locale: fr });
          
          const data = {
            "{{NUMERO_CP}}": cert.numero,
            "{{MOIS}}": MOIS_LABELS[cert.mois],
            "{{ANNEE}}": cert.annee,
            "{{DATE_SITUATION}}": format(new Date(cert.date_situation), "dd/MM/yyyy", { locale: fr }),
            "{{DATE_GENERATION}}": dateFormatee,
            "{{CHANTIER_NOM}}": chantier?.nom || '',
            "{{CHANTIER_ADRESSE}}": chantier?.adresse || '',
            "{{CHANTIER_DATE_DEBUT}}": chantier?.date_debut ? format(new Date(chantier.date_debut), "dd MMMM yyyy", { locale: fr }) : '',
            "{{CHANTIER_DATE_FIN}}": chantier?.date_fin_prevue ? format(new Date(chantier.date_fin_prevue), "dd MMMM yyyy", { locale: fr }) : '',
            "{{CLIENT_NOM}}": client?.nom || '',
            "{{CLIENT_ADRESSE_1}}": client?.adresse_1 || '',
            "{{CLIENT_CODE_POSTAL}}": client?.code_postal || '',
            "{{CLIENT_VILLE}}": client?.ville || '',
            "{{CLIENT_SIRET}}": client?.siret || '',
            "{{ENTREPRISE_NOM}}": entreprise?.nom || '',
            "{{ENTREPRISE_ADRESSE_1}}": entreprise?.adresse_1 || '',
            "{{ENTREPRISE_CODE_POSTAL}}": entreprise?.code_postal || '',
            "{{ENTREPRISE_VILLE}}": entreprise?.ville || '',
            "{{ENTREPRISE_SIRET}}": entreprise?.siret || '',
            "{{NUMERO_LOT}}": marche?.numero_lot || '',
            "{{INTITULE_LOT}}": marche?.intitule_lot || '',
            "{{MONTANT_MARCHE_BASE_HT}}": montantMarcheBase.toFixed(2).replace('.', ','),
            "{{MONTANT_MARCHE_BASE_TTC}}": montantMarcheBaseTTC.toFixed(2).replace('.', ','),
            "{{NOUVEAU_MONTANT_MARCHE_HT}}": nouveauMontantMarcheHT.toFixed(2).replace('.', ','),
            "{{NOUVEAU_MONTANT_MARCHE_TTC}}": nouveauMontantMarcheTTC.toFixed(2).replace('.', ','),
            "{{MARCHE_CAUTIONNE}}": marche?.a_caution ? "Oui" : "Non",
            "{{CAUTION_REFERENCE}}": marche?.cautions?.[0]?.reference || '',
            "{{CAUTION_MONTANT}}": marche?.cautions?.[0]?.montant?.toFixed(2).replace('.', ',') || '0,00',
            "{{MONTANT_SITUATION_HT}}": cert.montant_ht.toFixed(2).replace('.', ','),
            "{{MONTANT_TVA}}": montantTVA.toFixed(2).replace('.', ','),
            "{{TAUX_TVA}}": tauxTVA.toString(),
            "{{MONTANT_SITUATION_TTC}}": montantTTC.toFixed(2).replace('.', ','),
            "{{RETENUE_GARANTIE}}": retentionGarantie.toFixed(2).replace('.', ','),
            "{{MONTANT_PENALITES}}": certTotalPenalties.toFixed(2).replace('.', ','),
            "{{MONTANT_CIE}}": montantCIE.toFixed(2).replace('.', ','),
            "{{TOTAL_DEDUCTIONS}}": totalDeductions.toFixed(2).replace('.', ','),
            "{{NET_A_PAYER}}": netAPayer.toFixed(2).replace('.', ','),
            "{{NET_A_PAYER_ENTREPRISE}}": netAPayerEntreprise.toFixed(2).replace('.', ','),
            "{{MONTANT_CUMULE_HT}}": montantCumuleTotalHT.toFixed(2).replace('.', ','),
            "{{MONTANT_CUMULE_TTC}}": montantCumuleTotalTTC.toFixed(2).replace('.', ','),
            "{{POURCENTAGE_AVANCEMENT}}": pourcentageAvancement,
            "{{RESTE_A_PAYER_HT}}": resteAPayerHT.toFixed(2).replace('.', ','),
            "{{RESTE_A_PAYER_TTC}}": resteAPayerTTC.toFixed(2).replace('.', ','),
            "{{GESTIONBAT_NOM}}": infoGestionbat?.nom_entreprise || 'GESTIONBAT',
            "{{GESTIONBAT_ADRESSE}}": infoGestionbat?.adresse || '',
            "{{GESTIONBAT_CODE_POSTAL}}": infoGestionbat?.code_postal || '',
            "{{GESTIONBAT_VILLE}}": infoGestionbat?.ville || '',
            "{{GESTIONBAT_TELEPHONE}}": infoGestionbat?.telephone || '',
            "{{GESTIONBAT_SIRET}}": infoGestionbat?.siret || '',
          };

          if (avenantsDeLEntreprise && avenantsDeLEntreprise.length > 0) {
            avenantsDeLEntreprise.forEach((av, index) => {
              const i = index + 1;
              data[`{{AVENANT_${i}_NUMERO}}`] = av.numero;
              data[`{{AVENANT_${i}_HT}}`] = (av.montant_total_ht || 0).toFixed(2).replace('.', ',');
              data[`{{AVENANT_${i}_TTC}}`] = ((av.montant_total_ht || 0) * (1 + tauxTVA / 100)).toFixed(2).replace('.', ',');
            });
          }

          if (paiementsST && paiementsST.length > 0) {
            paiementsST.forEach((st, index) => {
              const stEntreprise = entreprises.find(e => e.id === st.entreprise_id);
              const i = index + 1;
              data[`{{ST_${i}_NOM}}`] = stEntreprise?.nom || '';
              data[`{{ST_${i}_MONTANT_HT}}`] = (parseFloat(st.montant_ht) || 0).toFixed(2).replace('.', ',');
              data[`{{ST_${i}_MONTANT_TTC}}`] = ((parseFloat(st.montant_ht) || 0) * (1 + tauxTVA / 100)).toFixed(2).replace('.', ',');
            });
          }

          const response = await base44.functions.invoke('fillExcelTemplate', {
            template_url: chantier.trame_certificats_url,
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
            link.download = `CP_${cert.numero}_${nomChantier}_${Date.now()}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success("✅ Certificat généré automatiquement !", {
              description: "Fichier Excel téléchargé avec succès",
              duration: 6000,
              id: "certificat-generation",
            });

            setExporting(false);
            return;
          } else {
            throw new Error("La réponse de l'API ne contient pas de fichier");
          }
        } catch (apiError) {
          console.error("Erreur lors du remplissage automatique:", apiError);
          toast.error("⚠️ Échec du remplissage automatique", {
            description: `Génération du PDF ${useCisnFormat ? 'CISN' : 'standard'}...`,
            id: "certificat-generation",
          });
        }
      }

      // ✅ GÉNÉRATION HTML : Template CISN ou Standard
      let htmlContent;
      
      if (useCisnFormat) {
        // Importer et utiliser le template CISN
        const { generateCertificatCisnHtml } = await import('../templates/CertificatCisnTemplate');
        htmlContent = generateCertificatCisnHtml({
          certificat: cert,
          chantier,
          client,
          entreprise,
          marche,
          situationsPrecedentes,
          avenantsDeLEntreprise,
          paiementsSousTraitants: paiementsST,
          penalitesAppliquees: cert.penalites_appliquees || [],
          infoGestionbat,
          tauxTVA
        });
      } else {
        // Template standard avec header/footer comme les avenants
        const partenairesList = chantier?.partenaires || [];
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

        const logoClient = chantier?.logo_client_url 
          ? `<img src="${chantier.logo_client_url}" alt="Logo" style="max-width: 150px; max-height: 80px; object-fit: contain;" />` 
          : '';

        const logoGestionbat = infoGestionbat?.logo_url 
          ? `<img src="${infoGestionbat.logo_url}" alt="Logo GESTIONBAT" style="max-width: 150px; max-height: 80px; object-fit: contain;" />` 
          : '<p style="font-weight: bold; color: #f97316; font-size: 16pt;">GESTIONBAT</p>';

        const lignesSousTraitants = paiementsST.map((st, index) => {
          const stEntreprise = entreprises.find(e => e.id === st.entreprise_id);
          const montantHT = parseFloat(st.montant_ht) || 0;
          const montantTTC = montantHT * (1 + tauxTVA / 100);
          return `
            <tr>
              <td>${index + 1}</td>
              <td>${stEntreprise?.nom || 'Non spécifié'}</td>
              <td style="text-align: right;">${montantHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
              <td style="text-align: right;">${montantTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
            </tr>
          `;
        }).join('');

        htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Certificat de Paiement N° ${cert.numero}</title>
  <style>
    @page { margin: 1.2cm; size: A4; }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 8pt; 
      margin: 0; 
      padding: 10px;
      line-height: 1.3;
      color: #333;
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      margin-bottom: 15px; 
      padding-bottom: 8px; 
      border-bottom: 2px solid #f97316;
      page-break-after: avoid;
    }
    .header-left { 
      flex: 0 0 auto;
      min-width: 150px;
      max-width: 150px;
    }
    .header-center {
      flex: 1;
      text-align: center;
      padding: 0 10px;
    }
    .header-right { 
      flex: 0 0 auto; 
      min-width: 150px;
      max-width: 150px;
    }
    .header h1 { 
      margin: 0 0 4px 0; 
      font-size: 16pt; 
      color: #f97316; 
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header .numero { 
      font-size: 11pt;
      color: #666;
      font-weight: bold;
      margin: 3px 0;
    }
    .header .situation {
      font-size: 9pt;
      color: #666;
      margin: 3px 0;
    }
    .section-title {
      font-size: 9pt;
      font-weight: bold;
      color: #f97316;
      margin: 10px 0 6px 0;
      padding-bottom: 3px;
      border-bottom: 1.5px solid #f97316;
      page-break-after: avoid;
    }
    .trois-colonnes {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }
    .colonne {
      flex: 1;
      padding: 8px;
      background-color: #f9f9f9;
      border-radius: 4px;
      font-size: 7pt;
    }
    .colonne h3 {
      margin: 0 0 5px 0;
      font-size: 8pt;
      color: #f97316;
      border-bottom: 1px solid #ddd;
      padding-bottom: 3px;
    }
    .colonne p {
      margin: 3px 0;
      line-height: 1.4;
    }
    .lot-info {
      padding: 8px;
      background-color: #f9f9f9;
      border-radius: 4px;
      margin-bottom: 8px;
      font-size: 8pt;
      font-weight: bold;
      color: #000;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 8px 0;
      font-size: 7pt;
      page-break-inside: avoid;
    }
    th { 
      background-color: #f97316; 
      color: white; 
      padding: 6px 4px; 
      text-align: left; 
      font-weight: bold; 
      border: 1px solid #e86710; 
      font-size: 7pt;
    }
    td { 
      padding: 5px 4px; 
      border: 1px solid #ddd; 
      font-size: 7pt;
    }
    tr:nth-child(even) { 
      background-color: #f9f9f9; 
    }
    .total-row { 
      font-weight: bold; 
      background-color: #fff3e0 !important; 
      border-top: 2px solid #f97316;
      page-break-inside: avoid;
    }
    .total-row td { 
      padding: 8px 4px; 
      font-size: 8pt; 
    }
    .deduction-row {
      background-color: #f9f9f9 !important;
    }
    .net-row {
      background-color: #e8f5e9 !important;
      font-weight: bold;
      font-size: 8pt;
    }
    .signatures {
      margin-top: 15px;
      display: flex;
      justify-content: space-between;
      gap: 15px;
      page-break-inside: avoid;
    }
    .signature-bloc {
      flex: 1;
      text-align: center;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background-color: #fafafa;
      min-height: 150px;
    }
    .signature-bloc p {
      font-size: 7pt;
      margin: 3px 0;
    }
    .signature-bloc p strong {
      font-size: 7.5pt;
    }
    .signature-space {
      margin-top: 65px;
      border-bottom: 1px solid #333;
      margin-bottom: 5px;
    }
    .checkbox {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 1px solid #333;
      margin-right: 5px;
      vertical-align: middle;
    }
    .checkbox.checked::after {
      content: "✓";
      display: block;
      text-align: center;
      line-height: 12px;
      font-weight: bold;
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
      font-size: 8pt;
      color: #666;
      border-top: 1px solid #ddd;
      background: white;
    }
    .footer-left { 
      flex: 1; 
      text-align: left;
      font-size: 7pt;
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
      <h1>Certificat de Paiement</h1>
      <p class="numero">N° ${cert.numero}</p>
      <p class="situation">Situation ${MOIS_LABELS[cert.mois]} ${cert.annee}</p>
    </div>
    <div class="header-right">${logoGestionbat}</div>
  </div>
  
  <div class="trois-colonnes">
    <div class="colonne">
      <h3>ENTREPRISE</h3>
      <p><strong>${entreprise?.nom || ''}</strong></p>
      ${entreprise?.adresse_1 ? `<p>${entreprise.adresse_1}</p>` : ''}
      ${entreprise?.code_postal || entreprise?.ville ? `<p>${entreprise?.code_postal || ''} ${entreprise?.ville || ''}</p>` : ''}
      ${entreprise?.siret ? `<p>SIRET: ${entreprise.siret}</p>` : ''}
    </div>
    <div class="colonne">
      <h3>MOE</h3>
      <p><strong>${infoGestionbat?.nom_entreprise || 'GESTIONBAT'}</strong></p>
      ${infoGestionbat?.adresse ? `<p>${infoGestionbat.adresse}</p>` : ''}
      ${infoGestionbat?.code_postal || infoGestionbat?.ville ? `<p>${infoGestionbat?.code_postal || ''} ${infoGestionbat?.ville || ''}</p>` : ''}
      ${infoGestionbat?.telephone ? `<p>Tél: ${infoGestionbat.telephone}</p>` : ''}
    </div>
    <div class="colonne">
      <h3>MAÎTRE D'OUVRAGE</h3>
      <p><strong>${client?.nom || ''}</strong></p>
      ${client?.adresse_1 ? `<p>${client.adresse_1}</p>` : ''}
      ${client?.code_postal || client?.ville ? `<p>${client?.code_postal || ''} ${client?.ville || ''}</p>` : ''}
      ${client?.siret ? `<p>SIRET: ${client.siret}</p>` : ''}
    </div>
  </div>

  <h2 class="section-title">Informations du Lot</h2>
  ${marche?.numero_lot && marche?.intitule_lot ? `
  <div class="lot-info">
    <strong>Lot:</strong> ${marche.numero_lot} - ${marche.intitule_lot}
  </div>
  ` : ''}

  <table>
    <thead>
      <tr>
        <th style="width: 50%;">Désignation</th>
        <th style="width: 25%; text-align: right;">Montant HT</th>
        <th style="width: 25%; text-align: right;">Montant TTC</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-weight: 600;">Marché de base</td>
        <td style="text-align: right;">${montantMarcheBase.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
        <td style="text-align: right;">${montantMarcheBaseTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
      ${avenantsDeLEntreprise.map(av => `
        <tr>
          <td>Avenant N°${av.numero}</td>
          <td style="text-align: right;">${(av.montant_total_ht || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
          <td style="text-align: right;">${((av.montant_total_ht || 0) * (1 + tauxTVA / 100)).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td style="font-weight: bold;">NOUVEAU MONTANT MARCHÉ</td>
        <td style="text-align: right;"><strong>${nouveauMontantMarcheHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
        <td style="text-align: right;"><strong>${nouveauMontantMarcheTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
      </tr>
    </tbody>
  </table>

  <div style="margin: 10px 0; font-size: 7pt; display: flex; justify-content: space-between; align-items: center;">
    <div>
      <span class="checkbox ${marche?.a_caution ? 'checked' : ''}"></span> Marché cautionné : <strong>${marche?.a_caution ? 'OUI' : 'NON'}</strong>
      ${marche?.a_caution && marche?.cautions?.[0] ? `
      - Libellé: ${marche.cautions[0].reference || 'N/A'}
      ` : ''}
    </div>
    ${marche?.a_caution && marche?.cautions?.[0] ? `
    <div style="font-weight: bold;">
      Montant caution TTC: ${marche.cautions[0].montant?.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'} €
    </div>
    ` : ''}
  </div>

  ${paiementsST.length > 0 ? `
  <h3 style="font-size: 8pt; font-weight: bold; margin: 8px 0 4px 0;">Sous-traitants</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 5%;">N°</th>
        <th style="width: 55%;">Sous-traitant</th>
        <th style="width: 20%; text-align: right;">Montant HT</th>
        <th style="width: 20%; text-align: right;">Montant TTC</th>
      </tr>
    </thead>
    <tbody>
      ${lignesSousTraitants}
      <tr class="total-row">
        <td colspan="2"><strong>TOTAL SOUS-TRAITANTS</strong></td>
        <td style="text-align: right;"><strong>${totalSousTraitants.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
        <td style="text-align: right;"><strong>${totalSousTraitantsTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
      </tr>
    </tbody>
  </table>
  ` : ''}

  <h2 class="section-title">Situation en Cours</h2>
  <p style="font-size: 7pt; margin: 5px 0;"><strong>Date de situation :</strong> ${format(new Date(cert.date_situation), "dd MMMM yyyy", { locale: fr })}</p>
  <table>
    <tbody>
      <tr>
        <td style="font-weight: 600;">Montant de la situation HT</td>
        <td style="text-align: right;">${cert.montant_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
      <tr>
        <td style="font-weight: 600;">TVA (${tauxTVA}%)</td>
        <td style="text-align: right;">${montantTVA.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
      <tr class="total-row">
        <td style="font-weight: bold;">Montant TTC de la situation</td>
        <td style="text-align: right;"><strong>${montantTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
      </tr>
    </tbody>
  </table>

  <h3 style="font-size: 8pt; font-weight: bold; margin: 10px 0 4px 0;">Déductions</h3>
  <table>
    <tbody>
      ${retentionGarantie > 0 ? `
      <tr class="deduction-row">
        <td style="font-weight: 600;">Retenue de garantie (5%)</td>
        <td style="text-align: right;">- ${retentionGarantie.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
      ` : ''}
      ${certTotalPenalties > 0 ? `
      <tr class="deduction-row">
        <td style="font-weight: 600;">Pénalités</td>
        <td style="text-align: right;">- ${certTotalPenalties.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
      ` : ''}
      ${montantCIE > 0 ? `
      <tr class="deduction-row">
        <td style="font-weight: 600;">CIE</td>
        <td style="text-align: right;">- ${montantCIE.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
      ` : ''}
      ${totalDeductions > 0 ? `
      <tr class="total-row">
        <td style="font-weight: bold;">Sous-total déductions</td>
        <td style="text-align: right; font-weight: bold;">- ${totalDeductions.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
      ` : ''}
      <tr class="net-row">
        <td style="font-weight: bold; color: #2e7d32;">NET À PAYER</td>
        <td style="text-align: right; font-weight: bold; font-size: 9pt; color: #2e7d32;">${netAPayer.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
    </tbody>
  </table>

  ${paiementsST.length > 0 ? `
  <h3 style="font-size: 8pt; font-weight: bold; margin: 10px 0 4px 0;">Répartition du Net à Payer</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 70%;">Bénéficiaire</th>
        <th style="width: 30%; text-align: right;">Montant TTC</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${entreprise?.nom || ''}</strong> (Entreprise principale)</td>
        <td style="text-align: right; font-weight: 600;">${netAPayerEntreprise.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
      ${paiementsST.map((st) => {
        const stEntreprise = entreprises.find(e => e.id === st.entreprise_id);
        const montantTTC = (parseFloat(st.montant_ht) || 0) * (1 + tauxTVA / 100);
        return `
          <tr>
            <td>${stEntreprise?.nom || 'Non spécifié'} (Sous-traitant)</td>
            <td style="text-align: right; font-weight: 600;">${montantTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
          </tr>
        `;
      }).join('')}
      <tr class="total-row">
        <td style="font-weight: bold;">TOTAL NET À PAYER</td>
        <td style="text-align: right; font-weight: bold;">${netAPayer.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
    </tbody>
  </table>
  ` : ''}

  <h2 class="section-title">Récapitulatif Cumulé</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 50%;">Désignation</th>
        <th style="width: 25%; text-align: right;">Montant HT</th>
        <th style="width: 25%; text-align: right;">Montant TTC</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-weight: 600;">Montant cumulé</td>
        <td style="text-align: right;">${montantCumuleTotalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
        <td style="text-align: right;">${montantCumuleTotalTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
      <tr class="total-row">
        <td style="font-weight: bold;">Pourcentage d'avancement</td>
        <td colspan="2" style="text-align: right; font-weight: bold; color: #f97316;">${pourcentageAvancement}%</td>
      </tr>
      <tr>
        <td style="font-weight: 600; color: #1565c0;">Reste à payer</td>
        <td style="text-align: right; font-weight: bold; color: #1565c0;">${resteAPayerHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
        <td style="text-align: right; font-weight: bold; color: #1565c0;">${resteAPayerTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
    </tbody>
  </table>

  <div class="signatures">
    <div class="signature-bloc">
      <p><strong>Pour l'Entreprise</strong></p>
      <p style="margin-top: 3px;">${entreprise?.nom || ''}</p>
      <div class="signature-space"></div>
      <p style="font-style: italic; color: #666;">Signature et cachet</p>
    </div>
    <div class="signature-bloc">
      <p><strong>Pour la MOE</strong></p>
      <p style="margin-top: 3px;">${infoGestionbat?.nom_entreprise || 'GESTIONBAT'}</p>
      <div class="signature-space"></div>
      <p style="font-style: italic; color: #666;">Signature et cachet</p>
    </div>
    <div class="signature-bloc">
      <p><strong>Pour le Maître d'Ouvrage</strong></p>
      <p style="margin-top: 3px;">${client?.nom || ''}</p>
      <div class="signature-space"></div>
      <p style="font-style: italic; color: #666;">Signature et cachet</p>
    </div>
  </div>

  <div class="footer">
    <div class="footer-left">${partenairesString}</div>
    <div class="footer-center">Page 1</div>
    <div class="footer-right">${dateFormatee}</div>
  </div>
</body>
</html>`;
      }

      // Convertir HTML en PDF
      toast.loading("Conversion en PDF...", {
        description: "Génération du fichier PDF en cours",
        id: "certificat-generation",
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
          const nomChantier = (chantier?.nom || 'chantier').replace(/[^a-z0-9]/gi, '_');
          link.download = `CP_${cert.numero}_${nomChantier}_${Date.now()}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          toast.success(`✅ Certificat ${useCisnFormat ? 'CISN' : 'standard'} généré !`, {
            description: "Le PDF a été téléchargé avec succès",
            duration: 6000,
            id: "certificat-generation",
          });
        } else {
          throw new Error(response.data?.error || "La conversion PDF a échoué");
        }
      } catch (pdfError) {
        console.error("Erreur conversion PDF, fallback sur HTML:", pdfError);
        
        const htmlAvecInstructions = htmlContent.replace(
          '</body>',
          `
          <div style="position: fixed; top: 10px; left: 10px; right: 10px; background: #fff3cd; border: 2px solid #ffc107; padding: 15px; border-radius: 5px; z-index: 9999;">
            <h3 style="margin: 0 0 10px 0; color: #856404;">⚠️ Instructions pour générer le PDF</h3>
            <ol style="margin: 0; padding-left: 20px; color: #856404;">
              <li>Ouvrez ce fichier dans votre navigateur</li>
              <li>Appuyez sur <strong>Ctrl + P</strong> (Windows) ou <strong>Cmd + P</strong> (Mac)</li>
              <li>Sélectionnez <strong>"Enregistrer au format PDF"</strong></li>
              <li>Choisissez <strong>Portrait</strong> comme orientation</li>
              <li>Cliquez sur <strong>Enregistrer</strong></li>
            </ol>
          </div>
          </body>`
        );
        
        const blob = new Blob([htmlAvecInstructions], { type: 'text/html;charset=utf-8' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        const nomChantier = (chantier?.nom || 'chantier').replace(/[^a-z0-9]/gi, '_');
        link.download = `CP_${cert.numero}_${nomChantier}_${Date.now()}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.warning("Fichier HTML téléchargé", {
          description: "La conversion PDF a échoué. Utilisez Ctrl+P pour créer le PDF.",
          id: "certificat-generation",
        });
      }

    } catch (error) {
      console.error("Erreur lors de la génération:", error);
      toast.error("Erreur", {
        description: error.message || "Erreur lors de la génération du certificat",
      });
    } finally {
      setExporting(false);
    }
  };
  // ⚠️ FIN GÉNÉRATION PDF CERTIFICAT FIGÉE v2.8.5
  // ===================================================================================

  const handleExportSuivi = async () => {
    if (certificats.length === 0) {
      toast.error("Aucune donnée", {
        description: "Aucun certificat à exporter",
      });
      return;
    }

    setExporting(true);

    try {
      const tableau = certificats
        .filter(c => c.statut === "valide")
        .map(cert => {
          const certTotalPenalties = cert.penalites_appliquees?.reduce((sum, p) => sum + (parseFloat(p.montant_calcule) || 0), 0) || 0;
          const montantNetHT = cert.montant_ht - certTotalPenalties;
          return {
            mois: MOIS_LABELS[cert.mois] || cert.mois,
            annee: cert.annee,
            entreprise: getEntrepriseName(cert.entreprise_id),
            montant_ht: cert.montant_ht,
            montant_ht_formate: cert.montant_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            penalites: certTotalPenalties,
            penalites_formate: certTotalPenalties.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            montant_net_ht: montantNetHT,
            montant_net_ht_formate: montantNetHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          }
        })
        .sort((a, b) => {
          if (a.annee !== b.annee) return a.annee - b.annee;
          const monthOrder = Object.keys(MOIS_LABELS);
          const monthAIndex = monthOrder.indexOf(Object.keys(MOIS_LABELS).find(key => MOIS_LABELS[key] === a.mois));
          const monthBIndex = monthOrder.indexOf(Object.keys(MOIS_LABELS).find(key => MOIS_LABELS[key] === b.mois));
          return monthAIndex - monthBIndex;
        });

      const totalHT = tableau.reduce((sum, item) => sum + item.montant_ht, 0);
      const totalPenalites = tableau.reduce((sum, item) => sum + item.penalites, 0);
      const totalNetHT = tableau.reduce((sum, item) => sum + item.montant_net_ht, 0);

      const partenairesList = chantier?.partenaires || [];
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

      const logoClient = chantier?.logo_client_url
        ? `<img src="${chantier.logo_client_url}" alt="Logo Client" style="max-width: 150px; max-height: 80px; object-fit: contain;" />`
        : '';

      const logoGestionbat = infoGestionbat?.logo_url
        ? `<img src="${infoGestionbat.logo_url}" alt="Logo GESTIONBAT" style="max-width: 150px; max-height: 80px; object-fit: contain;" />`
        : '<p style="font-weight: bold; color: #f97316; font-size: 16pt;">GESTIONBAT</p>';

      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tableau de Suivi Financier - ${chantier?.nom || 'Chantier'}</title>
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
      <h1>Tableau de Suivi Financier</h1>
      <p><strong>${chantier?.nom || 'Chantier'}</strong></p>
      <p>Situations mensuelles validées</p>
    </div>
    <div class="header-right">${logoGestionbat}</div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th style="width: 10%;">Période</th>
        <th style="width: 35%;">Entreprise</th>
        <th style="width: 18%; text-align: right;">Montant HT</th>
        <th style="width: 18%; text-align: right;">Pénalités HT</th>
        <th style="width: 19%; text-align: right;">Net à Payer HT</th>
      </tr>
    </thead>
    <tbody>
      ${tableau.map(item => `
        <tr>
          <td>${item.mois} ${item.annee}</td>
          <td>${item.entreprise}</td>
          <td style="text-align: right;">${item.montant_ht_formate} €</td>
          <td style="text-align: right; color: #ef4444;">- ${item.penalites_formate} €</td>
          <td style="text-align: right; font-weight: 600; color: #f97316;">${item.montant_net_ht_formate} €</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td><strong>TOTAL</strong></td>
        <td></td>
        <td style="text-align: right;"><strong>${totalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
        <td style="text-align: right; color: #ef4444;"><strong>- ${totalPenalites.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
        <td style="text-align: right;"><strong>${totalNetHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
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
        id: "export-suivi",
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
          const nomChantier = (chantier?.nom || 'chantier').replace(/[^a-z0-9]/gi, '_');
          link.download = `suivi_financier_${nomChantier}_${Date.now()}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          toast.success("Export réussi", {
            description: "Le tableau de suivi financier a été téléchargé en PDF",
            id: "export-suivi",
          });
        } else {
          throw new Error(response.data?.error || "La conversion PDF a échoué");
        }
      } catch (pdfError) {
        console.error("Erreur conversion PDF, fallback sur HTML:", pdfError);
        
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
        const nomChantier = (chantier?.nom || 'chantier').replace(/[^a-z0-9]/gi, '_');
        link.download = `suivi_financier_${nomChantier}_${Date.now()}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.warning("Fichier HTML téléchargé", {
          description: "Utilisez Ctrl+P pour créer le PDF",
          id: "export-suivi",
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      toast.error("Erreur", {
        description: error.message || "Erreur lors de l'export",
      });
    } finally {
      setExporting(false);
    }
  };

  const renderCertificatRow = (cert) => (
    <TableRow key={cert.id} className="hover:bg-gray-50">
      <TableCell className="font-mono font-semibold">
        {cert.numero}
      </TableCell>
      <TableCell className="font-medium">
        {MOIS_LABELS[cert.mois]} {cert.annee}
      </TableCell>
      <TableCell>
        {format(new Date(cert.date_situation), "dd/MM/yyyy", { locale: fr })}
      </TableCell>
      <TableCell className="font-semibold text-orange-600">
        {cert.montant_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
      </TableCell>
      <TableCell>
        {cert.facture_pdf_url ? (
          <a 
            href={cert.facture_pdf_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            <FileText className="w-4 h-4" />
            PDF
          </a>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </TableCell>
      <TableCell>
        <Badge className={cert.statut === "valide" 
          ? "bg-green-100 text-green-800 border-green-200 border" 
          : "bg-yellow-100 text-yellow-800 border-yellow-200 border"
        }>
          {cert.statut === "valide" ? "Validé" : "Brouillon"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          {cert.statut === "brouillon" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleValidate(cert)}
              title="Valider"
            >
              <Badge className="w-4 h-4 bg-green-600" />
            </Button>
          )}
          {cert.statut === "valide" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleExportCP(cert)}
              title="Éditer le CP"
              disabled={exporting}
            >
              <FileDown className="w-4 h-4 text-blue-600" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(cert)}
            title="Modifier"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(cert)}
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Certificats de paiement</h2>
          <p className="text-sm text-gray-600 mt-1">
            Gestion des situations mensuelles
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border">
            <Checkbox
              id="use-cisn-format"
              checked={useFormatCisn}
              onCheckedChange={setUseFormatCisn}
            />
            <Label htmlFor="use-cisn-format" className="text-sm cursor-pointer">
              Format CISN détaillé
            </Label>
          </div>
          {certificats.length > 0 && (
            <Button 
              variant="outline"
              className="gap-2"
              onClick={handleExportSuivi}
              disabled={exporting}
            >
              <Download className="w-4 h-4" />
              Tableau de suivi
            </Button>
          )}
          <Button 
            className="bg-orange-600 hover:bg-orange-700 gap-2"
            onClick={() => {
              resetForm();
              setShowDialog(true);
            }}
          >
            <Plus className="w-5 h-5" />
            Nouvelle situation
          </Button>
        </div>
      </div>

      {certificats.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Aucune situation enregistrée
          </h3>
          <p className="text-gray-500">
            Ajoutez votre première situation mensuelle pour commencer
          </p>
        </Card>
      ) : (
        <>
          <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="by-entreprise" className="gap-2">
                <FolderOpen className="w-4 h-4" />
                Par entreprise
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2">
                <FileText className="w-4 h-4" />
                Vue globale
              </TabsTrigger>
            </TabsList>

            <TabsContent value="by-entreprise" className="space-y-4 mt-6">
              {certificatsParEntreprise.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-gray-500">Aucun certificat disponible</p>
                </Card>
              ) : (
                <Accordion type="multiple" className="space-y-4">
                  {certificatsParEntreprise.map((groupe) => (
                    <AccordionItem 
                      key={groupe.entreprise?.id || 'unknown'} 
                      value={groupe.entreprise?.id || 'unknown'}
                      className="border rounded-lg overflow-hidden bg-white shadow-sm"
                    >
                      <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                              <Building className="w-5 h-5 text-orange-600" />
                            </div>
                            <div className="text-left">
                              <h3 className="font-semibold text-lg text-gray-900">
                                {groupe.entreprise?.nom || 'Entreprise non spécifiée'}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {groupe.certificats.length} situation{groupe.certificats.length > 1 ? 's' : ''} • 
                                {groupe.certificats.filter(c => c.statut === 'valide').length} validée{groupe.certificats.filter(c => c.statut === 'valide').length > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right mr-2">
                            <p className="text-sm text-gray-500">Montant cumulé validé</p>
                            <p className="text-2xl font-bold text-orange-600">
                              {groupe.montantValide.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                            </p>
                            {groupe.montantTotal !== groupe.montantValide && (
                              <p className="text-xs text-gray-400">
                                Total : {groupe.montantTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </p>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-0 pb-0">
                        <div className="border-t">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead>N° CP</TableHead>
                                <TableHead>Période</TableHead>
                                <TableHead>Date situation</TableHead>
                                <TableHead>Montant HT</TableHead>
                                <TableHead>Facture</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="w-24">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {groupe.certificats.map(cert => renderCertificatRow(cert))}
                            </TableBody>
                          </Table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </TabsContent>

            <TabsContent value="all" className="mt-6">
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>N° CP</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead>Entreprise</TableHead>
                        <TableHead>Date situation</TableHead>
                        <TableHead>Montant HT</TableHead>
                        <TableHead>Facture</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {certificats.map((cert) => (
                        <TableRow key={cert.id} className="hover:bg-gray-50">
                          <TableCell className="font-mono font-semibold">
                            {cert.numero}
                          </TableCell>
                          <TableCell className="font-medium">
                            {MOIS_LABELS[cert.mois]} {cert.annee}
                          </TableCell>
                          <TableCell>{getEntrepriseName(cert.entreprise_id)}</TableCell>
                          <TableCell>
                            {format(new Date(cert.date_situation), "dd/MM/yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell className="font-semibold text-orange-600">
                            {cert.montant_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                          </TableCell>
                          <TableCell>
                            {cert.facture_pdf_url ? (
                              <a 
                                href={cert.facture_pdf_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <FileText className="w-4 h-4" />
                                PDF
                              </a>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={cert.statut === "valide" 
                              ? "bg-green-100 text-green-800 border-green-200 border" 
                              : "bg-yellow-100 text-yellow-800 border-yellow-200 border"
                            }>
                              {cert.statut === "valide" ? "Validé" : "Brouillon"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {cert.statut === "brouillon" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleValidate(cert)}
                                  title="Valider"
                                >
                                  <Badge className="w-4 h-4 bg-green-600" />
                                </Button>
                              )}
                              {cert.statut === "valide" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleExportCP(cert)}
                                  title="Éditer le CP"
                                  disabled={exporting}
                                >
                                  <FileDown className="w-4 h-4 text-blue-600" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(cert)}
                                title="Modifier"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(cert)}
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCertificat ? "Modifier la situation" : "Nouvelle situation"}
            </DialogTitle>
            <DialogDescription>
              Saisissez les informations de la situation mensuelle
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mois">Mois *</Label>
                  <Select
                    value={formData.mois}
                    onValueChange={(value) => setFormData({ ...formData, mois: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le mois" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MOIS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="annee">Année *</Label>
                  <Select
                    value={formData.annee}
                    onValueChange={(value) => setFormData({ ...formData, annee: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner l'année" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entreprise_id">Entreprise *</Label>
                <Select
                  value={formData.entreprise_id}
                  onValueChange={(value) => setFormData({ ...formData, entreprise_id: value })}
                  required
                >
                  <SelectTrigger>
                      <SelectValue placeholder="Sélectionner l'entreprise" />
                  </SelectTrigger>
                  <SelectContent>
                    {entreprisesAvecMarche.map(entreprise => (
                      <SelectItem key={entreprise.id} value={entreprise.id}>
                        {entreprise.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_situation">Date de la situation *</Label>
                <Input
                  id="date_situation"
                  type="date"
                  value={formData.date_situation}
                  onChange={(e) => setFormData({ ...formData, date_situation: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="montant_ht">Montant HT de la situation (€) *</Label>
                <Input
                  id="montant_ht"
                  type="number"
                  step="0.01"
                  value={formData.montant_ht}
                  onChange={(e) => setFormData({ ...formData, montant_ht: e.target.value })}
                  placeholder="0,00"
                  required
                />
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Paiements sous-traitants</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSousTraitant}
                    disabled={formData.paiements_sous_traitants.length >= 10 || entreprisesSousTraitantes.length === 0}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </Button>
                </div>

                {entreprisesSousTraitantes.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    Aucun sous-traitant enregistré pour ce chantier. Veuillez d'abord créer des contrats de sous-traitance dans l'onglet Sous-traitance.
                  </p>
                ) : formData.paiements_sous_traitants.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    Aucun paiement sous-traitant ajouté
                  </p>
                ) : (
                  <div className="space-y-3">
                    {formData.paiements_sous_traitants.map((paiement, index) => (
                      <div key={index} className="flex gap-2 items-end p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs">Sous-traitant {index + 1}</Label>
                          <Select
                            value={paiement.entreprise_id}
                            onValueChange={(value) => handleUpdateSousTraitant(index, 'entreprise_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner l'entreprise" />
                            </SelectTrigger>
                            <SelectContent>
                              {entreprisesSousTraitantes.map(entreprise => (
                                <SelectItem key={entreprise.id} value={entreprise.id}>
                                  {entreprise.nom}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-32 space-y-2">
                          <Label className="text-xs">Montant HT (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={paiement.montant_ht}
                            onChange={(e) => handleUpdateSousTraitant(index, 'montant_ht', e.target.value)}
                            placeholder="0,00"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSousTraitant(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {formData.paiements_sous_traitants.length >= 10 && (
                  <p className="text-xs text-amber-600">
                    Maximum de 10 sous-traitants atteint
                  </p>
                )}
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Pénalités</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPenalite}
                    disabled={!chantier?.penalites || chantier.penalites.length === 0}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </Button>
                </div>

                {!chantier?.penalites || chantier.penalites.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    Aucune pénalité définie dans les paramètres du chantier.
                  </p>
                ) : formData.penalites_appliquees.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    Aucune pénalité appliquée à cette situation.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {formData.penalites_appliquees.map((penalite, index) => (
                      <div key={index} className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex justify-between items-start mb-3">
                          <Label className="text-sm font-semibold text-red-800">Pénalité {index + 1}</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePenalite(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-100 h-6 w-6"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2 space-y-2">
                            <Label className="text-xs">Type de pénalité</Label>
                            <Select
                              value={penalite.type_penalite}
                              onValueChange={(value) => handleUpdatePenalite(index, 'type_penalite', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner une pénalité" />
                              </SelectTrigger>
                              <SelectContent>
                                {chantier.penalites.map((p, idx) => (
                                  <SelectItem key={idx} value={p.type_penalite}>
                                    {p.type_penalite} - {p.valeur}€ / {p.base}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Base</Label>
                            <Input
                              value={penalite.base}
                              disabled
                              className="bg-white"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Valeur unitaire (€)</Label>
                            <Input
                              value={penalite.valeur}
                              disabled
                              className="bg-white"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Nombre ({penalite.base})</Label>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              value={penalite.nombre}
                              onChange={(e) => handleUpdatePenalite(index, 'nombre', e.target.value)}
                              placeholder="0"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Valeur minimum (€)</Label>
                            <Input
                              value={penalite.valeur_minimum}
                              disabled
                              className="bg-white"
                            />
                          </div>

                          <div className="col-span-2 flex items-center gap-2 p-2 bg-white rounded border">
                            <Checkbox
                              id={`utiliser_minimum_${index}`}
                              checked={penalite.utiliser_valeur_minimum}
                              onCheckedChange={(checked) => handleUpdatePenalite(index, 'utiliser_valeur_minimum', checked)}
                            />
                            <Label 
                              htmlFor={`utiliser_minimum_${index}`}
                              className="text-sm cursor-pointer"
                            >
                              Appliquer la valeur minimum si le calcul est inférieur
                            </Label>
                          </div>

                          <div className="col-span-2 p-3 bg-white rounded border-2 border-red-300">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-gray-700">Montant de la pénalité :</span>
                              <span className="text-lg font-bold text-red-600">
                                - {(penalite.montant_calcule || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {formData.penalites_appliquees.length > 0 && (
                      <div className="p-4 bg-red-100 rounded-lg border-2 border-red-400">
                        <div className="flex justify-between items-center">
                          <span className="text-base font-bold text-gray-900">Total des pénalités :</span>
                          <span className="text-xl font-bold text-red-700">
                            - {montantTotalPenalites.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Facture PDF</Label>
                {formData.facture_pdf_url ? (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <FileText className="w-5 h-5 text-orange-600" />
                    <a 
                      href={formData.facture_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm flex-1 truncate text-blue-600 hover:underline"
                    >
                      {getFileName(formData.facture_pdf_url)}
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFormData({ ...formData, facture_pdf_url: "" })}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={handlePDFUpload}
                      disabled={uploadingPDF}
                      className="cursor-pointer"
                    />
                    {uploadingPDF && <p className="text-xs text-gray-500 mt-1">Téléchargement...</p>}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes supplémentaires..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                className="bg-orange-600 hover:bg-orange-700"
                disabled={createMutation.isPending || updateMutation.isPending || uploadingPDF}
              >
                {createMutation.isPending || updateMutation.isPending 
                  ? "Enregistrement..." 
                  : selectedCertificat ? "Mettre à jour" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette situation ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCertificatToDelete(null)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
