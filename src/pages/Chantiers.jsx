// ⚠️ PAGE FIGÉE - Gestion de la liste des chantiers avec modification
// Cette page affiche la liste des chantiers et permet la création, modification, suppression et duplication
// NE PAS MODIFIER sans validation

import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Lock, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ChantierCard from "../components/chantiers/ChantierCard";
import ChantierDialog from "../components/chantiers/ChantierDialog";
import SearchBar from "../components/common/SearchBar";
import AdvancedFilters from "../components/common/AdvancedFilters";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

// Hook pour vérifier les permissions (défini localement)
function usePermissions() {
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const hasPermission = (permissionId) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    const permissions = currentUser.permissions || [];
    return permissions.includes(permissionId);
  };

  return {
    currentUser,
    isAdmin: currentUser?.role === 'admin',
    hasPermission,
  };
}

export default function Chantiers() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [statutFilter, setStatutFilter] = useState("tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState({
    date_debut_from: "",
    date_debut_to: "",
    date_fin_from: "",
    date_fin_to: "",
    budget_min: "",
    budget_max: "",
    membres_equipe_ids: [],
    client_id: "all"
  });
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { hasPermission, currentUser, isAdmin } = usePermissions();

  // Log pour diagnostic
  useEffect(() => {
    console.log("🔍 Page Chantiers chargée");
    console.log("👤 Utilisateur actuel:", currentUser);
  }, [currentUser]);

  // Vérifier les permissions
  const canViewChantiers = hasPermission('chantiers_view');
  const canCreateChantiers = hasPermission('chantiers_create');
  const canEditChantiers = hasPermission('chantiers_edit');
  const canDeleteChantiers = hasPermission('chantiers_delete');

  const handleChantierClick = (chantierId) => {
    if (!canViewChantiers) return;
    const url = new URL(window.location.origin + createPageUrl("ChantierDetails"));
    url.searchParams.set('chantierId', chantierId);
    navigate(url.pathname + url.search);
  };

  const { data: chantiers, isLoading: loadingChantiers } = useQuery({
    queryKey: ['chantiers'],
    queryFn: () => base44.entities.Chantier.list('-created_date'),
    initialData: [],
  });

  const { data: marches, isLoading: loadingMarches } = useQuery({
    queryKey: ['marches'],
    queryFn: () => base44.entities.MarcheEntreprise.list(),
    initialData: [],
  });

  const { data: avenants, isLoading: loadingAvenants } = useQuery({
    queryKey: ['avenants'],
    queryFn: () => base44.entities.Avenant.list(),
    initialData: [],
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('nom'),
    initialData: [],
  });

  const { data: membresEquipe } = useQuery({
    queryKey: ['membres-equipe'],
    queryFn: () => base44.entities.MembreEquipe.list('nom'),
    initialData: [],
  });

  // Log pour diagnostic des données
  useEffect(() => {
    console.log("📊 Chantiers chargés:", chantiers.length);
    console.log("📊 Marchés chargés:", marches.length);
    console.log("📊 Avenants chargés:", avenants.length);
  }, [chantiers, marches, avenants]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Chantier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chantiers'] });
      setShowDialog(false);
      setSelectedChantier(null);
      toast.success("Chantier créé");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Chantier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chantiers'] });
      setShowDialog(false);
      setSelectedChantier(null);
      toast.success("Chantier mis à jour");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (chantierId) => {
      await base44.entities.Chantier.delete(chantierId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chantiers'] });
      queryClient.invalidateQueries({ queryKey: ['marches'] });
      queryClient.invalidateQueries({ queryKey: ['travaux-sup'] });
      toast.success("Chantier supprimé");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (chantier) => {
      const newChantier = {
        ...chantier,
        nom: `${chantier.nom} (Copie)`,
        statut: "en_preparation"
      };
      delete newChantier.id;
      delete newChantier.created_date;
      delete newChantier.updated_date;
      delete newChantier.created_by;
      return base44.entities.Chantier.create(newChantier);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chantiers'] });
      toast.success("Chantier dupliqué");
    },
  });

  const handleSubmit = (data) => {
    if (selectedChantier) {
      if (!canEditChantiers) {
        toast.error("Permission refusée");
        return;
      }
      updateMutation.mutate({ id: selectedChantier.id, data });
    } else {
      if (!canCreateChantiers) {
        toast.error("Permission refusée");
        return;
      }
      createMutation.mutate(data);
    }
  };

  const handleEdit = (chantier) => {
    if (!canEditChantiers) {
      toast.error("Permission refusée");
      return;
    }
    setSelectedChantier(chantier);
    setShowDialog(true);
  };

  const handleDelete = (chantierId) => {
    if (!canDeleteChantiers) {
      toast.error("Permission refusée");
      return;
    }
    deleteMutation.mutate(chantierId);
  };

  const handleDuplicate = (chantier) => {
    if (!canCreateChantiers) {
      toast.error("Permission refusée");
      return;
    }
    duplicateMutation.mutate(chantier);
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.nom || "";
  };

  const filteredChantiers = useMemo(() => {
    let result = chantiers;

    if (statutFilter !== "tous") {
      result = result.filter(c => c.statut === statutFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => {
        const clientName = getClientName(c.client_id).toLowerCase();
        return (
          c.nom?.toLowerCase().includes(query) ||
          clientName.includes(query) ||
          c.adresse?.toLowerCase().includes(query) ||
          c.description?.toLowerCase().includes(query)
        );
      });
    }

    if (advancedFilters.date_debut_from) {
      result = result.filter(c => 
        c.date_debut && c.date_debut >= advancedFilters.date_debut_from
      );
    }
    if (advancedFilters.date_debut_to) {
      result = result.filter(c => 
        c.date_debut && c.date_debut <= advancedFilters.date_debut_to
      );
    }

    if (advancedFilters.date_fin_from) {
      result = result.filter(c => 
        c.date_fin_prevue && c.date_fin_prevue >= advancedFilters.date_fin_from
      );
    }
    if (advancedFilters.date_fin_to) {
      result = result.filter(c => 
        c.date_fin_prevue && c.date_fin_prevue <= advancedFilters.date_fin_to
      );
    }

    if (advancedFilters.budget_min) {
      result = result.filter(c => 
        c.budget_previsionnel && c.budget_previsionnel >= parseFloat(advancedFilters.budget_min)
      );
    }
    if (advancedFilters.budget_max) {
      result = result.filter(c => 
        c.budget_previsionnel && c.budget_previsionnel <= parseFloat(advancedFilters.budget_max)
      );
    }

    if (advancedFilters.client_id && advancedFilters.client_id !== "all") {
      result = result.filter(c => c.client_id === advancedFilters.client_id);
    }

    if (advancedFilters.membres_equipe_ids && advancedFilters.membres_equipe_ids.length > 0) {
      result = result.filter(c => 
        c.membres_equipe_ids && 
        advancedFilters.membres_equipe_ids.some(id => c.membres_equipe_ids.includes(id))
      );
    }

    return result;
  }, [chantiers, statutFilter, searchQuery, advancedFilters, clients]);

  const filterConfig = [
    {
      key: "client_id",
      label: "Client",
      type: "select",
      options: clients.map(c => ({ value: c.id, label: c.nom }))
    },
    {
      key: "date_debut_from",
      label: "Date début (à partir de)",
      type: "date"
    },
    {
      key: "date_debut_to",
      label: "Date début (jusqu'à)",
      type: "date"
    },
    {
      key: "date_fin_from",
      label: "Date fin prévue (à partir de)",
      type: "date"
    },
    {
      key: "date_fin_to",
      label: "Date fin prévue (jusqu'à)",
      type: "date"
    },
    {
      key: "budget_min",
      label: "Budget minimum (€)",
      type: "number",
      placeholder: "0"
    },
    {
      key: "budget_max",
      label: "Budget maximum (€)",
      type: "number",
      placeholder: "1000000"
    },
    {
      key: "membres_equipe_ids",
      label: "Suivi par",
      type: "multiselect",
      options: membresEquipe.map(m => ({
        value: m.id,
        label: `${m.prenom} ${m.nom}`
      }))
    }
  ];

  const isLoading = loadingChantiers || loadingMarches || loadingAvenants;

  if (!canViewChantiers) {
    return (
      <div className="p-4 md:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Card className="p-12 text-center">
            <Lock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Accès restreint
            </h3>
            <p className="text-gray-500">
              Vous n'avez pas la permission de consulter les chantiers. Contactez un administrateur.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {!isLoading && chantiers.length === 0 && (
          <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">Information importante</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Aucun chantier n'est visible pour votre compte. Cela peut être dû aux règles de sécurité (RLS).
                </p>
                <div className="bg-white rounded-lg p-4 text-xs space-y-2">
                  <p className="font-semibold text-gray-700">Pour voir un chantier, vous devez :</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>Être <strong>administrateur</strong> (rôle: admin)</li>
                    <li>OU être le <strong>créateur</strong> du chantier</li>
                    <li>OU être ajouté dans <strong>"Suivi par"</strong> (membres de l'équipe)</li>
                  </ul>
                  <div className="mt-4 pt-4 border-t text-gray-500">
                    <p><strong>Votre profil :</strong></p>
                    <p>Email : {currentUser?.email}</p>
                    <p>Rôle : {currentUser?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</p>
                    <p>ID : {currentUser?.id}</p>
                    <p>Permissions : {isAdmin ? 'Toutes (Admin)' : (currentUser?.permissions || []).length > 0 ? (currentUser?.permissions || []).join(', ') : 'Aucune'}</p>
                  </div>
                  {!isAdmin && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-yellow-800 font-medium">💡 Solution :</p>
                      <p className="text-yellow-700">
                        Demandez à un administrateur de vous ajouter dans l'équipe d'un chantier existant, ou créez votre propre chantier.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Chantiers</h1>
            <p className="text-gray-600">
              {filteredChantiers.length} chantier{filteredChantiers.length > 1 ? 's' : ''} trouvé{filteredChantiers.length > 1 ? 's' : ''}
            </p>
          </div>
          {canCreateChantiers && (
            <Button 
              className="bg-orange-600 hover:bg-orange-700 gap-2"
              onClick={() => {
                setSelectedChantier(null);
                setShowDialog(true);
              }}
            >
              <Plus className="w-5 h-5" />
              Nouveau chantier
            </Button>
          )}
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex gap-3 flex-wrap">
            <SearchBar 
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Rechercher par nom, client, adresse..."
            />
            <AdvancedFilters
              filters={advancedFilters}
              onFiltersChange={setAdvancedFilters}
              filterConfig={filterConfig}
            />
          </div>

          <Tabs value={statutFilter} onValueChange={setStatutFilter}>
            <TabsList className="bg-white">
              <TabsTrigger value="tous">Tous</TabsTrigger>
              <TabsTrigger value="en_preparation">En préparation</TabsTrigger>
              <TabsTrigger value="en_cours">En cours</TabsTrigger>
              <TabsTrigger value="termine">Terminés</TabsTrigger>
              <TabsTrigger value="suspendu">Suspendus</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : filteredChantiers.length === 0 && chantiers.length > 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Aucun chantier trouvé
            </h3>
            <p className="text-gray-500 mb-4">
              Essayez de modifier vos critères de recherche
            </p>
          </div>
        ) : filteredChantiers.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Aucun chantier accessible
            </h3>
            <p className="text-gray-500 mb-4">
              {canCreateChantiers 
                ? "Créez votre premier chantier pour commencer"
                : "Contactez un administrateur pour accéder aux chantiers"}
            </p>
            {canCreateChantiers && (
              <Button 
                className="bg-orange-600 hover:bg-orange-700 gap-2"
                onClick={() => setShowDialog(true)}
              >
                <Plus className="w-5 h-5" />
                Créer un chantier
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChantiers.map(chantier => (
              <ChantierCard 
                key={chantier.id}
                chantier={chantier}
                onClick={() => handleChantierClick(chantier.id)}
                onEdit={canEditChantiers ? handleEdit : undefined}
                onDelete={canDeleteChantiers ? handleDelete : undefined}
                onDuplicate={canCreateChantiers ? handleDuplicate : undefined}
              />
            ))}
          </div>
        )}

        {canCreateChantiers && (
          <ChantierDialog 
            open={showDialog}
            onOpenChange={setShowDialog}
            chantier={selectedChantier}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}