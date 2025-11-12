
import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Download, FileText, Pencil, Trash2, X, CheckSquare, Square, Building, Upload, FileCheck, Filter } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";

const statutColors = {
  brouillon: "bg-yellow-100 text-yellow-800 border-yellow-200",
  valide: "bg-green-100 text-green-800 border-green-200",
  integre_avenant: "bg-blue-100 text-blue-800 border-blue-200"
};

const statutLabels = {
  brouillon: "Brouillon",
  valide: "Validé",
  integre_avenant: "Intégré à avenant"
};

const TYPE_DEVIS_OPTIONS = ["TMA", "TS"];
const ORIGINE_DEVIS_OPTIONS = ["Aléas chantier", "Demande MOA", "Anomalie conception"];

export default function TravauxSupTab({ chantierId }) {
  // ⚠️ COMPOSANT FIGÉ v2.7.6 FINAL - NE PAS MODIFIER SANS VALIDATION
  // - Export PDF Suivi Financier : Logo CLIENT à gauche, Logo GESTIONBAT à droite
  // - Footer PDF : Architecte / GESTIONBAT / Autres partenaires (ordre strict)
  // - Toasts : Tous les appels toast.* sont figés et standardisés
  // - Template d'avenant PDF : Fallback figé avec HTML instructions Ctrl+P
  // ========================================================================

  const [showDevisDialog, setShowDevisDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAvenantDialog, setShowAvenantDialog] = useState(false);
  const [showDeleteAvenantDialog, setShowDeleteAvenantDialog] = useState(false);
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [selectedAvenant, setSelectedAvenant] = useState(null);
  const [devisToDelete, setDevisToDelete] = useState(null);
  const [avenantToDelete, setAvenantToDelete] = useState(null);
  const [selectedDevisIds, setSelectedDevisIds] = useState([]);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [generatingAvenant, setGeneratingAvenant] = useState(false);
  const [activeTab, setActiveTab] = useState("devis");

  const [generatingAvenantPDF, setGeneratingAvenantPDF] = useState(false);
  const [filterEntreprise, setFilterEntreprise] = useState("all");
  const [filterStatut, setFilterStatut] = useState("all");
  const [highlightedAvenantId, setHighlightedAvenantId] = useState(null);
  const [openAccordionItems, setOpenAccordionItems] = useState([]);

  const [formData, setFormData] = useState({
    entreprise_id: "",
    numero_devis: "",
    date_devis: "",
    intitule_devis: "",
    montant_ht: "",
    type_devis: "TS",
    origine_devis: "",
    devis_pdf_url: "",
    statut: "brouillon",
    notes: ""
  });

  const queryClient = useQueryClient();

  const { data: devis, isLoading: loadingDevis } = useQuery({
    queryKey: ['travaux-sup', chantierId],
    queryFn: async () => {
      const allDevis = await base44.entities.TravauxSupplementaire.list('-date_devis');
      return allDevis.filter(d => d.chantier_id === chantierId);
    },
    initialData: [],
  });

  const { data: avenants, isLoading: loadingAvenants } = useQuery({
    queryKey: ['avenants', chantierId],
    queryFn: async () => {
      const allAvenants = await base44.entities.Avenant.list('-numero');
      return allAvenants.filter(a => a.chantier_id === chantierId);
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

  const { data: membresEquipe } = useQuery({
    queryKey: ['membresEquipe'],
    queryFn: () => base44.entities.MembreEquipe.list(),
    initialData: [],
  });

  const { data: partenaires } = useQuery({
    queryKey: ['partenaires'],
    queryFn: () => base44.entities.Partenaire.list(),
    initialData: [],
  });

  const entreprisesAvecMarche = useMemo(() => {
    const entrepriseIds = [...new Set(marches.map(m => m.entreprise_id))];
    return entreprises.filter(e => entrepriseIds.includes(e.id));
  }, [marches, entreprises]);

  // Tableau de suivi financier
  const suiviFinancier = useMemo(() => {
    const grouped = {};

    // Ajouter les marchés initiaux
    marches.forEach(marche => {
      if (!grouped[marche.entreprise_id]) {
        const entreprise = entreprises.find(e => e.id === marche.entreprise_id);
        grouped[marche.entreprise_id] = {
          entreprise: entreprise,
          montant_marche_initial: marche.montant || 0,
          avenants: []
        };
      } else {
        grouped[marche.entreprise_id].montant_marche_initial += marche.montant || 0;
      }
    });

    // Ajouter les avenants validés ET signés
    avenants.forEach(avenant => {
      if ((avenant.statut === 'valide' || avenant.statut === 'signe') && grouped[avenant.entreprise_id]) {
        grouped[avenant.entreprise_id].avenants.push({
          id: avenant.id,
          numero: avenant.numero,
          montant: avenant.montant_total_ht || 0
        });
      }
    });

    return Object.values(grouped).map(item => ({
      ...item,
      montant_total_avenants: item.avenants.reduce((sum, a) => sum + a.montant, 0),
      montant_total_final: item.montant_marche_initial + item.avenants.reduce((sum, a) => sum + a.montant, 0)
    })).sort((a, b) => (a.entreprise?.nom || '').localeCompare(b.entreprise?.nom || ''));
  }, [marches, avenants, entreprises]);

  // Regrouper les avenants par entreprise avec filtres
  const avenantParEntreprise = useMemo(() => {
    let filteredAvenants = avenants;

    // Appliquer le filtre par entreprise
    if (filterEntreprise !== "all") {
      filteredAvenants = filteredAvenants.filter(a => a.entreprise_id === filterEntreprise);
    }

    // Appliquer le filtre par statut
    if (filterStatut !== "all") {
      filteredAvenants = filteredAvenants.filter(a => a.statut === filterStatut);
    }

    const grouped = {};

    filteredAvenants.forEach(avenant => {
      if (!grouped[avenant.entreprise_id]) {
        const entreprise = entreprises.find(e => e.id === avenant.entreprise_id);
        grouped[avenant.entreprise_id] = {
          entreprise: entreprise,
          avenants: [],
          montantTotal: 0,
          montantValide: 0
        };
      }

      grouped[avenant.entreprise_id].avenants.push(avenant);
      grouped[avenant.entreprise_id].montantTotal += avenant.montant_total_ht || 0;

      // Sum for validated/signed avenants
      if (avenant.statut === 'valide' || avenant.statut === 'signe') {
        grouped[avenant.entreprise_id].montantValide += avenant.montant_total_ht || 0;
      }
    });

    return Object.values(grouped).sort((a, b) =>
      (a.entreprise?.nom || '').localeCompare(b.entreprise?.nom || '')
    );
  }, [avenants, entreprises, filterEntreprise, filterStatut]);

  // Nouvelle fonction pour naviguer vers un avenant spécifique
  const navigateToAvenant = (avenantId) => {
    const avenant = avenants.find(a => a.id === avenantId);
    if (!avenant) return;

    // Basculer vers l'onglet Avenants
    setActiveTab("avenants");

    // Réinitialiser les filtres pour afficher tous les avenants
    setFilterEntreprise("all");
    setFilterStatut("all");

    // Ouvrir l'accordéon de l'entreprise correspondante
    setOpenAccordionItems(prev => {
      if (prev.includes(avenant.entreprise_id)) {
        return prev; // Already open
      }
      return [avenant.entreprise_id]; // Open only this one
    });

    // Mettre en surbrillance l'avenant
    setHighlightedAvenantId(avenantId);

    // Scroll après un court délai pour laisser le temps à l'accordéon de s'ouvrir
    setTimeout(() => {
      const element = document.getElementById(`avenant-${avenantId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);

    // Retirer le surbrillance après 3 secondes
    setTimeout(() => {
      setHighlightedAvenantId(null);
    }, 3000);
  };

  // ⚠️ TOASTS FIGÉS v2.7.6 - NE PAS MODIFIER
  // Tous les appels toast.* sont standardisés et figés
  // ================================================

  const createDevisMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.TravauxSupplementaire.create({
        ...data,
        chantier_id: chantierId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travaux-sup'] });
      setShowDevisDialog(false);
      resetForm();
      toast.success("Devis créé", {
        description: "Le devis a été créé avec succès",
      });
    },
  });

  const updateDevisMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TravauxSupplementaire.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travaux-sup'] });
      setShowDevisDialog(false);
      resetForm();
      toast.success("Devis mis à jour", {
        description: "Le devis a été mis à jour avec succès",
      });
    },
  });

  const deleteDevisMutation = useMutation({
    mutationFn: (id) => base44.entities.TravauxSupplementaire.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travaux-sup'] });
      toast.success("Devis supprimé", {
        description: "Le devis a été supprimé avec succès",
      });
    },
  });

  const createAvenantMutation = useMutation({
    mutationFn: async (data) => {
      const avenantsPourEntreprise = avenants.filter(a => a.entreprise_id === data.entreprise_id);
      const nextNumero = (avenantsPourEntreprise.length + 1).toString().padStart(2, '0');

      return base44.entities.Avenant.create({
        ...data,
        chantier_id: chantierId,
        numero: nextNumero
      });
    },
    onSuccess: (newAvenant) => {
      const updatePromises = selectedDevisIds.map(devisId =>
        base44.entities.TravauxSupplementaire.update(devisId, {
          avenant_id: newAvenant.id,
          statut: 'integre_avenant'
        })
      );

      Promise.all(updatePromises).then(() => {
        queryClient.invalidateQueries({ queryKey: ['travaux-sup'] });
        queryClient.invalidateQueries({ queryKey: ['avenants'] });
        setShowAvenantDialog(false);
        setSelectedDevisIds([]);
        toast.success("Avenant créé", {
          description: `L'avenant N°${newAvenant.numero} a été créé avec succès`,
        });
      });
    },
  });

  const updateAvenantMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Avenant.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avenants'] });
      setShowAvenantDialog(false);
      setSelectedAvenant(null);
      toast.success("Avenant mis à jour", {
        description: "L'avenant a été mis à jour avec succès",
      });
    },
  });

  const deleteAvenantMutation = useMutation({
    mutationFn: async (avenantId) => {
      const avenant = avenants.find(a => a.id === avenantId);

      if (avenant && avenant.devis_ids && avenant.devis_ids.length > 0) {
        const updatePromises = avenant.devis_ids.map(devisId =>
          base44.entities.TravauxSupplementaire.update(devisId, {
            avenant_id: null,
            statut: 'brouillon'
          })
        );
        await Promise.all(updatePromises);
      }

      return await base44.entities.Avenant.delete(avenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travaux-sup'] });
      queryClient.invalidateQueries({ queryKey: ['avenants'] });
      toast.success("Avenant supprimé", {
        description: "L'avenant a été supprimé et les devis ont été remis en brouillon",
      });
      setShowDeleteAvenantDialog(false);
      setAvenantToDelete(null);
    },
    onError: (error) => {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur", {
        description: `Impossible de supprimer l'avenant: ${error.message}`,
      });
      setShowDeleteAvenantDialog(false);
      setAvenantToDelete(null);
    },
  });

  const updateAvenantStatutMutation = useMutation({
    mutationFn: ({ id, statut }) => base44.entities.Avenant.update(id, { statut }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avenants'] });
      toast.success("Statut mis à jour", {
        description: "Le statut de l'avenant a été mis à jour avec succès",
        duration: 3000,
      });
    },
  });

  const uploadAvenantSigneMutation = useMutation({
    mutationFn: async ({ id, file }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return base44.entities.Avenant.update(id, { avenant_signe_url: file_url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avenants'] });
      toast.success("Avenant signé importé", {
        description: "L'avenant signé a été importé avec succès",
        duration: 3000,
      });
    },
  });

  // ⚠️ FIN SECTION TOASTS FIGÉS
  // ================================================

  const resetForm = () => {
    setFormData({
      entreprise_id: "",
      numero_devis: "",
      date_devis: "",
      intitule_devis: "",
      montant_ht: "",
      type_devis: "TS",
      origine_devis: "",
      devis_pdf_url: "",
      statut: "brouillon",
      notes: ""
    });
    setSelectedDevis(null);
  };

  const handleEdit = (devisItem) => {
    setSelectedDevis(devisItem);
    setFormData({
      entreprise_id: devisItem.entreprise_id || "",
      numero_devis: devisItem.numero_devis || "",
      date_devis: devisItem.date_devis ? format(new Date(devisItem.date_devis), "yyyy-MM-dd") : "",
      intitule_devis: devisItem.intitule_devis || "",
      montant_ht: devisItem.montant_ht ? String(devisItem.montant_ht) : "",
      type_devis: devisItem.type_devis || "TS",
      origine_devis: devisItem.origine_devis || "",
      devis_pdf_url: devisItem.devis_pdf_url || "",
      statut: devisItem.statut || "brouillon",
      notes: devisItem.notes || ""
    });
    setShowDevisDialog(true);
  };

  const handleDeleteAvenant = (avenantId) => {
    const avenant = avenants.find(a => a.id === avenantId);
    setAvenantToDelete(avenant);
    setShowDeleteAvenantDialog(true);
  };

  const handleChangeStatutAvenant = (avenantId, newStatut) => {
    updateAvenantStatutMutation.mutate({ id: avenantId, statut: newStatut });
  };

  const handleUploadAvenantSigne = async (avenantId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadAvenantSigneMutation.mutate({ id: avenantId, file });
  };

  const getStatutColor = (statut) => {
    switch (statut) {
      case 'brouillon':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'valide':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'signe':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatutLabel = (statut) => {
    switch (statut) {
      case 'brouillon':
        return 'Brouillon';
      case 'valide':
        return 'Validé';
      case 'signe':
        return 'Signé';
      default:
        return statut;
    }
  };

  const handleDelete = (devisItem) => {
    setDevisToDelete(devisItem);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (devisToDelete) {
      deleteDevisMutation.mutate(devisToDelete.id);
      setShowDeleteDialog(false);
      setDevisToDelete(null);
    }
  };

  const confirmDeleteAvenant = () => {
    if (avenantToDelete && avenantToDelete.id) {
      deleteAvenantMutation.mutate(avenantToDelete.id);
    } else {
      console.error("Avenant à supprimer non défini.");
      toast.error("Erreur", {
        description: "Avenant non trouvé",
      });
      setShowDeleteAvenantDialog(false);
      setAvenantToDelete(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Validation supplémentaire
    if (!formData.entreprise_id) {
      toast.error("Veuillez sélectionner une entreprise");
      return;
    }
    if (!formData.date_devis) {
      toast.error("Veuillez saisir une date");
      return;
    }
    if (!formData.intitule_devis || !formData.intitule_devis.trim()) {
      toast.error("Veuillez saisir un intitulé");
      return;
    }
    if (!formData.montant_ht || parseFloat(formData.montant_ht) <= 0) {
      toast.error("Veuillez saisir un montant valide et supérieur à 0");
      return;
    }
    if (!formData.type_devis) {
      toast.error("Veuillez sélectionner un type de devis");
      return;
    }

    const dataToSubmit = {
      ...formData,
      montant_ht: parseFloat(formData.montant_ht) || 0,
      numero_devis: formData.numero_devis || null
    };

    if (selectedDevis) {
      updateDevisMutation.mutate({ id: selectedDevis.id, data: dataToSubmit });
    } else {
      createDevisMutation.mutate(dataToSubmit);
    }
  };

  const handlePDFUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPDF(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, devis_pdf_url: file_url });
      toast.success("Fichier téléchargé", {
        description: "Le devis a été téléchargé avec succès",
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

  const handleToggleDevisSelection = (devisId) => {
    const devisItem = devis.find(d => d.id === devisId);
    if (devisItem && devisItem.statut === 'integre_avenant') {
      return;
    }

    setSelectedDevisIds(prev =>
      prev.includes(devisId)
        ? prev.filter(id => id !== devisId)
        : [...prev, devisId]
    );
  };

  const handleCreateAvenant = () => {
    if (selectedDevisIds.length === 0) {
      toast.error("Aucun devis sélectionné", {
        description: "Veuillez sélectionner au moins un devis",
      });
      return;
    }

    const selectedDevisData = devis.filter(d => selectedDevisIds.includes(d.id));
    const entrepriseIds = [...new Set(selectedDevisData.map(d => d.entreprise_id))];

    if (entrepriseIds.length > 1) {
      toast.error("Erreur", {
        description: "Tous les devis sélectionnés doivent être de la même entreprise",
      });
      return;
    }

    setSelectedAvenant(null);
    setShowAvenantDialog(true);
  };

  const confirmCreateAvenant = () => {
    const selectedDevisData = devis.filter(d => selectedDevisIds.includes(d.id));
    const montantTotal = selectedDevisData.reduce((sum, d) => sum + (d.montant_ht || 0), 0);
    const entrepriseId = selectedDevisData[0].entreprise_id;

    const avenantData = {
      entreprise_id: entrepriseId,
      date: new Date().toISOString().split('T')[0],
      devis_ids: selectedDevisIds,
      montant_total_ht: montantTotal,
      statut: "brouillon"
    };

    createAvenantMutation.mutate(avenantData);
  };

  // ⚠️ EXPORT PDF SUIVI FINANCIER FIGÉ v2.7.6 FINAL
  // Structure STRICTE : Logo CLIENT (gauche) + Logo GESTIONBAT (droite)
  // Footer : Architecte / GESTIONBAT / Autres partenaires
  // Template HTML avec fallback Ctrl+P instructions
  // NE PAS MODIFIER SANS VALIDATION
  // =========================================================================
  const handleExportSuiviFinancier = async () => {
    if (suiviFinancier.length === 0) {
      toast.error("Aucune donnée", {
        description: "Aucune donnée à exporter",
      });
      return;
    }

    // ✅ Récupération des partenaires avec ordre : Architecte / GESTIONBAT / Autres
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
      : '<p style="font-weight: bold; color: #1e40af; font-size: 12pt;">' + (clients.find(c => c.id === chantier?.client_id)?.nom || 'CLIENT') + '</p>';

    const logoGestionbat = infoGestionbat && infoGestionbat.logo_url
      ? `<img src="${infoGestionbat.logo_url}" alt="Logo GESTIONBAT" style="max-width: 150px; max-height: 80px; object-fit: contain;" />`
      : '<p style="font-weight: bold; color: #f97316; font-size: 12pt;">GESTIONBAT</p>';

    const lignesTableau = suiviFinancier.map(item => {
      const lignesAvenants = item.avenants.length === 0
        ? '<span style="color: #999; font-style: italic; font-size: 9pt;">Aucun avenant</span>'
        : item.avenants.map(av => `
            <div style="font-size: 9pt; margin: 2px 0;">
              <span style="font-weight: 600;">Avenant N°${av.numero}</span>: ${av.montant.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
          `).join('') + (item.avenants.length > 0 ? `
            <div style="margin-top: 5px; font-weight: 600; font-size: 9pt; color: #f97316;">
              Total avenants: ${item.montant_total_avenants.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
          ` : '');

      return `
        <tr>
          <td><strong>${item.entreprise?.nom || 'Non spécifié'}</strong></td>
          <td style="text-align: right;">${item.montant_marche_initial.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
          <td>${lignesAvenants}</td>
          <td style="text-align: right; font-weight: 600; color: #f97316;">
            ${item.montant_total_final.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </td>
        </tr>
      `;
    }).join('');

    const totalMarcheInitial = suiviFinancier.reduce((sum, item) => sum + item.montant_marche_initial, 0);
    const totalAvenants = suiviFinancier.reduce((sum, item) => sum + item.montant_total_avenants, 0);
    const totalFinal = suiviFinancier.reduce((sum, item) => sum + item.montant_total_final, 0);

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Suivi Financier - ${chantier?.nom || 'Chantier'}</title>
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
      <h1>Suivi Financier Marchés et Avenants</h1>
      <p><strong>${chantier?.nom || 'Chantier'}</strong></p>
      <p>État au ${format(new Date(), "dd MMMM yyyy", { locale: fr })}</p>
    </div>
    <div class="header-right">${logoGestionbat}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 30%;">Entreprise</th>
        <th style="width: 20%; text-align: right;">Marché Initial HT</th>
        <th style="width: 30%;">Avenants</th>
        <th style="width: 20%; text-align: right;">Montant Final HT</th>
      </tr>
    </thead>
    <tbody>
      ${lignesTableau}
      <tr class="total-row">
        <td><strong>TOTAL</strong></td>
        <td style="text-align: right;">
          <strong>${totalMarcheInitial.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong>
        </td>
        <td style="text-align: right;">
          <strong>${totalAvenants.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong>
        </td>
        <td style="text-align: right;">
          <strong>${totalFinal.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong>
        </td>
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

    toast.info("Conversion en PDF...", {
      description: "Génération du fichier PDF en cours",
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

        toast.success("PDF généré", {
          description: "Le suivi financier a été téléchargé en PDF",
        });
      } else {
        throw new Error("La conversion PDF a échoué");
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
        description: "La conversion PDF a échoué. Utilisez Ctrl+P pour créer le PDF.",
      });
    }
  };
  // ⚠️ FIN EXPORT PDF SUIVI FINANCIER FIGÉ v2.7.6
  // =========================================================================

  const getEntrepriseName = (entrepriseId) => {
    const entreprise = entreprises.find(e => e.id === entrepriseId);
    return entreprise?.nom || "Non spécifié";
  };

  const getFileName = (url) => {
    if (!url) return "";
    return url.split('/').pop().split('?')[0];
  };

  // Logic for editing avenant: handleEditAvenant
  const handleEditAvenant = async (avenant) => {
    setSelectedAvenant(avenant);
    setGeneratingAvenantPDF(true);

    try {
      const entreprise = entreprises.find(e => e.id === avenant.entreprise_id);
      const client = clients.find(c => c.id === chantier?.client_id);
      const marche = marches.find(m => m.entreprise_id === avenant.entreprise_id);

      // Récupérer les devis associés à l'avenant
      const devisAssocies = devis.filter(d => avenant.devis_ids?.includes(d.id));

      // Calculer les montants des avenants précédents VALIDÉS ET SIGNÉS
      const avenantsPrecedents = avenants
        .filter(a =>
          a.entreprise_id === avenant.entreprise_id &&
          parseInt(a.numero) < parseInt(avenant.numero) &&
          (a.statut === 'valide' || a.statut === 'signe')
        )
        .sort((a, b) => parseInt(a.numero) - parseInt(b.numero));

      // Calculer le montant du marché de base
      const montantMarcheBase = marche?.montant || 0;
      const tauxTVA = marche?.taux_tva || chantier?.taux_tva?.[0] || 20;

      // Si une trame d'avenant existe dans le chantier, utiliser l'auto-remplissage
      if (chantier?.trame_avenants_url) {
        try {
          toast.loading("Génération en cours...", {
            description: "Remplissage automatique de la trame d'avenant",
            id: "avenant-generation",
          });

          // Calculer le montant cumulé des avenants précédents
          const montantTotalAvenantsPrecedentsHT = avenantsPrecedents.reduce((sum, av) => sum + (av.montant_total_ht || 0), 0);
          const montantTotalAvenantsPrecedentsTTC = montantTotalAvenantsPrecedentsHT * (1 + tauxTVA / 100);
          const nouveauMontantMarcheHT = montantMarcheBase + montantTotalAvenantsPrecedentsHT + avenant.montant_total_ht;
          const nouveauMontantMarcheTTC = nouveauMontantMarcheHT * (1 + tauxTVA / 100);

          // Préparer les données pour remplir la trame
          const data = {
            "{{NUMERO_AVENANT}}": avenant.numero,
            "{{DATE_AVENANT}}": format(new Date(avenant.date), "dd/MM/yyyy", { locale: fr }),
            "{{DATE_GENERATION}}": format(new Date(), "dd/MM/yyyy", { locale: fr }),
            "{{CHANTIER_NOM}}": chantier?.nom || '',
            "{{CHANTIER_ADRESSE}}": chantier?.adresse || '',
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
            "{{NUMERO_LOT}}": marche?.numero_lot || '',
            "{{INTITULE_LOT}}": marche?.intitule_lot || '',
            "{{MONTANT_TOTAL_HT}}": avenant.montant_total_ht.toFixed(2).replace('.', ','),
            "{{MONTANT_TOTAL_TTC}}": (avenant.montant_total_ht * (1 + tauxTVA / 100)).toFixed(2).replace('.', ','),
            "{{TAUX_TVA}}": tauxTVA.toString(),
            "{{NB_DEVIS}}": devisAssocies.length.toString(),
            "{{MARCHE_BASE_HT}}": montantMarcheBase.toFixed(2).replace('.', ','),
            "{{MARCHE_BASE_TTC}}": (montantMarcheBase * (1 + tauxTVA / 100)).toFixed(2).replace('.', ','),
            "{{TOTAL_AVENANTS_PRECEDENTS_HT}}": montantTotalAvenantsPrecedentsHT.toFixed(2).replace('.', ','),
            "{{TOTAL_AVENANTS_PRECEDENTS_TTC}}": montantTotalAvenantsPrecedentsTTC.toFixed(2).replace('.', ','),
            "{{NOUVEAU_MONTANT_MARCHE_HT}}": nouveauMontantMarcheHT.toFixed(2).replace('.', ','),
            "{{NOUVEAU_MONTANT_MARCHE_TTC}}": nouveauMontantMarcheTTC.toFixed(2).replace('.', ','),
            ...devisAssocies.reduce((acc, d, index) => {
              const i = index + 1;
              acc[`{{DEVIS_${i}_NUMERO}}`] = d.numero_devis || `No.${i}`;
              acc[`{{DEVIS_${i}_DATE}}`] = format(new Date(d.date_devis), "dd/MM/yyyy", { locale: fr });
              acc[`{{DEVIS_${i}_INTITULE}}`] = d.intitule_devis;
              acc[`{{DEVIS_${i}_TYPE}}`] = d.type_devis;
              acc[`{{DEVIS_${i}_ORIGINE}}`] = d.origine_devis || 'N/A';
              acc[`{{DEVIS_${i}_MONTANT_HT}}`] = d.montant_ht.toFixed(2).replace('.', ',');
              acc[`{{DEVIS_${i}_MONTANT_TTC}}`] = (d.montant_ht * (1 + tauxTVA / 100)).toFixed(2).replace('.', ',');
              return acc;
            }, {}),
            ...avenantsPrecedents.reduce((acc, av, index) => {
              const i = index + 1;
              acc[`{{AVENANT_PREC_${i}_NUMERO}}`] = av.numero;
              acc[`{{AVENANT_PREC_${i}_HT}}`] = av.montant_total_ht.toFixed(2).replace('.', ',');
              acc[`{{AVENANT_PREC_${i}_TTC}}`] = (av.montant_total_ht * (1 + tauxTVA / 100)).toFixed(2).replace('.', ',');
              return acc;
            }, {}),
            "{{GESTIONBAT_NOM}}": infoGestionbat?.nom_entreprise || 'GESTIONBAT',
            "{{GESTIONBAT_ADRESSE}}": infoGestionbat?.adresse || '',
            "{{GESTIONBAT_CODE_POSTAL}}": infoGestionbat?.code_postal || '',
            "{{GESTIONBAT_VILLE}}": infoGestionbat?.ville || '',
            "{{GESTIONBAT_TELEPHONE}}": infoGestionbat?.telephone || '',
            "{{GESTIONBAT_SIRET}}": infoGestionbat?.siret || '',
          };

          const response = await base44.functions.invoke('fillExcelTemplate', {
            template_url: chantier.trame_avenants_url,
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
            link.download = `Avenant_${avenant.numero}_${nomChantier}_${Date.now()}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success("Avenant généré automatiquement !", {
              description: "Fichier Excel téléchargé avec succès",
              duration: 6000,
              id: "avenant-generation",
            });

            setGeneratingAvenantPDF(false);
            setSelectedAvenant(null);
            return;

          } else {
            throw new Error("La réponse de l'API ne contient pas de fichier");
          }

        } catch (apiError) {
          console.error("Erreur lors du remplissage automatique:", apiError);
          toast.error("Échec du remplissage automatique", {
            description: "Génération du PDF standard...",
            id: "avenant-generation",
          });
        }
      }

      // Fallback : génération PDF si pas de trame ou échec
      const logoGestionbat = infoGestionbat && infoGestionbat.logo_url
        ? `<img src="${infoGestionbat.logo_url}" alt="Logo GESTIONBAT" style="max-width: 150px; max-height: 80px; object-fit: contain;" />`
        : '<p style="font-weight: bold; color: #f97316; font-size: 16pt;">GESTIONBAT</p>';

      const logoClient = chantier?.logo_client_url
        ? `<img src="${chantier.logo_client_url}" alt="Logo Client" style="max-width: 150px; max-height: 80px; object-fit: contain;" />`
        : '';

      const montantTotalTTC = avenant.montant_total_ht * (1 + tauxTVA / 100);

      const lignesDevis = devisAssocies.map((d, index) => {
        const montantTTC = d.montant_ht * (1 + tauxTVA / 100);
        return `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td>${d.numero_devis || `No.${index + 1}`}</td>
          <td>${format(new Date(d.date_devis), "dd/MM/yyyy", { locale: fr })}</td>
          <td>${d.intitule_devis}</td>
          <td style="text-align: center;">${d.type_devis}</td>
          <td style="text-align: right;">${d.montant_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
          <td style="text-align: right;">${montantTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
        </tr>
      `}).join('');

      // Calcul du nouveau montant marché avec TOUS les avenants précédents validés ET signés
      const montantMarcheBaseTTC = montantMarcheBase * (1 + tauxTVA / 100);
      const montantTotalAvenantsPrecedentsHT = avenantsPrecedents.reduce((sum, av) => sum + (av.montant_total_ht || 0), 0);
      const montantTotalAvenantsPrecedentsTTC = montantTotalAvenantsPrecedentsHT * (1 + tauxTVA / 100);
      const nouveauMontantMarcheHT = montantMarcheBase + montantTotalAvenantsPrecedentsHT + avenant.montant_total_ht;
      const nouveauMontantMarcheTTC = nouveauMontantMarcheHT * (1 + tauxTVA / 100);

      // Générer les lignes des avenants précédents (SANS ligne de sous-total)
      const lignesAvenantsPrecedents = avenantsPrecedents.length > 0 ? avenantsPrecedents.map(av => `
        <tr>
          <td>Avenant N°${av.numero}</td>
          <td style="text-align: right; font-weight: 600; color: #f97316;">${av.montant_total_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
          <td style="text-align: right; font-weight: 600; color: #f97316;">${(av.montant_total_ht * (1 + tauxTVA / 100)).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
        </tr>
      `).join('') : '';

      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Avenant N° ${avenant.numero}</title>
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
    }
    .header p {
      margin: 2px 0;
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
    .info-grid {
      display: table;
      width: 100%;
      margin-bottom: 8px;
      page-break-inside: avoid;
    }
    .info-row {
      display: table-row;
    }
    .info-label {
      display: table-cell;
      width: 30%;
      font-weight: 600;
      padding: 3px 10px 3px 0;
      vertical-align: top;
      color: #555;
      font-size: 7.5pt;
    }
    .info-value {
      display: table-cell;
      padding: 3px 0;
      vertical-align: top;
      color: #333;
      font-size: 7.5pt;
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
      padding: 5px 4px;
      font-size: 7pt;
    }
    .mentions-legales {
      margin: 12px 0;
      padding: 8px;
      background-color: #f8f9fa;
      border-left: 3px solid #f97316;
      font-size: 7pt;
      line-height: 1.4;
      page-break-inside: avoid;
    }
    .mentions-legales p {
      margin: 4px 0;
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
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">${logoClient}</div>
    <div class="header-center">
      <h1>Avenant</h1>
      <p class="numero">N° ${avenant.numero}</p>
      <p style="margin-top: 5px; font-size: 8pt; color: #666;">Date : ${format(new Date(avenant.date), "dd MMMM yyyy", { locale: fr })}</p>
    </div>
    <div class="header-right">${logoGestionbat}</div>
  </div>

  <h2 class="section-title">Informations du Chantier</h2>
  <div class="info-grid">
    <div class="info-row">
      <div class="info-label">Chantier :</div>
      <div class="info-value"><strong>${chantier?.nom || ''}</strong></div>
    </div>
    <div class="info-row">
      <div class="info-label">Adresse :</div>
      <div class="info-value">${chantier?.adresse || ''}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Maître d'Ouvrage :</div>
      <div class="info-value">
        <strong>${client?.nom || ''}</strong><br/>
        ${client?.adresse_1 || ''}<br/>
        ${client?.adresse_2 || '' ? client?.adresse_2 + '<br/>' : ''}
        ${client?.code_postal || ''} ${client?.ville || ''}
      </div>
    </div>
  </div>

  <h2 class="section-title">Entreprise</h2>
  <div class="info-grid">
    <div class="info-row">
      <div class="info-label">Raison sociale :</div>
      <div class="info-value"><strong>${entreprise?.nom || ''}</strong></div>
    </div>
    ${entreprise?.siret ? `
    <div class="info-row">
      <div class="info-label">SIRET :</div>
      <div class="info-value">${entreprise.siret}</div>
    </div>
    ` : ''}
    ${entreprise?.adresse_1 ? `
    <div class="info-row">
      <div class="info-label">Adresse :</div>
      <div class="info-value">
        ${entreprise.adresse_1}<br/>
        ${entreprise.adresse_2 ? entreprise.adresse_2 + '<br/>' : ''}
        ${entreprise.code_postal || ''} ${entreprise.ville || ''}
      </div>
    </div>
    ` : ''}
    ${marche?.numero_lot || marche?.intitule_lot ? `
    <div class="info-row">
      <div class="info-label">Lot :</div>
      <div class="info-value"><strong>${marche?.numero_lot || ''} ${marche?.numero_lot && marche?.intitule_lot ? '- ' : ''}${marche?.intitule_lot || ''}</strong></div>
    </div>
    ` : ''}
  </div>

  <h2 class="section-title">Détail des Devis Inclus</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 4%;">N°</th>
        <th style="width: 10%;">N° Devis</th>
        <th style="width: 10%;">Date</th>
        <th style="width: 38%;">Intitulé</th>
        <th style="width: 8%;">Type</th>
        <th style="width: 15%; text-align: right;">Montant HT</th>
        <th style="width: 15%; text-align: right;">Montant TTC</th>
      </tr>
    </thead>
    <tbody>
      ${lignesDevis}
      <tr class="total-row">
        <td colspan="5"><strong>MONTANT TOTAL DE L'AVENANT</strong></td>
        <td style="text-align: right;"><strong>${avenant.montant_total_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
        <td style="text-align: right;"><strong>${montantTotalTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
      </tr>
    </tbody>
  </table>

  <h2 class="section-title">Mise à jour du Montant Marché</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 60%;">Désignation</th>
        <th style="width: 20%; text-align: right;">Montant HT</th>
        <th style="width: 20%; text-align: right;">Montant TTC</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Marché de base</strong></td>
        <td style="text-align: right;">${montantMarcheBase.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
        <td style="text-align: right;">${montantMarcheBaseTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
      ${lignesAvenantsPrecedents}
      <tr>
        <td><strong>Avenant N°${avenant.numero} (actuel)</strong></td>
        <td style="text-align: right; font-weight: 600; color: #f97316;">${avenant.montant_total_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
        <td style="text-align: right; font-weight: 600; color: #f97316;">${montantTotalTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
      <tr class="total-row">
        <td><strong>NOUVEAU MONTANT MARCHÉ</strong></td>
        <td style="text-align: right;"><strong>${nouveauMontantMarcheHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
        <td style="text-align: right;"><strong>${nouveauMontantMarcheTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="mentions-legales">
    <p><strong>• Les conditions particulières et conditions générales du marché sont applicables au présent avenant.</strong></p>
    <p><strong>• Le présent avenant vaut ordre de service.</strong></p>
  </div>

  <div class="signatures">
    <div class="signature-bloc">
      <p><strong>Pour l'Entreprise</strong></p>
      <p style="margin-top: 3px;">${entreprise?.nom || ''}</p>
      <div class="signature-space"></div>
      <p style="font-style: italic; color: #666;">Signature</p>
    </div>
    <div class="signature-bloc">
      <p><strong>Pour la MOE</strong></p>
      <p style="margin-top: 3px;">${infoGestionbat?.nom_entreprise || 'GESTIONBAT'}</p>
      <div class="signature-space"></div>
      <p style="font-style: italic; color: #666;">Signature</p>
    </div>
    <div class="signature-bloc">
      <p><strong>Pour le Maître d'Ouvrage</strong></p>
      <p style="margin-top: 3px;">${client?.nom || ''}</p>
      <div class="signature-space"></div>
      <p style="font-style: italic; color: #666;">Signature</p>
    </div>
  </div>
</body>
</html>`;

      // Convertir HTML en PDF via la fonction backend AVEC FALLBACK
      try {
        toast.loading("Conversion en PDF...", {
          description: "Génération du fichier PDF en cours",
          id: "avenant-generation",
        });

        // Tentative de conversion avec timeout de 30 secondes
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await base44.functions.invoke('htmlToPdf', {
          html_content: htmlContent,
          css: ''
        });

        clearTimeout(timeoutId);

        if (response.data && response.data.success && response.data.pdf_base64) {
          // ✅ Conversion réussie - Télécharger le PDF
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
          link.download = `Avenant_${avenant.numero}_${nomChantier}_${Date.now()}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          toast.success("✅ Avenant généré !", {
            description: "Le PDF a été téléchargé avec succès",
            duration: 6000,
            id: "avenant-generation",
          });
        } else {
          throw new Error("La conversion PDF a échoué");
        }
      } catch (pdfError) {
        // ⚠️ Si la conversion PDF échoue → fallback HTML avec instructions
        console.error("Erreur conversion PDF, fallback sur HTML:", pdfError);
        
        // Ajouter des instructions pour l'utilisateur dans le HTML
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
        link.download = `Avenant_${avenant.numero}_${nomChantier}_${Date.now()}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("⚠️ Fichier HTML téléchargé", {
          description: "La conversion PDF a échoué. Ouvrez le fichier HTML et utilisez Ctrl+P pour créer le PDF.",
          duration: 8000,
          id: "avenant-generation",
        });
      }

    } catch (error) {
      console.error("Erreur lors de la génération:", error);
      toast.error("Erreur", {
        description: "Erreur lors de la génération de l'avenant",
      });
    } finally {
      setGeneratingAvenantPDF(false);
      setSelectedAvenant(null);
    }
  };

  const devisNonIntegres = devis.filter(d => d.statut !== 'integre_avenant');
  const selectedDevisData = devis.filter(d => selectedDevisIds.includes(d.id));
  const montantTotalSelection = selectedDevisData.reduce((sum, d) => sum + (d.montant_ht || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Travaux Supplémentaires & Avenants</h2>
          <p className="text-sm text-gray-600 mt-1">
            Gestion des devis et avenants
          </p>
        </div>
        <Button
          className="bg-orange-600 hover:bg-orange-700 gap-2"
          onClick={() => {
            resetForm();
            setShowDevisDialog(true);
          }}
        >
          <Plus className="w-5 h-5" />
          Nouveau devis
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="devis">Devis</TabsTrigger>
          <TabsTrigger value="avenants">Avenants</TabsTrigger>
          <TabsTrigger value="suivi">Suivi Financier</TabsTrigger>
        </TabsList>

        {/* Onglet Devis */}
        <TabsContent value="devis" className="space-y-6">
          {selectedDevisIds.length > 0 && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-blue-900">
                    {selectedDevisIds.length} devis sélectionné{selectedDevisIds.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-blue-700">
                    Montant total: {montantTotalSelection.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedDevisIds([])}
                  >
                    Annuler la sélection
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleCreateAvenant}
                  >
                    Éditer l'avenant
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {devis.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Aucun devis enregistré
              </h3>
              <p className="text-gray-500">
                Ajoutez votre premier devis pour commencer
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedDevisIds.length === devisNonIntegres.length && devisNonIntegres.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedDevisIds(devisNonIntegres.map(d => d.id));
                            } else {
                              setSelectedDevisIds([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>N° Devis</TableHead>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Intitulé</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Origine</TableHead>
                      <TableHead>Montant HT</TableHead>
                      <TableHead>N° Avenant</TableHead>
                      <TableHead>PDF</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devis.map((devisItem) => {
                      const isIntegre = devisItem.statut === 'integre_avenant';
                      const avenant = devisItem.avenant_id ? avenants.find(a => a.id === devisItem.avenant_id) : null;

                      return (
                        <TableRow
                          key={devisItem.id}
                          className={`hover:bg-gray-50 ${isIntegre ? 'bg-blue-50 opacity-70' : ''}`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedDevisIds.includes(devisItem.id)}
                              onCheckedChange={() => handleToggleDevisSelection(devisItem.id)}
                              disabled={isIntegre}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {format(new Date(devisItem.date_devis), "dd/MM/yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell>{devisItem.numero_devis || '-'}</TableCell>
                          <TableCell>{getEntrepriseName(devisItem.entreprise_id)}</TableCell>
                          <TableCell>{devisItem.intitule_devis}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{devisItem.type_devis}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{devisItem.origine_devis || 'N/A'}</TableCell>
                          <TableCell className="font-semibold text-orange-600">
                            {devisItem.montant_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                          </TableCell>
                          <TableCell>
                            {avenant ? (
                              <Button
                                variant="link"
                                className="p-0 h-auto font-medium text-blue-600 hover:underline"
                                onClick={() => navigateToAvenant(avenant.id)}
                              >
                                N°{avenant.numero}
                              </Button>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {devisItem.devis_pdf_url ? (
                              <a
                                href={devisItem.devis_pdf_url}
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
                            <Badge className={`${statutColors[devisItem.statut]} border`}>
                              {statutLabels[devisItem.statut]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(devisItem)}
                                title="Modifier"
                                disabled={isIntegre}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(devisItem)}
                                title="Supprimer"
                                disabled={isIntegre}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Onglet Avenants */}
        <TabsContent value="avenants" className="space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex gap-3 flex-wrap">
              {/* Entreprise Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <Select value={filterEntreprise} onValueChange={setFilterEntreprise}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Toutes les entreprises" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les entreprises</SelectItem>
                    {entreprisesAvecMarche.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Statut Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <Select value={filterStatut} onValueChange={setFilterStatut}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="brouillon">📝 Brouillon</SelectItem>
                    <SelectItem value="valide">✅ Validé</SelectItem>
                    <SelectItem value="signe">🔏 Signé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleCreateAvenant}
              disabled={devis.filter(d => d.statut !== 'integre_avenant').length === 0}
              className="bg-orange-600 hover:bg-orange-700 gap-2"
            >
              <Plus className="w-4 h-4" />
              Créer un avenant
            </Button>
          </div>

          {loadingAvenants ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : avenantParEntreprise.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {filterEntreprise !== "all" || filterStatut !== "all"
                  ? "Aucun avenant trouvé avec ces filtres"
                  : "Aucun avenant créé"}
              </h3>
              <p className="text-sm mt-1">
                {filterEntreprise !== "all" || filterStatut !== "all"
                  ? "Essayez de modifier vos filtres"
                  : "Créez un avenant en sélectionnant des devis dans l'onglet \"Devis\"."}
              </p>
            </Card>
          ) : (
            <Accordion
              type="multiple"
              className="space-y-4"
              value={openAccordionItems}
              onValueChange={setOpenAccordionItems}
            >
              {avenantParEntreprise.map((groupe) => (
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
                            {groupe.avenants.length} avenant{groupe.avenants.length > 1 ? 's' : ''} •
                            {groupe.avenants.filter(a => a.statut === 'valide' || a.statut === 'signe').length} validé{groupe.avenants.filter(a => a.statut === 'valide' || a.statut === 'signe').length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right mr-2">
                        <p className="text-sm text-gray-500">Montant total validé</p>
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
                    <div className="border-t space-y-4 p-4">
                      {groupe.avenants.map(avenant => {
                        const devisAvenant = devis.filter(d => avenant.devis_ids?.includes(d.id));
                        const isHighlighted = highlightedAvenantId === avenant.id;

                        return (
                          <Card
                            key={avenant.id}
                            id={`avenant-${avenant.id}`}
                            className={`border-l-4 border-l-orange-500 transition-all duration-500 ${
                              isHighlighted ? 'ring-4 ring-orange-200 shadow-xl' : ''
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-bold text-lg">Avenant N°{avenant.numero}</h3>
                                    <Badge className={`${getStatutColor(avenant.statut)} border`}>
                                      {getStatutLabel(avenant.statut)}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-1">
                                    <strong>Date:</strong> {format(new Date(avenant.date), "dd/MM/yyyy", { locale: fr })}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    <strong>Montant total HT:</strong>{" "}
                                    <span className="text-orange-600 font-semibold">
                                      {avenant.montant_total_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                    </span>
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleEditAvenant(avenant)}
                                    title="Générer l'avenant"
                                    disabled={generatingAvenantPDF}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDeleteAvenant(avenant.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Gestion du statut */}
                              <div className="mb-3 pb-3 border-b">
                                <Label className="text-xs text-gray-500 mb-2 block">Changer le statut</Label>
                                <Select
                                  value={avenant.statut}
                                  onValueChange={(value) => handleChangeStatutAvenant(avenant.id, value)}
                                >
                                  <SelectTrigger className="w-48">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="brouillon">📝 Brouillon</SelectItem>
                                    <SelectItem value="valide">✅ Validé</SelectItem>
                                    <SelectItem value="signe">🔏 Signé</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Import avenant signé */}
                              <div className="mb-3 pb-3 border-b">
                                <Label className="text-xs text-gray-500 mb-2 block">Avenant signé</Label>
                                {avenant.avenant_signe_url ? (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(avenant.avenant_signe_url, '_blank')}
                                      className="gap-2"
                                    >
                                      <FileCheck className="w-4 h-4 text-green-600" />
                                      Voir l'avenant signé
                                    </Button>
                                    <label className="cursor-pointer">
                                      <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => handleUploadAvenantSigne(avenant.id, e)}
                                        className="hidden"
                                      />
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                        type="button"
                                        onClick={(e) => e.currentTarget.previousSibling.click()}
                                      >
                                        <Upload className="w-4 h-4" />
                                        Remplacer
                                      </Button>
                                    </label>
                                  </div>
                                ) : (
                                  <label className="cursor-pointer">
                                    <input
                                      type="file"
                                      accept=".pdf"
                                      onChange={(e) => handleUploadAvenantSigne(avenant.id, e)}
                                      className="hidden"
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-2"
                                      type="button"
                                      onClick={(e) => e.currentTarget.previousSibling.click()}
                                    >
                                      <Upload className="w-4 h-4" />
                                      Importer l'avenant signé (PDF)
                                    </Button>
                                  </label>
                                )}
                              </div>

                              {/* Liste des devis inclus */}
                              {devisAvenant.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-2">
                                    Devis inclus dans cet avenant:
                                  </p>
                                  <div className="space-y-1">
                                    {devisAvenant.map(d => (
                                      <div key={d.id} className="text-xs bg-gray-50 p-2 rounded flex justify-between items-center">
                                        <Button
                                          variant="link"
                                          className="p-0 h-auto text-xs font-medium text-blue-600 hover:underline text-left"
                                          onClick={() => handleEdit(d)}
                                        >
                                          <strong>{d.numero_devis || 'N/A'}</strong> - {d.intitule_devis}
                                        </Button>
                                        <span className="text-orange-600 font-semibold">
                                          {d.montant_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>

        {/* Onglet Suivi Financier */}
        <TabsContent value="suivi" className="space-y-6">
          <div className="flex justify-end">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleExportSuiviFinancier}
            >
              <Download className="w-4 h-4" />
              Exporter en PDF
            </Button>
          </div>

          {suiviFinancier.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Aucune donnée disponible
              </h3>
              <p className="text-gray-500">
                Ajoutez des marchés et des avenants pour voir le suivi financier
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Entreprise</TableHead>
                      <TableHead className="text-right">Marché Initial HT</TableHead>
                      <TableHead>Avenants</TableHead>
                      <TableHead className="text-right">Montant Final HT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suiviFinancier.map((item, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="font-semibold">{item.entreprise?.nom || 'Non spécifié'}</TableCell>
                        <TableCell className="text-right">
                          {item.montant_marche_initial.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </TableCell>
                        <TableCell>
                          {item.avenants.length === 0 ? (
                            <span className="text-gray-400 text-sm">Aucun avenant</span>
                          ) : (
                            <div className="space-y-1">
                              {item.avenants.map((av, idx) => {
                                const avenantComplet = avenants.find(a => a.id === av.id); // Find the full avenant object by its ID
                                return (
                                  <div key={idx} className="text-sm">
                                    <Button
                                      variant="link"
                                      className="p-0 h-auto font-medium text-blue-600 hover:underline"
                                      onClick={() => avenantComplet && navigateToAvenant(avenantComplet.id)}
                                      disabled={!avenantComplet}
                                    >
                                      N°{av.numero}
                                    </Button>
                                    : {av.montant.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                  </div>
                                );
                              })}
                              {item.avenants.length > 0 && (
                                <div className="text-sm font-semibold text-blue-600 pt-1 border-t">
                                  Total: {item.montant_total_avenants.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-orange-600">
                          {item.montant_total_final.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-orange-50 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right">
                        {suiviFinancier.reduce((sum, item) => sum + item.montant_marche_initial, 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </TableCell>
                      <TableCell className="text-right">
                        {suiviFinancier.reduce((sum, item) => sum + item.montant_total_avenants, 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </TableCell>
                      <TableCell className="text-right text-orange-600">
                        {suiviFinancier.reduce((sum, item) => sum + item.montant_total_final, 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Nouveau/Modifier Devis */}
      <Dialog open={showDevisDialog} onOpenChange={(open) => {
        setShowDevisDialog(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDevis ? "Modifier le devis" : "Nouveau devis"}
            </DialogTitle>
            <DialogDescription>
              Saisissez les informations du devis
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} id="devis-form">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="entreprise_id">Entreprise *</Label>
                <Select
                  value={formData.entreprise_id}
                  onValueChange={(value) => {
                    console.log("Entreprise sélectionnée:", value);
                    setFormData({ ...formData, entreprise_id: value });
                  }}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_devis">Numéro du devis</Label>
                  <Input
                    id="numero_devis"
                    type="text"
                    value={formData.numero_devis}
                    onChange={(e) => setFormData({ ...formData, numero_devis: e.target.value })}
                    placeholder="Ex: DEV-2024-001, 123, A1B2..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Numéro du devis fourni par l'entreprise
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_devis">Date du devis *</Label>
                  <Input
                    id="date_devis"
                    type="date"
                    value={formData.date_devis}
                    onChange={(e) => setFormData({ ...formData, date_devis: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="intitule_devis">Intitulé du devis *</Label>
                <Input
                  id="intitule_devis"
                  value={formData.intitule_devis}
                  onChange={(e) => setFormData({ ...formData, intitule_devis: e.target.value })}
                  placeholder="Description des travaux"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="montant_ht">Montant HT (€) *</Label>
                  <Input
                    id="montant_ht"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.montant_ht}
                    onChange={(e) => setFormData({ ...formData, montant_ht: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type_devis">Type de devis *</Label>
                  <Select
                    value={formData.type_devis}
                    onValueChange={(value) => setFormData({ ...formData, type_devis: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TMA">TMA (Travaux Modificatifs Architecte)</SelectItem>
                      <SelectItem value="TS">TS (Travaux Supplémentaires)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="origine_devis">Origine du devis</Label>
                <Select
                  value={formData.origine_devis}
                  onValueChange={(value) => setFormData({ ...formData, origine_devis: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner l'origine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Aucune</SelectItem>
                    <SelectItem value="Aléas chantier">Aléas chantier</SelectItem>
                    <SelectItem value="Demande MOA">Demande MOA</SelectItem>
                    <SelectItem value="Anomalie conception">Anomalie conception</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Devis PDF</Label>
                {formData.devis_pdf_url ? (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <FileText className="w-5 h-5 text-orange-600" />
                    <a
                      href={formData.devis_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm flex-1 truncate text-blue-600 hover:underline"
                    >
                      {getFileName(formData.devis_pdf_url)}
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFormData({ ...formData, devis_pdf_url: "" })}
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
                  setShowDevisDialog(false);
                  resetForm();
                }}
                disabled={createDevisMutation.isPending || updateDevisMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700"
                disabled={createDevisMutation.isPending || updateDevisMutation.isPending || uploadingPDF}
              >
                {createDevisMutation.isPending || updateDevisMutation.isPending
                  ? "Enregistrement..."
                  : selectedDevis ? "Mettre à jour" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmation Suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce devis ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDevisToDelete(null)}>
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

      {/* Dialog Confirmation Création Avenant */}
      <AlertDialog open={showAvenantDialog} onOpenChange={setShowAvenantDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Créer un avenant</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez créer un avenant à partir de {selectedDevisIds.length} devis sélectionné{selectedDevisIds.length > 1 ? 's' : ''}.
              <br /><br />
              <strong>Montant total:</strong> {montantTotalSelection.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT
              <br />
              <strong>Entreprise:</strong> {selectedDevisData.length > 0 ? getEntrepriseName(selectedDevisData[0].entreprise_id) : ''}
              <br /><br />
              Les devis seront marqués comme "Intégrés à avenant" et ne pourront plus être modifiés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowAvenantDialog(false)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCreateAvenant}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={createAvenantMutation.isPending}
            >
              {createAvenantMutation.isPending ? "Création..." : "Créer l'avenant"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Confirmation Suppression Avenant */}
      <AlertDialog open={showDeleteAvenantDialog} onOpenChange={setShowDeleteAvenantDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'avenant N°{avenantToDelete?.numero} ?
              <br /><br />
              Les devis associés seront remis en statut "Brouillon" et pourront à nouveau être modifiés ou inclus dans un autre avenant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setAvenantToDelete(null);
              setShowDeleteAvenantDialog(false);
            }}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAvenant}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteAvenantMutation.isPending}
            >
              {deleteAvenantMutation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
