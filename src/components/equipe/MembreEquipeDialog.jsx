
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

export default function MembreEquipeDialog({ open, onOpenChange, membre, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    civilite: "Monsieur",
    nom: "",
    prenom: "",
    email: "",
    telephone_portable: ""
  });

  useEffect(() => {
    if (membre) {
      setFormData({
        civilite: membre.civilite || "Monsieur",
        nom: membre.nom || "",
        prenom: membre.prenom || "",
        email: membre.email || "",
        telephone_portable: membre.telephone_portable || ""
      });
    } else {
      setFormData({
        civilite: "Monsieur",
        nom: "",
        prenom: "",
        email: "",
        telephone_portable: ""
      });
    }
  }, [membre, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {membre ? "Modifier le membre" : "Nouveau membre"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="civilite">Civilité *</Label>
              <Select
                value={formData.civilite}
                onValueChange={(value) => setFormData({ ...formData, civilite: value })}
                required
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Nom"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  placeholder="Prénom"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemple.fr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telephone_portable">Téléphone portable</Label>
              <Input
                id="telephone_portable"
                value={formData.telephone_portable}
                onChange={(e) => setFormData({ ...formData, telephone_portable: e.target.value })}
                placeholder="06 12 34 56 78"
              />
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
              {isLoading ? "Enregistrement..." : membre ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
