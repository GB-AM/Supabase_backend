
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, X, Upload, FileText, Trash2, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner"; // Changed from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const statutColors = {
  en_cours: "bg-blue-100 text-blue-800 border-blue-200",
  termine: "bg-green-100 text-green-800 border-green-200",
  suspendu: "bg-red-100 text-red-800 border-red-200"
};

const statutLabels = {
  en_cours: "En cours",
  termine: "Terminé",
  suspendu: "Suspendu"
};

export default function SousTraitanceTab({ chantierId }) {
  // ⚠️ COMPOSANT FIGÉ v2.7.6 FINAL - NE PAS MODIFIER SANS VALIDATION
  // - Tous les toasts sont standardisés avec toast() de sonner (pas useToast)
  // ========================================================================

  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSousTraitance, setSelectedSousTraitance] = useState(null);
  const [sousTraitanceToDelete, setSousTraitanceToDelete] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  
  const [formData, setFormData] = useState({
    entreprise_principale_id: "",
    entreprise_sous_traitant_id: "",
    date: "",
    numero_lot: "",
    intitule_lot: "",
    travaux_effectues: "",
    montant: "",
    paiement_direct: false,
    statut: "en_cours",
    documents: [],
    notes: ""
  });

  const queryClient = useQueryClient();
  // Removed: const { toast } = useToast();

  const { data: sousTraitances, isLoading } = useQuery({
    queryKey: ['sous-traitance', chantierId],
    queryFn: async () => {
      const allSousTraitances = await base44.entities.SousTraitance.list('-date');
      return allSousTraitances.filter(s => s.chantier_id === chantierId);
    },
    initialData: [],
  });

  const { data: entreprises } = useQuery({
    queryKey: ['entreprises'],
    queryFn: () => base44.entities.Entreprise.list('nom'),
    initialData: [],
  });

  const { data: marches } = useQuery({
    queryKey: ['marches', chantierId],
    queryFn: async () => {
      const allMarches = await base44.entities.MarcheEntreprise.list();
      return allMarches.filter(m => m.chantier_id === chantierId);
    },
    initialData: [],
  });

  // ⚠️ TOASTS FIGÉS v2.7.6 - Tous standardisés avec toast() de sonner
  // ====================================================================

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SousTraitance.create({ ...data, chantier_id: chantierId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sous-traitance'] });
      setShowDialog(false);
      resetForm();
      toast.success("Sous-traitance créée", {
        description: "La sous-traitance a été créée avec succès",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SousTraitance.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sous-traitance'] });
      setShowDialog(false);
      resetForm();
      toast.success("Sous-traitance mise à jour", {
        description: "La sous-traitance a été mise à jour avec succès",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SousTraitance.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sous-traitance'] });
      toast.success("Sous-traitance supprimée", {
        description: "La sous-traitance a été supprimée avec succès",
      });
    },
  });

  // ⚠️ FIN SECTION TOASTS FIGÉS
  // ====================================================================

  const resetForm = () => {
    setFormData({
      entreprise_principale_id: "",
      entreprise_sous_traitant_id: "",
      date: "",
      numero_lot: "",
      intitule_lot: "",
      travaux_effectues: "",
      montant: "",
      paiement_direct: false,
      statut: "en_cours",
      documents: [],
      notes: ""
    });
    setSelectedSousTraitance(null);
  };

  const handleEdit = (st) => {
    setSelectedSousTraitance(st);
    setFormData({
      entreprise_principale_id: st.entreprise_principale_id || "",
      entreprise_sous_traitant_id: st.entreprise_sous_traitant_id || "",
      date: st.date || "",
      numero_lot: st.numero_lot || "",
      intitule_lot: st.intitule_lot || "",
      travaux_effectues: st.travaux_effectues || "",
      montant: st.montant ? st.montant.toString() : "",
      paiement_direct: st.paiement_direct || false,
      statut: st.statut || "en_cours",
      documents: st.documents || [],
      notes: st.notes || ""
    });
    setShowDialog(true);
  };

  const handleDelete = (st) => {
    setSousTraitanceToDelete(st);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (sousTraitanceToDelete) {
      deleteMutation.mutate(sousTraitanceToDelete.id);
      setShowDeleteDialog(false);
      setSousTraitanceToDelete(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSubmit = {
      entreprise_principale_id: formData.entreprise_principale_id,
      entreprise_sous_traitant_id: formData.entreprise_sous_traitant_id,
      date: formData.date,
      numero_lot: formData.numero_lot,
      intitule_lot: formData.intitule_lot,
      travaux_effectues: formData.travaux_effectues,
      montant: parseFloat(formData.montant) || 0,
      paiement_direct: formData.paiement_direct,
      statut: formData.statut,
      documents: formData.documents,
      notes: formData.notes
    };

    if (selectedSousTraitance) {
      updateMutation.mutate({ id: selectedSousTraitance.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const handleEntreprisePrincipaleChange = (entrepriseId) => {
    setFormData({ ...formData, entreprise_principale_id: entrepriseId });
    
    // Trouver le marché correspondant pour pré-remplir le lot
    const marche = marches.find(m => m.entreprise_id === entrepriseId);
    if (marche) {
      setFormData(prevData => ({
        ...prevData,
        entreprise_principale_id: entrepriseId,
        numero_lot: marche.numero_lot || "",
        intitule_lot: marche.intitule_lot || ""
      }));
    } else {
      setFormData(prevData => ({
        ...prevData,
        entreprise_principale_id: entrepriseId,
        numero_lot: "",
        intitule_lot: ""
      }));
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newDoc = {
        nom: file.name,
        url: file_url
      };
      setFormData({
        ...formData,
        documents: [...formData.documents, newDoc]
      });
      toast.success("Document téléchargé", {
        description: "Le document a été ajouté avec succès",
      });
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
      toast.error("Erreur", {
        description: "Erreur lors du téléchargement du document",
      });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRemoveDocument = (index) => {
    setFormData({
      ...formData,
      documents: formData.documents.filter((_, i) => i !== index)
    });
  };

  const getEntrepriseName = (entrepriseId) => {
    const entreprise = entreprises.find(e => e.id === entrepriseId);
    return entreprise?.nom || "Non spécifié";
  };

  const getFileName = (url) => {
    if (!url) return "";
    return url.split('/').pop().split('?')[0];
  };

  // Filtrer les entreprises qui ont des marchés
  const entreprisesAvecMarche = entreprises.filter(e => 
    marches.some(m => m.entreprise_id === e.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Sous-traitance</h2>
        <Button 
          className="bg-orange-600 hover:bg-orange-700 gap-2"
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
        >
          <Plus className="w-5 h-5" />
          Nouveau sous-traitant
        </Button>
      </div>

      {sousTraitances.length === 0 ? (
        <Card className="p-12 text-center">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Aucune sous-traitance enregistrée
          </h3>
          <p className="text-gray-500">
            Ajoutez des contrats de sous-traitance pour ce chantier
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Date</TableHead>
                  <TableHead>N° Lot</TableHead>
                  <TableHead>Intitulé Lot</TableHead>
                  <TableHead>Entreprise principale</TableHead>
                  <TableHead>Sous-traitant</TableHead>
                  <TableHead>Travaux</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Paiement Direct</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sousTraitances.map((st) => (
                  <TableRow key={st.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {format(new Date(st.date), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell>{st.numero_lot || "-"}</TableCell>
                    <TableCell>{st.intitule_lot || "-"}</TableCell>
                    <TableCell>{getEntrepriseName(st.entreprise_principale_id)}</TableCell>
                    <TableCell className="font-medium text-purple-700">
                      {getEntrepriseName(st.entreprise_sous_traitant_id)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{st.travaux_effectues}</TableCell>
                    <TableCell className="font-semibold text-orange-600">
                      {st.montant.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </TableCell>
                    <TableCell>
                      <Badge variant={st.paiement_direct ? "default" : "outline"}>
                        {st.paiement_direct ? "Oui" : "Non"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statutColors[st.statut]} border`}>
                        {statutLabels[st.statut]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEdit(st)}
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(st)}
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
      )}

      {/* Dialog Nouveau/Modifier Sous-traitance */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSousTraitance ? "Modifier la sous-traitance" : "Nouveau sous-traitant"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entreprise_principale_id">Titulaire du marché (Entreprise principale) *</Label>
                  <Select
                    value={formData.entreprise_principale_id}
                    onValueChange={handleEntreprisePrincipaleChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner l'entreprise principale" />
                    </SelectTrigger>
                    <SelectContent>
                      {entreprisesAvecMarche.map(entreprise => {
                        const marche = marches.find(m => m.entreprise_id === entreprise.id);
                        return (
                          <SelectItem key={entreprise.id} value={entreprise.id}>
                            {entreprise.nom} {marche?.numero_lot ? `- Lot ${marche.numero_lot}` : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entreprise_sous_traitant_id">Sous-traitant *</Label>
                  <Select
                    value={formData.entreprise_sous_traitant_id}
                    onValueChange={(value) => setFormData({ ...formData, entreprise_sous_traitant_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le sous-traitant" />
                    </SelectTrigger>
                    <SelectContent>
                      {entreprises.map(entreprise => (
                        <SelectItem key={entreprise.id} value={entreprise.id}>
                          {entreprise.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero_lot">N° du lot</Label>
                  <Input
                    id="numero_lot"
                    value={formData.numero_lot}
                    onChange={(e) => setFormData({ ...formData, numero_lot: e.target.value })}
                    placeholder="Ex: 01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="intitule_lot">Intitulé du lot</Label>
                  <Input
                    id="intitule_lot"
                    value={formData.intitule_lot}
                    onChange={(e) => setFormData({ ...formData, intitule_lot: e.target.value })}
                    placeholder="Ex: Gros œuvre"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="travaux_effectues">Travaux effectués *</Label>
                <Textarea
                  id="travaux_effectues"
                  value={formData.travaux_effectues}
                  onChange={(e) => setFormData({ ...formData, travaux_effectues: e.target.value })}
                  placeholder="Description des travaux effectués par le sous-traitant..."
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="montant">Montant du marché (€) *</Label>
                  <Input
                    id="montant"
                    type="number"
                    step="0.01"
                    value={formData.montant}
                    onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="statut">Statut</Label>
                  <Select
                    value={formData.statut}
                    onValueChange={(value) => setFormData({ ...formData, statut: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="termine">Terminé</SelectItem>
                      <SelectItem value="suspendu">Suspendu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                <Checkbox
                  id="paiement_direct"
                  checked={formData.paiement_direct}
                  onCheckedChange={(checked) => setFormData({ ...formData, paiement_direct: checked })}
                />
                <Label 
                  htmlFor="paiement_direct" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Paiement direct par maître d'ouvrage
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Documents du sous-traitant</Label>
                {formData.documents.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {formData.documents.map((doc, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <FileText className="w-5 h-5 text-orange-600" />
                        <a 
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm flex-1 truncate text-blue-600 hover:underline"
                        >
                          {doc.nom}
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveDocument(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleDocumentUpload}
                    disabled={uploadingDoc}
                    className="cursor-pointer"
                  />
                  {uploadingDoc && <p className="text-xs text-gray-500 mt-1">Téléchargement...</p>}
                </div>
                <p className="text-xs text-gray-500">
                  PDF, Word, Images - Vous pouvez ajouter plusieurs documents
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes supplémentaires..."
                  rows={2}
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
                disabled={createMutation.isPending || updateMutation.isPending || uploadingDoc}
              >
                {createMutation.isPending || updateMutation.isPending 
                  ? "Enregistrement..." 
                  : selectedSousTraitance ? "Mettre à jour" : "Créer"}
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
              Êtes-vous sûr de vouloir supprimer cette sous-traitance ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSousTraitanceToDelete(null)}>
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
