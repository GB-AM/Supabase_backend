import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ClientDialog from "../components/clients/ClientDialog";
import ClientsList from "../components/clients/ClientsList";
import SearchBar from "../components/common/SearchBar";
import { Skeleton } from "@/components/ui/skeleton";

export default function Clients() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('nom'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowDialog(false);
      setSelectedClient(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowDialog(false);
      setSelectedClient(null);
    },
  });

  const handleSubmit = (data) => {
    if (selectedClient) {
      updateMutation.mutate({ id: selectedClient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Filtrage avec recherche
  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;

    const query = searchQuery.toLowerCase();
    return clients.filter(c =>
      c.nom?.toLowerCase().includes(query) ||
      c.siret?.toLowerCase().includes(query) ||
      c.ville?.toLowerCase().includes(query) ||
      c.adresse_1?.toLowerCase().includes(query) ||
      c.telephone?.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Clients</h1>
            <p className="text-gray-600">
              {filteredClients.length} client{filteredClients.length > 1 ? 's' : ''} trouvé{filteredClients.length > 1 ? 's' : ''}
            </p>
          </div>
          <Button 
            className="bg-orange-600 hover:bg-orange-700 gap-2"
            onClick={() => {
              setSelectedClient(null);
              setShowDialog(true);
            }}
          >
            <Plus className="w-5 h-5" />
            Nouveau client
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
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Aucun client trouvé
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery 
                ? "Essayez de modifier votre recherche"
                : "Ajoutez votre premier client pour commencer"}
            </p>
            {!searchQuery && (
              <Button 
                className="bg-orange-600 hover:bg-orange-700 gap-2"
                onClick={() => setShowDialog(true)}
              >
                <Plus className="w-5 h-5" />
                Créer un client
              </Button>
            )}
          </div>
        ) : (
          <ClientsList 
            clients={filteredClients}
            onEdit={(client) => {
              setSelectedClient(client);
              setShowDialog(true);
            }}
          />
        )}

        <ClientDialog 
          open={showDialog}
          onOpenChange={setShowDialog}
          client={selectedClient}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    </div>
  );
}