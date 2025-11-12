import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import EntrepriseDialog from "../components/entreprises/EntrepriseDialog";
import EntreprisesList from "../components/entreprises/EntreprisesList";
import SearchBar from "../components/common/SearchBar";
import { Skeleton } from "@/components/ui/skeleton";

export default function Entreprises() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedEntreprise, setSelectedEntreprise] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: entreprises, isLoading } = useQuery({
    queryKey: ['entreprises'],
    queryFn: () => base44.entities.Entreprise.list('nom'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Entreprise.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entreprises'] });
      setShowDialog(false);
      setSelectedEntreprise(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Entreprise.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entreprises'] });
      setShowDialog(false);
      setSelectedEntreprise(null);
    },
  });

  const handleSubmit = (data) => {
    if (selectedEntreprise) {
      updateMutation.mutate({ id: selectedEntreprise.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Filtrage avec recherche
  const filteredEntreprises = useMemo(() => {
    if (!searchQuery) return entreprises;

    const query = searchQuery.toLowerCase();
    return entreprises.filter(e =>
      e.nom?.toLowerCase().includes(query) ||
      e.siret?.toLowerCase().includes(query) ||
      e.ville?.toLowerCase().includes(query) ||
      e.adresse_1?.toLowerCase().includes(query) ||
      e.representant_nom?.toLowerCase().includes(query) ||
      e.representant_prenom?.toLowerCase().includes(query)
    );
  }, [entreprises, searchQuery]);

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Entreprises</h1>
            <p className="text-gray-600">
              {filteredEntreprises.length} entreprise{filteredEntreprises.length > 1 ? 's' : ''} trouvée{filteredEntreprises.length > 1 ? 's' : ''}
            </p>
          </div>
          <Button 
            className="bg-orange-600 hover:bg-orange-700 gap-2"
            onClick={() => {
              setSelectedEntreprise(null);
              setShowDialog(true);
            }}
          >
            <Plus className="w-5 h-5" />
            Nouvelle entreprise
          </Button>
        </div>

        <div className="mb-6">
          <SearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher par nom, SIRET, ville, représentant..."
          />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : filteredEntreprises.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Aucune entreprise trouvée
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery 
                ? "Essayez de modifier votre recherche"
                : "Ajoutez votre première entreprise pour commencer"}
            </p>
            {!searchQuery && (
              <Button 
                className="bg-orange-600 hover:bg-orange-700 gap-2"
                onClick={() => setShowDialog(true)}
              >
                <Plus className="w-5 h-5" />
                Créer une entreprise
              </Button>
            )}
          </div>
        ) : (
          <EntreprisesList 
            entreprises={filteredEntreprises}
            onEdit={(entreprise) => {
              setSelectedEntreprise(entreprise);
              setShowDialog(true);
            }}
          />
        )}

        <EntrepriseDialog 
          open={showDialog}
          onOpenChange={setShowDialog}
          entreprise={selectedEntreprise}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    </div>
  );
}