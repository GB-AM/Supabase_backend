
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

export default function ClientDialog({ open, onOpenChange, client, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    nom: "",
    adresse_1: "",
    adresse_2: "",
    code_postal: "",
    ville: "",
    telephone: "",
    siret: ""
  });

  useEffect(() => {
    if (client) {
      setFormData({
        nom: client.nom || "",
        adresse_1: client.adresse_1 || "",
        adresse_2: client.adresse_2 || "",
        code_postal: client.code_postal || "",
        ville: client.ville || "",
        telephone: client.telephone || "",
        siret: client.siret || ""
      });
    } else {
      setFormData({
        nom: "",
        adresse_1: "",
        adresse_2: "",
        code_postal: "",
        ville: "",
        telephone: "",
        siret: ""
      });
    }
  }, [client, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {client ? "Modifier le client" : "Nouveau client"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom du client *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Ex: Société ABC"
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
              {isLoading ? "Enregistrement..." : client ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
