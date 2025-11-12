
import React, { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EntrepriseDialog({ open, onOpenChange, entreprise, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    nom: "",
    adresse_1: "",
    adresse_2: "",
    code_postal: "",
    ville: "",
    telephone: "",
    siret: "",
    representant_civilite: "Monsieur",
    representant_nom: "",
    representant_prenom: "",
    representant_qualite: ""
  });

  useEffect(() => {
    if (entreprise) {
      setFormData({
        nom: entreprise.nom || "",
        adresse_1: entreprise.adresse_1 || "",
        adresse_2: entreprise.adresse_2 || "",
        code_postal: entreprise.code_postal || "",
        ville: entreprise.ville || "",
        telephone: entreprise.telephone || "",
        siret: entreprise.siret || "",
        representant_civilite: entreprise.representant_civilite || "Monsieur",
        representant_nom: entreprise.representant_nom || "",
        representant_prenom: entreprise.representant_prenom || "",
        representant_qualite: entreprise.representant_qualite || ""
      });
    } else {
      setFormData({
        nom: "",
        adresse_1: "",
        adresse_2: "",
        code_postal: "",
        ville: "",
        telephone: "",
        siret: "",
        representant_civilite: "Monsieur",
        representant_nom: "",
        representant_prenom: "",
        representant_qualite: ""
      });
    }
  }, [entreprise, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {entreprise ? "Modifier l'entreprise" : "Nouvelle entreprise"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom de l'entreprise *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Ex: SARL BTP Construction"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adresse_1">Adresse ligne 1</Label>
              <Input
                id="adresse_1"
                value={formData.adresse_1}
                onChange={(e) => setFormData({ ...formData, adresse_1: e.target.value })}
                placeholder="Numéro et nom de rue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adresse_2">Adresse ligne 2</Label>
              <Input
                id="adresse_2"
                value={formData.adresse_2}
                onChange={(e) => setFormData({ ...formData, adresse_2: e.target.value })}
                placeholder="Complément d'adresse"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code_postal">Code postal</Label>
                <Input
                  id="code_postal"
                  value={formData.code_postal}
                  onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                  placeholder="75000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ville">Ville</Label>
                <Input
                  id="ville"
                  value={formData.ville}
                  onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  placeholder="Paris"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  placeholder="01 23 45 67 89"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siret">SIRET</Label>
                <Input
                  id="siret"
                  value={formData.siret}
                  onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                  placeholder="123 456 789 00012"
                />
              </div>
            </div>

            {/* Section Représentant */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-gray-900">Représentée par</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="representant_civilite">Civilité</Label>
                  <Select
                    value={formData.representant_civilite}
                    onValueChange={(value) => setFormData({ ...formData, representant_civilite: value })}
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

                <div className="space-y-2">
                  <Label htmlFor="representant_nom">Nom</Label>
                  <Input
                    id="representant_nom"
                    value={formData.representant_nom}
                    onChange={(e) => setFormData({ ...formData, representant_nom: e.target.value })}
                    placeholder="Nom"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="representant_prenom">Prénom</Label>
                  <Input
                    id="representant_prenom"
                    value={formData.representant_prenom}
                    onChange={(e) => setFormData({ ...formData, representant_prenom: e.target.value })}
                    placeholder="Prénom"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="representant_qualite">Qualité</Label>
                <Input
                  id="representant_qualite"
                  value={formData.representant_qualite}
                  onChange={(e) => setFormData({ ...formData, representant_qualite: e.target.value })}
                  placeholder="Ex: Gérant, Directeur, Président"
                />
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
              disabled={isLoading}
            >
              {isLoading ? "Enregistrement..." : entreprise ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
