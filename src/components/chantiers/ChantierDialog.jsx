
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, FileText, Image, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";

const TAUX_TVA_OPTIONS = [5.5, 10, 20];
const BASE_PENALITE_OPTIONS = ["Jour", "Marché", "Logement"];

export default function ChantierDialog({ open, onOpenChange, chantier, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    nom: "",
    client_id: "",
    adresse: "",
    date_debut: "",
    date_fin_prevue: "",
    budget_previsionnel: "",
    statut: "en_preparation",
    description: "",
    membres_equipe_ids: [],
    partenaires: [],
    penalites: [],
    taux_tva: [],
    trame_marches_url: "",
    trame_avenants_url: "",
    trame_certificats_url: "",
    logo_client_url: ""
  });

  const [uploading, setUploading] = useState({
    marches: false,
    avenants: false,
    certificats: false,
    logo: false
  });

  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('nom'),
    initialData: [],
  });

  const { data: membresEquipe, isLoading: loadingMembres } = useQuery({
    queryKey: ['membres-equipe'],
    queryFn: () => base44.entities.MembreEquipe.list('nom'),
    initialData: [],
  });

  const { data: partenaires, isLoading: loadingPartenaires } = useQuery({
    queryKey: ['partenaires'],
    queryFn: () => base44.entities.Partenaire.list('nom'),
    initialData: [],
  });

  useEffect(() => {
    if (open) { // Only update form data when dialog opens or chantier changes
      if (chantier) {
        // Lors de l'édition, garder le statut actuel sans le recalculer
        setFormData({
          nom: chantier.nom || "",
          client_id: chantier.client_id || "",
          adresse: chantier.adresse || "",
          date_debut: chantier.date_debut || "",
          date_fin_prevue: chantier.date_fin_prevue || "",
          budget_previsionnel: chantier.budget_previsionnel ? chantier.budget_previsionnel.toString() : "",
          statut: chantier.statut || "en_preparation",
          description: chantier.description || "",
          membres_equipe_ids: chantier.membres_equipe_ids || [],
          partenaires: chantier.partenaires || [],
          penalites: chantier.penalites || [],
          taux_tva: chantier.taux_tva || [],
          trame_marches_url: chantier.trame_marches_url || "",
          trame_avenants_url: chantier.trame_avenants_url || "",
          trame_certificats_url: chantier.trame_certificats_url || "",
          logo_client_url: chantier.logo_client_url || ""
        });
      } else {
        setFormData({
          nom: "",
          client_id: clients.length > 0 ? clients[0].id : "",
          adresse: "",
          date_debut: "",
          date_fin_prevue: "",
          budget_previsionnel: "",
          statut: "en_preparation",
          description: "",
          membres_equipe_ids: [],
          partenaires: [],
          penalites: [],
          taux_tva: [],
          trame_marches_url: "",
          trame_avenants_url: "",
          trame_certificats_url: "",
          logo_client_url: ""
        });
      }
    }
  }, [chantier, open, clients]);

  // Fonction pour calculer automatiquement le statut en fonction de la date de début
  const calculateStatut = (dateDebut) => {
    if (!dateDebut) return "en_preparation";
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(dateDebut);
    startDate.setHours(0, 0, 0, 0);
    
    if (startDate <= today) {
      return "en_cours";
    } else {
      return "en_preparation";
    }
  };

  // Gérer le changement de date de début
  const handleDateDebutChange = (newDate) => {
    const newStatut = calculateStatut(newDate);
    setFormData((prevFormData) => ({
      ...prevFormData,
      date_debut: newDate,
      statut: newStatut,
    }));
  };

  const handleMembreToggle = (membreId) => {
    const currentMembres = formData.membres_equipe_ids || [];
    if (currentMembres.includes(membreId)) {
      setFormData({
        ...formData,
        membres_equipe_ids: currentMembres.filter(id => id !== membreId)
      });
    } else {
      if (currentMembres.length < 4) {
        setFormData({
          ...formData,
          membres_equipe_ids: [...currentMembres, membreId]
        });
      }
    }
  };

  const handleAddPartenaire = () => {
    if (partenaires.length > 0) {
      setFormData({
        ...formData,
        partenaires: [
          ...formData.partenaires,
          {
            partenaire_id: partenaires[0].id,
            role: ""
          }
        ]
      });
    }
  };

  const handleRemovePartenaire = (index) => {
    setFormData({
      ...formData,
      partenaires: formData.partenaires.filter((_, i) => i !== index)
    });
  };

  const handlePartenaireChange = (index, field, value) => {
    const newPartenaires = [...formData.partenaires];
    newPartenaires[index] = {
      ...newPartenaires[index],
      [field]: value
    };
    setFormData({ ...formData, partenaires: newPartenaires });
  };

  const handleAddPenalite = () => {
    setFormData({
      ...formData,
      penalites: [
        ...formData.penalites,
        {
          type_penalite: "",
          base: "Jour",
          valeur: "",
          valeur_minimum: ""
        }
      ]
    });
  };

  const handleRemovePenalite = (index) => {
    setFormData({
      ...formData,
      penalites: formData.penalites.filter((_, i) => i !== index)
    });
  };

  const handlePenaliteChange = (index, field, value) => {
    const newPenalites = [...formData.penalites];
    newPenalites[index] = {
      ...newPenalites[index],
      [field]: value
    };
    setFormData({ ...formData, penalites: newPenalites });
  };

  const handleAddTauxTVA = (taux) => {
    if (formData.taux_tva.length < 2 && !formData.taux_tva.includes(taux)) {
      setFormData({
        ...formData,
        taux_tva: [...formData.taux_tva, taux]
      });
    }
  };

  const handleRemoveTauxTVA = (index) => {
    setFormData({
      ...formData,
      taux_tva: formData.taux_tva.filter((_, i) => i !== index)
    });
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadKey = {
      trame_marches_url: 'marches',
      trame_avenants_url: 'avenants',
      trame_certificats_url: 'certificats',
      logo_client_url: 'logo'
    }[field];

    setUploading({ ...uploading, [uploadKey]: true });

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, [field]: file_url });
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
    } finally {
      setUploading({ ...uploading, [uploadKey]: false });
    }
  };

  const handleRemoveFile = (field) => {
    setFormData({ ...formData, [field]: "" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSubmit = {
      nom: formData.nom,
      client_id: formData.client_id,
      adresse: formData.adresse,
      date_debut: formData.date_debut,
      date_fin_prevue: formData.date_fin_prevue,
      statut: formData.statut,
      description: formData.description,
      membres_equipe_ids: formData.membres_equipe_ids || [],
      partenaires: formData.partenaires || [],
      penalites: formData.penalites.map(p => ({
        type_penalite: p.type_penalite,
        base: p.base,
        valeur: parseFloat(p.valeur) || 0,
        valeur_minimum: parseFloat(p.valeur_minimum) || 0
      })),
      taux_tva: formData.taux_tva || [],
      trame_marches_url: formData.trame_marches_url || "",
      trame_avenants_url: formData.trame_avenants_url || "",
      trame_certificats_url: formData.trame_certificats_url || "",
      logo_client_url: formData.logo_client_url || ""
    };
    
    if (formData.budget_previsionnel && formData.budget_previsionnel !== "") {
      dataToSubmit.budget_previsionnel = parseFloat(formData.budget_previsionnel) || 0;
    }
    
    onSubmit(dataToSubmit);
  };

  const getFileName = (url) => {
    if (!url) return "";
    return url.split('/').pop().split('?')[0];
  };

  const resetForm = () => {
    setFormData({
      nom: "",
      client_id: "", 
      adresse: "",
      date_debut: "",
      date_fin_prevue: "",
      budget_previsionnel: "",
      statut: "en_preparation",
      description: "",
      membres_equipe_ids: [],
      partenaires: [],
      penalites: [],
      taux_tva: [],
      trame_marches_url: "",
      trame_avenants_url: "",
      trame_certificats_url: "",
      logo_client_url: ""
    });
    setUploading({
      marches: false,
      avenants: false,
      certificats: false,
      logo: false
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {chantier ? "Modifier le chantier" : "Nouveau chantier"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom du chantier *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Ex: Construction immeuble ABC"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_id">Client *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Input
                id="adresse"
                value={formData.adresse}
                onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                placeholder="Adresse du chantier"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_debut">Date de début</Label>
                <Input
                  id="date_debut"
                  type="date"
                  value={formData.date_debut}
                  onChange={(e) => handleDateDebutChange(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Le statut sera automatiquement mis à jour selon cette date
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_fin_prevue">Date de fin prévue</Label>
                <Input
                  id="date_fin_prevue"
                  type="date"
                  value={formData.date_fin_prevue}
                  onChange={(e) => setFormData({ ...formData, date_fin_prevue: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget_previsionnel">Budget prévisionnel (€)</Label>
                <Input
                  id="budget_previsionnel"
                  type="number"
                  step="0.01"
                  value={formData.budget_previsionnel}
                  onChange={(e) => setFormData({ ...formData, budget_previsionnel: e.target.value })}
                  placeholder="0.00"
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
                    <SelectItem value="en_preparation">En préparation</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="termine">Terminé</SelectItem>
                    <SelectItem value="suspendu">Suspendu</SelectItem>
                  </SelectContent>
                </Select>
                {formData.date_debut && (
                  <p className="text-xs text-gray-500">
                    {calculateStatut(formData.date_debut) === "en_cours" 
                      ? "Statut recommandé : En cours (date de début atteinte)" 
                      : "Statut recommandé : En préparation"}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Taux de TVA (max 2 taux)</Label>
              <div className="flex flex-wrap gap-2">
                {formData.taux_tva.map((taux, index) => (
                  <div key={index} className="flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-lg">
                    <span className="font-medium">{taux}%</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTauxTVA(index)}
                      className="hover:bg-orange-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              {formData.taux_tva.length < 2 && (
                <div className="flex gap-2">
                  {TAUX_TVA_OPTIONS.filter(t => !formData.taux_tva.includes(t)).map(taux => (
                    <Button
                      key={taux}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTauxTVA(taux)}
                    >
                      {taux}%
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du projet..."
                rows={3}
              />
            </div>

            <div className="space-y-3 border-t pt-4">
              <Label>Suivi par (max 4 personnes)</Label>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                {membresEquipe.map((membre) => (
                  <div key={membre.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`membre-${membre.id}`}
                      checked={(formData.membres_equipe_ids || []).includes(membre.id)}
                      onCheckedChange={() => handleMembreToggle(membre.id)}
                      disabled={(formData.membres_equipe_ids || []).length >= 4 && !(formData.membres_equipe_ids || []).includes(membre.id)}
                    />
                    <Label 
                      htmlFor={`membre-${membre.id}`} 
                      className="cursor-pointer flex-1 font-normal"
                    >
                      {membre.civilite} {membre.prenom} {membre.nom}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                {(formData.membres_equipe_ids || []).length}/4 personnes sélectionnées
              </p>
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Partenaires</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPartenaire}
                  disabled={partenaires.length === 0}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un partenaire
                </Button>
              </div>
              
              {formData.partenaires.length > 0 && (
                <div className="space-y-3">
                  {formData.partenaires.map((partenaire, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex gap-4 items-start">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Partenaire</Label>
                            <Select
                              value={partenaire.partenaire_id}
                              onValueChange={(value) => handlePartenaireChange(index, 'partenaire_id', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {partenaires.map(p => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.nom}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Rôle</Label>
                            <Input
                              value={partenaire.role}
                              onChange={(e) => handlePartenaireChange(index, 'role', e.target.value)}
                              placeholder="Ex: Architecte, Bureau d'études..."
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePartenaire(index)}
                          className="mt-7"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Section Pénalités */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Pénalités</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPenalite}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter une pénalité
                </Button>
              </div>
              
              {formData.penalites.length > 0 && (
                <div className="space-y-3">
                  {formData.penalites.map((penalite, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex gap-4 items-start">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div className="space-y-2 col-span-2">
                            <Label>Type de pénalité</Label>
                            <Input
                              value={penalite.type_penalite}
                              onChange={(e) => handlePenaliteChange(index, 'type_penalite', e.target.value)}
                              placeholder="Ex: Retard de livraison, Non-conformité..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Base</Label>
                            <Select
                              value={penalite.base}
                              onValueChange={(value) => handlePenaliteChange(index, 'base', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {BASE_PENALITE_OPTIONS.map(base => (
                                  <SelectItem key={base} value={base}>
                                    {base}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Valeur (€)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={penalite.valeur}
                              onChange={(e) => handlePenaliteChange(index, 'valeur', e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="space-y-2 col-span-2">
                            <Label>Valeur minimum (€)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={penalite.valeur_minimum}
                              onChange={(e) => handlePenaliteChange(index, 'valeur_minimum', e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePenalite(index)}
                          className="mt-7"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-gray-900">Documents et Trames</h3>
              
              <div className="space-y-2">
                <Label>Trame Marchés (Word, Excel ou PDF)</Label>
                {formData.trame_marches_url ? (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <FileText className="w-5 h-5 text-orange-600" />
                    <span className="text-sm flex-1 truncate">{getFileName(formData.trame_marches_url)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFile('trame_marches_url')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      type="file"
                      accept=".doc,.docx,.xls,.xlsx,.pdf"
                      onChange={(e) => handleFileUpload(e, 'trame_marches_url')}
                      disabled={uploading.marches}
                      className="cursor-pointer"
                    />
                    {uploading.marches && <p className="text-xs text-gray-500 mt-1">Téléchargement...</p>}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Trame Avenants (Word, Excel ou PDF)</Label>
                {formData.trame_avenants_url ? (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <FileText className="w-5 h-5 text-orange-600" />
                    <span className="text-sm flex-1 truncate">{getFileName(formData.trame_avenants_url)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFile('trame_avenants_url')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      type="file"
                      accept=".doc,.docx,.xls,.xlsx,.pdf"
                      onChange={(e) => handleFileUpload(e, 'trame_avenants_url')}
                      disabled={uploading.avenants}
                      className="cursor-pointer"
                    />
                    {uploading.avenants && <p className="text-xs text-gray-500 mt-1">Téléchargement...</p>}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Trame Certificats de paiement (Word, Excel ou PDF)</Label>
                {formData.trame_certificats_url ? (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <FileText className="w-5 h-5 text-orange-600" />
                    <span className="text-sm flex-1 truncate">{getFileName(formData.trame_certificats_url)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFile('trame_certificats_url')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      type="file"
                      accept=".doc,.docx,.xls,.xlsx,.pdf"
                      onChange={(e) => handleFileUpload(e, 'trame_certificats_url')}
                      disabled={uploading.certificats}
                      className="cursor-pointer"
                    />
                    {uploading.certificats && <p className="text-xs text-gray-500 mt-1">Téléchargement...</p>}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Logo Client (PNG, JPG ou SVG)</Label>
                {formData.logo_client_url ? (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Image className="w-5 h-5 text-orange-600" />
                    <span className="text-sm flex-1 truncate">{getFileName(formData.logo_client_url)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFile('logo_client_url')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      type="file"
                      accept=".png,.jpg,.jpeg,.svg"
                      onChange={(e) => handleFileUpload(e, 'logo_client_url')}
                      disabled={uploading.logo}
                      className="cursor-pointer"
                    />
                    {uploading.logo && <p className="text-xs text-gray-500 mt-1">Téléchargement...</p>}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              className="bg-orange-600 hover:bg-orange-700"
              disabled={isLoading || loadingClients || loadingMembres || loadingPartenaires || Object.values(uploading).some(v => v)}
            >
              {isLoading ? "Enregistrement..." : chantier ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
