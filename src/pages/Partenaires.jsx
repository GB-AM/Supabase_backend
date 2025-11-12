import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Building, MapPin, Phone, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import SearchBar from "../components/common/SearchBar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function PartenaireDialog({ open, onOpenChange, partenaire, onSubmit, isLoading }) {
  const [formData, setFormData] = React.useState({
    nom: "",
    adresse_1: "",
    adresse_2: "",
    code_postal: "",
    ville: "",
    telephone: "",
    siret: ""
  });

  React.useEffect(() => {
    if (partenaire) {
      setFormData({
        nom: partenaire.nom || "",
        adresse_1: partenaire.adresse_1 || "",
        adresse_2: partenaire.adresse_2 || "",
        code_postal: partenaire.code_postal || "",
        ville: partenaire.ville || "",
        telephone: partenaire.telephone || "",
        siret: partenaire.siret || ""
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
  }, [partenaire, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {partenaire ? "Modifier le partenaire" : "Nouveau partenaire"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom du partenaire *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Ex: Cabinet d'Architecture XYZ"
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
              {isLoading ? "Enregistrement..." : partenaire ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Partenaires() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPartenaire, setSelectedPartenaire] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const queryClient = useQueryClient();

  const { data: partenaires, isLoading } = useQuery({
    queryKey: ['partenaires'],
    queryFn: () => base44.entities.Partenaire.list('nom'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Partenaire.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partenaires'] });
      setShowDialog(false);
      setSelectedPartenaire(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Partenaire.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partenaires'] });
      setShowDialog(false);
      setSelectedPartenaire(null);
    },
  });

  const handleSubmit = (data) => {
    if (selectedPartenaire) {
      updateMutation.mutate({ id: selectedPartenaire.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (partenaire) => {
    setSelectedPartenaire(partenaire);
    setShowDialog(true);
  };

  const filteredPartenaires = React.useMemo(() => {
    if (!searchQuery) return partenaires;
    
    const query = searchQuery.toLowerCase();
    return partenaires.filter(p => 
      p.nom?.toLowerCase().includes(query) ||
      p.siret?.toLowerCase().includes(query) ||
      p.ville?.toLowerCase().includes(query) ||
      p.telephone?.toLowerCase().includes(query)
    );
  }, [partenaires, searchQuery]);

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Partenaires</h1>
            <p className="text-gray-600">
              {filteredPartenaires.length} partenaire{filteredPartenaires.length > 1 ? 's' : ''} trouvé{filteredPartenaires.length > 1 ? 's' : ''}
            </p>
          </div>
          <Button 
            className="bg-orange-600 hover:bg-orange-700 gap-2"
            onClick={() => {
              setSelectedPartenaire(null);
              setShowDialog(true);
            }}
          >
            <Plus className="w-5 h-5" />
            Nouveau partenaire
          </Button>
        </div>

        <div className="mb-6">
          <SearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher par nom, SIRET, ville, téléphone..."
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : filteredPartenaires.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <Building className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {searchQuery ? "Aucun partenaire trouvé" : "Aucun partenaire"}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery 
                ? "Essayez de modifier vos critères de recherche" 
                : "Ajoutez votre premier partenaire pour commencer"}
            </p>
            {!searchQuery && (
              <Button 
                className="bg-orange-600 hover:bg-orange-700 gap-2"
                onClick={() => setShowDialog(true)}
              >
                <Plus className="w-5 h-5" />
                Nouveau partenaire
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPartenaires.map(partenaire => (
              <Card 
                key={partenaire.id}
                className="hover:shadow-xl transition-all duration-300 cursor-pointer"
                onClick={() => handleEdit(partenaire)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                        <Building className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold text-gray-900">
                          {partenaire.nom}
                        </CardTitle>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {partenaire.adresse_1 && (
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <p>{partenaire.adresse_1}</p>
                          {partenaire.adresse_2 && <p>{partenaire.adresse_2}</p>}
                          {(partenaire.code_postal || partenaire.ville) && (
                            <p>{partenaire.code_postal} {partenaire.ville}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {partenaire.telephone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{partenaire.telephone}</span>
                      </div>
                    )}

                    {partenaire.siret && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4" />
                        <span>SIRET: {partenaire.siret}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <PartenaireDialog 
          open={showDialog}
          onOpenChange={setShowDialog}
          partenaire={selectedPartenaire}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    </div>
  );
}