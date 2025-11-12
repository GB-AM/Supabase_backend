
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Upload, X, Info } from "lucide-react";
import MembreEquipeDialog from "../components/equipe/MembreEquipeDialog";
import MembreEquipesList from "../components/equipe/MembreEquipesList";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

export default function EquipeGestionbat() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedMembre, setSelectedMembre] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [membreToDelete, setMembreToDelete] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: membres, isLoading: loadingMembres } = useQuery({
    queryKey: ['membres-equipe'],
    queryFn: () => base44.entities.MembreEquipe.list('nom'),
    initialData: [],
  });

  const { data: infoGestionbat, isLoading: loadingInfo } = useQuery({
    queryKey: ['info-gestionbat'],
    queryFn: async () => {
      const infos = await base44.entities.InfoGestionbat.list();
      return infos.length > 0 ? infos[0] : null;
    },
  });

  const [formInfo, setFormInfo] = useState({
    nom_entreprise: "",
    adresse: "",
    code_postal: "",
    ville: "",
    telephone: "",
    siret: "",
    logo_url: ""
  });

  React.useEffect(() => {
    if (infoGestionbat) {
      setFormInfo({
        nom_entreprise: infoGestionbat.nom_entreprise || "",
        adresse: infoGestionbat.adresse || "",
        code_postal: infoGestionbat.code_postal || "",
        ville: infoGestionbat.ville || "",
        telephone: infoGestionbat.telephone || "",
        siret: infoGestionbat.siret || "",
        logo_url: infoGestionbat.logo_url || ""
      });
    }
  }, [infoGestionbat]);

  const createMembreMutation = useMutation({
    mutationFn: (data) => base44.entities.MembreEquipe.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membres-equipe'] });
      setShowDialog(false);
      setSelectedMembre(null);
      toast.success("Membre ajouté", {
        description: "Le membre a été ajouté avec succès",
        duration: 3000,
      });
    },
  });

  const updateMembreMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MembreEquipe.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membres-equipe'] });
      setShowDialog(false);
      setSelectedMembre(null);
      toast.success("Membre mis à jour", {
        description: "Le membre a été mis à jour avec succès",
        duration: 3000,
      });
    },
  });

  const deleteMembreMutation = useMutation({
    mutationFn: (id) => base44.entities.MembreEquipe.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membres-equipe'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowDeleteDialog(false);
      setMembreToDelete(null);
      toast.success("Membre supprimé", {
        description: "Le membre a été supprimé avec succès",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast.error("Erreur", {
        description: "Impossible de supprimer ce membre",
        duration: 3000,
      });
      setShowDeleteDialog(false);
      setMembreToDelete(null);
    },
  });

  const saveInfoMutation = useMutation({
    mutationFn: async (data) => {
      if (infoGestionbat) {
        return base44.entities.InfoGestionbat.update(infoGestionbat.id, data);
      } else {
        return base44.entities.InfoGestionbat.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['info-gestionbat'] });
      toast.success("Informations enregistrées", {
        description: "Les informations de l'entreprise ont été enregistrées avec succès",
        duration: 3000,
      });
    },
  });

  const handleSubmit = (data) => {
    if (selectedMembre) {
      updateMembreMutation.mutate({ id: selectedMembre.id, data });
    } else {
      createMembreMutation.mutate(data);
    }
  };

  const handleDelete = (membre) => {
    setMembreToDelete(membre);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (membreToDelete) {
      deleteMembreMutation.mutate(membreToDelete.id);
    }
  };

  const handleSaveInfo = () => {
    saveInfoMutation.mutate(formInfo);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormInfo({ ...formInfo, logo_url: file_url });
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
      toast.error("Erreur", {
        description: "Erreur lors du téléchargement du logo",
        duration: 3000,
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormInfo({ ...formInfo, logo_url: "" });
  };

  const getFileName = (url) => {
    if (!url) return "";
    return url.split('/').pop().split('?')[0];
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Equipe GESTIONBAT</h1>
          <p className="text-gray-600">Gérez les informations de votre entreprise et de votre équipe</p>
        </div>

        {/* Informations GESTIONBAT */}
        <Card className="mb-8 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-600" />
              Informations de l'entreprise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                <strong>Informations globales :</strong> Ces informations sont automatiquement utilisées dans tous les documents générés (marchés, avenants, certificats, rapports). Configurez-les une seule fois ici.
              </AlertDescription>
            </Alert>

            {loadingInfo ? (
              <Skeleton className="h-96" />
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nom_entreprise">Nom de l'entreprise *</Label>
                  <Input
                    id="nom_entreprise"
                    value={formInfo.nom_entreprise}
                    onChange={(e) => setFormInfo({ ...formInfo, nom_entreprise: e.target.value })}
                    placeholder="GESTIONBAT"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adresse">Adresse</Label>
                  <Input
                    id="adresse"
                    value={formInfo.adresse}
                    onChange={(e) => setFormInfo({ ...formInfo, adresse: e.target.value })}
                    placeholder="Adresse complète"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code_postal">Code postal</Label>
                    <Input
                      id="code_postal"
                      value={formInfo.code_postal}
                      onChange={(e) => setFormInfo({ ...formInfo, code_postal: e.target.value })}
                      placeholder="75000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ville">Ville</Label>
                    <Input
                      id="ville"
                      value={formInfo.ville}
                      onChange={(e) => setFormInfo({ ...formInfo, ville: e.target.value })}
                      placeholder="Paris"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input
                      id="telephone"
                      value={formInfo.telephone}
                      onChange={(e) => setFormInfo({ ...formInfo, telephone: e.target.value })}
                      placeholder="01 23 45 67 89"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siret">SIRET</Label>
                    <Input
                      id="siret"
                      value={formInfo.siret}
                      onChange={(e) => setFormInfo({ ...formInfo, siret: e.target.value })}
                      placeholder="123 456 789 00012"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Logo GESTIONBAT</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Ce logo sera utilisé automatiquement dans tous les documents PDF générés (marchés, avenants, certificats, rapports)
                  </p>
                  {formInfo.logo_url ? (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <img 
                        src={formInfo.logo_url} 
                        alt="Logo GESTIONBAT" 
                        className="w-16 h-16 object-contain"
                      />
                      <span className="text-sm flex-1 truncate">{getFileName(formInfo.logo_url)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveLogo}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        type="file"
                        accept=".png,.jpg,.jpeg,.svg"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="cursor-pointer"
                      />
                      {uploadingLogo && <p className="text-xs text-gray-500 mt-1">Téléchargement...</p>}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleSaveInfo}
                    disabled={saveInfoMutation.isPending || !formInfo.nom_entreprise}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {saveInfoMutation.isPending ? "Enregistrement..." : "Enregistrer les informations"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Membres de l'équipe */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Membres de l'équipe</h2>
            <p className="text-gray-600">Gérez les membres de votre équipe</p>
          </div>
          <Button 
            className="bg-orange-600 hover:bg-orange-700 gap-2"
            onClick={() => {
              setSelectedMembre(null);
              setShowDialog(true);
            }}
          >
            <Plus className="w-5 h-5" />
            Nouveau membre
          </Button>
        </div>

        {loadingMembres ? (
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <MembreEquipesList 
            membres={membres}
            onEdit={(membre) => {
              setSelectedMembre(membre);
              setShowDialog(true);
            }}
            onDelete={handleDelete}
          />
        )}

        <MembreEquipeDialog 
          open={showDialog}
          onOpenChange={setShowDialog}
          membre={selectedMembre}
          onSubmit={handleSubmit}
          isLoading={createMembreMutation.isPending || updateMembreMutation.isPending}
        />

        {/* Dialog de confirmation de suppression */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer{" "}
              <strong>
                {membreToDelete?.prenom} {membreToDelete?.nom}
              </strong>{" "}
              de l'équipe ? Cette action est irréversible.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setMembreToDelete(null);
                setShowDeleteDialog(false);
              }}>
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMembreMutation.isPending}
              >
                {deleteMembreMutation.isPending ? "Suppression..." : "Supprimer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
