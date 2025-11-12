// ⚠️ COMPOSANT FIGÉ - Dialog de création/modification de marché
// Ce composant gère le formulaire complet pour créer ou modifier un marché
// NE PAS MODIFIER sans validation

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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Upload, FileText, X } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function MarcheDialog({ open, onOpenChange, marche, chantiers, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    chantier_id: "",
    entreprise_id: "",
    date: new Date().toISOString().split('T')[0],
    numero_lot: "",
    intitule_lot: "",
    contact_civilite: "Monsieur",
    contact_nom: "",
    contact_email: "",
    contact_telephone: "",
    montant: "",
    taux_tva: "20",
    numero_marche: "",
    a_caution: false,
    cautions: [],
    documents: [],
    notes: ""
  });

  const [uploadingDocument, setUploadingDocument] = useState(false);

  const { data: entreprises, isLoading: loadingEntreprises } = useQuery({
    queryKey: ['entreprises'],
    queryFn: () => base44.entities.Entreprise.list('nom'),
    initialData: [],
  });

  useEffect(() => {
    if (marche) {
      setFormData({
        chantier_id: marche.chantier_id || "",
        entreprise_id: marche.entreprise_id || "",
        date: marche.date || "",
        numero_lot: marche.numero_lot || "",
        intitule_lot: marche.intitule_lot || "",
        contact_civilite: marche.contact_civilite || "Monsieur",
        contact_nom: marche.contact_nom || "",
        contact_email: marche.contact_email || "",
        contact_telephone: marche.contact_telephone || "",
        montant: marche.montant || "",
        taux_tva: marche.taux_tva ? marche.taux_tva.toString() : "20",
        numero_marche: marche.numero_marche || "",
        a_caution: marche.a_caution || false,
        cautions: marche.cautions || [],
        documents: marche.documents || [],
        notes: marche.notes || ""
      });
    } else {
      setFormData({
        chantier_id: chantiers.length > 0 ? chantiers[0].id : "",
        entreprise_id: entreprises.length > 0 ? entreprises[0].id : "",
        date: new Date().toISOString().split('T')[0],
        numero_lot: "",
        intitule_lot: "",
        contact_civilite: "Monsieur",
        contact_nom: "",
        contact_email: "",
        contact_telephone: "",
        montant: "",
        taux_tva: "20",
        numero_marche: "",
        a_caution: false,
        cautions: [],
        documents: [],
        notes: ""
      });
    }
  }, [marche, open, chantiers, entreprises]);

  const handleAddCaution = () => {
    setFormData({
      ...formData,
      cautions: [
        ...formData.cautions,
        {
          reference: "",
          montant: 0,
          date_ajout: new Date().toISOString().split('T')[0]
        }
      ]
    });
  };

  const handleRemoveCaution = (index) => {
    setFormData({
      ...formData,
      cautions: formData.cautions.filter((_, i) => i !== index)
    });
  };

  const handleCautionChange = (index, field, value) => {
    const newCautions = [...formData.cautions];
    newCautions[index] = {
      ...newCautions[index],
      [field]: field === 'montant' ? parseFloat(value) || 0 : value
    };
    setFormData({ ...formData, cautions: newCautions });
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDocument(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({
        ...formData,
        documents: [
          ...formData.documents,
          {
            nom: file.name,
            url: file_url,
            type: type
          }
        ]
      });
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
    }
    setUploadingDocument(false);
    e.target.value = '';
  };

  const handleRemoveDocument = (index) => {
    setFormData({
      ...formData,
      documents: formData.documents.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      montant: parseFloat(formData.montant) || 0,
      taux_tva: parseFloat(formData.taux_tva) || 20
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {marche ? "Modifier le marché" : "Nouveau marché"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Informations générales */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Informations générales</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_lot">N° Lot</Label>
                  <Input
                    id="numero_lot"
                    value={formData.numero_lot}
                    onChange={(e) => setFormData({ ...formData, numero_lot: e.target.value })}
                    placeholder="Ex: LOT-01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="intitule_lot">Intitulé du lot *</Label>
                  <Input
                    id="intitule_lot"
                    value={formData.intitule_lot}
                    onChange={(e) => setFormData({ ...formData, intitule_lot: e.target.value })}
                    placeholder="Ex: Gros œuvre"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entreprise_id">Entreprise *</Label>
                  <Select
                    value={formData.entreprise_id}
                    onValueChange={(value) => setFormData({ ...formData, entreprise_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une entreprise" />
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
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_marche">N° Marché</Label>
                  <Input
                    id="numero_marche"
                    value={formData.numero_marche}
                    onChange={(e) => setFormData({ ...formData, numero_marche: e.target.value })}
                    placeholder="Ex: M-2024-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="montant">Montant (€) *</Label>
                  <Input
                    id="montant"
                    type="number"
                    step="0.01"
                    value={formData.montant}
                    onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taux_tva">Taux de TVA (%) *</Label>
                  <Select
                    value={formData.taux_tva}
                    onValueChange={(value) => setFormData({ ...formData, taux_tva: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un taux" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5.5">5,5%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="20">20%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900">Contact</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_civilite">Civilité</Label>
                  <Select
                    value={formData.contact_civilite}
                    onValueChange={(value) => setFormData({ ...formData, contact_civilite: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mademoiselle">Mademoiselle</SelectItem>
                      <SelectItem value="Madame">Madame</SelectItem>
                      <SelectItem value="Monsieur">Monsieur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="contact_nom">Nom</Label>
                  <Input
                    id="contact_nom"
                    value={formData.contact_nom}
                    onChange={(e) => setFormData({ ...formData, contact_nom: e.target.value })}
                    placeholder="Nom du contact"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="contact@exemple.fr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_telephone">Téléphone</Label>
                  <Input
                    id="contact_telephone"
                    value={formData.contact_telephone}
                    onChange={(e) => setFormData({ ...formData, contact_telephone: e.target.value })}
                    placeholder="01 23 45 67 89"
                  />
                </div>
              </div>
            </div>

            {/* Cautions */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Cautions</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="a_caution"
                    checked={formData.a_caution}
                    onCheckedChange={(checked) => setFormData({ ...formData, a_caution: checked })}
                  />
                  <Label htmlFor="a_caution" className="cursor-pointer">
                    Ce marché a une caution
                  </Label>
                </div>
              </div>

              {formData.a_caution && (
                <div className="space-y-3">
                  {formData.cautions.map((caution, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex gap-4 items-start">
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>Référence</Label>
                            <Input
                              value={caution.reference}
                              onChange={(e) => handleCautionChange(index, 'reference', e.target.value)}
                              placeholder="Réf. caution"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Montant (€)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={caution.montant}
                              onChange={(e) => handleCautionChange(index, 'montant', e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                              type="date"
                              value={caution.date_ajout}
                              onChange={(e) => handleCautionChange(index, 'date_ajout', e.target.value)}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCaution(index)}
                          className="mt-7"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddCaution}
                    className="w-full gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter une caution
                  </Button>
                </div>
              )}
            </div>

            {/* Documents */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
              
              <div className="space-y-3">
                {formData.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium text-sm">{doc.nom}</p>
                        <p className="text-xs text-gray-500 capitalize">{doc.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Voir
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDocument(index)}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="doc-caution" className="cursor-pointer">
                      <div className="border-2 border-dashed rounded-lg p-4 hover:bg-gray-50 transition-colors text-center">
                        <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm font-medium">Caution</p>
                      </div>
                    </Label>
                    <input
                      id="doc-caution"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileUpload(e, 'caution')}
                      className="hidden"
                      disabled={uploadingDocument}
                    />
                  </div>

                  <div>
                    <Label htmlFor="doc-marche" className="cursor-pointer">
                      <div className="border-2 border-dashed rounded-lg p-4 hover:bg-gray-50 transition-colors text-center">
                        <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm font-medium">Marché</p>
                      </div>
                    </Label>
                    <input
                      id="doc-marche"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileUpload(e, 'marche')}
                      className="hidden"
                      disabled={uploadingDocument}
                    />
                  </div>

                  <div>
                    <Label htmlFor="doc-autre" className="cursor-pointer">
                      <div className="border-2 border-dashed rounded-lg p-4 hover:bg-gray-50 transition-colors text-center">
                        <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm font-medium">Autre</p>
                      </div>
                    </Label>
                    <input
                      id="doc-autre"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileUpload(e, 'autre')}
                      className="hidden"
                      disabled={uploadingDocument}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2 border-t pt-4">
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
              onClick={() => onOpenChange(false)}
              disabled={isLoading || uploadingDocument}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              className="bg-orange-600 hover:bg-orange-700"
              disabled={isLoading || loadingEntreprises || uploadingDocument}
            >
              {isLoading ? "Enregistrement..." : marche ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}