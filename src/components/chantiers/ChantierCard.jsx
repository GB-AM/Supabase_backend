// ⚠️ COMPOSANT FIGÉ - Carte d'affichage d'un chantier avec actions
// Ce composant affiche les informations d'un chantier et les boutons d'action (Modifier, Dupliquer, Supprimer)
// NE PAS MODIFIER sans validation

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, TrendingUp, Pencil, Trash2, Copy, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statutColors = {
  en_preparation: "bg-blue-100 text-blue-800 border-blue-200",
  en_cours: "bg-green-100 text-green-800 border-green-200",
  termine: "bg-gray-100 text-gray-800 border-gray-200",
  suspendu: "bg-red-100 text-red-800 border-red-200"
};

const statutLabels = {
  en_preparation: "En préparation",
  en_cours: "En cours",
  termine: "Terminé",
  suspendu: "Suspendu"
};

export default function ChantierCard({ chantier, montantGlobalMarche, onClick, onEdit, onDelete, onDuplicate }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const { data: membresEquipe = [] } = useQuery({
    queryKey: ['membres-equipe'],
    queryFn: () => base44.entities.MembreEquipe.list(),
    initialData: [],
  });

  const { data: marches = [] } = useQuery({
    queryKey: ['marches'],
    queryFn: () => base44.entities.MarcheEntreprise.list(),
    initialData: [],
  });

  const { data: avenants = [] } = useQuery({
    queryKey: ['avenants'],
    queryFn: () => base44.entities.Avenant.list(),
    initialData: [],
  });

  const getClientName = (clientId) => {
    if (!clientId) return "Client inconnu";
    const client = clients.find(c => c.id === clientId);
    return client?.nom || "Client inconnu";
  };

  const getMembresEquipe = () => {
    if (!chantier.membres_equipe_ids || chantier.membres_equipe_ids.length === 0) return [];
    return membresEquipe.filter(m => chantier.membres_equipe_ids.includes(m.id));
  };

  // Calculer le montant de base du marché (sans les avenants)
  const montantBaseMarche = useMemo(() => {
    if (!marches || !chantier?.id) return 0;
    return marches
      .filter(m => m.chantier_id === chantier.id)
      .reduce((sum, m) => sum + (m.montant || 0), 0);
  }, [marches, chantier?.id]);

  // Calculer le montant des avenants validés et signés
  const montantAvenants = useMemo(() => {
    if (!avenants || !chantier?.id) return 0;
    return avenants
      .filter(a => a.chantier_id === chantier.id && (a.statut === 'valide' || a.statut === 'signe'))
      .reduce((sum, a) => sum + (a.montant_total_ht || 0), 0);
  }, [avenants, chantier?.id]);

  // Montant global = base + avenants
  const montantGlobal = montantBaseMarche + montantAvenants;

  const budgetPrev = chantier.budget_previsionnel || 0;
  const pourcentageBudget = budgetPrev > 0
    ? ((montantGlobal / budgetPrev) * 100).toFixed(1)
    : 0;

  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(chantier);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleDuplicate = (e) => {
    e.stopPropagation();
    if (onDuplicate) {
      onDuplicate(chantier);
    }
  };

  const confirmDelete = () => {
    if (onDelete) {
      onDelete(chantier.id);
    }
    setShowDeleteDialog(false);
  };

  const handleCardClick = (e) => {
    if (e.target.closest('button') || e.target.closest('[role="menu"]')) {
      return;
    }
    if (onClick) {
      onClick();
    }
  };

  const equipe = getMembresEquipe();

  if (!chantier) return null;

  return (
    <>
      <Card
        className="hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
        onClick={handleCardClick}
      >
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1 pr-12">
              <CardTitle className="text-xl font-bold text-gray-900 mb-2">
                {chantier.nom || 'Chantier sans nom'}
              </CardTitle>
              <p className="text-sm text-gray-600 font-medium">{getClientName(chantier.client_id)}</p>
            </div>
            <Badge className={`${statutColors[chantier.statut] || statutColors.en_preparation} border`}>
              {statutLabels[chantier.statut] || 'En préparation'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {chantier.adresse && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <MapPin className="w-4 h-4" />
              <span>{chantier.adresse}</span>
            </div>
          )}

          {chantier.date_debut && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(chantier.date_debut), "dd MMM yyyy", { locale: fr })}
                {chantier.date_fin_prevue && ` - ${format(new Date(chantier.date_fin_prevue), "dd MMM yyyy", { locale: fr })}`}
              </span>
            </div>
          )}

          {equipe.length > 0 && (
            <div className="pt-2 border-t mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Suivi par:</p>
              <div className="flex flex-wrap gap-1">
                {equipe.map((membre) => (
                  <Badge key={membre.id} variant="outline" className="text-xs">
                    {membre.prenom} {membre.nom}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-500">Montant de base du marché</span>
              <span className="text-sm font-semibold text-gray-700">
                {montantBaseMarche.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">Montant global du marché</span>
              </div>
              <span className="text-lg font-bold text-orange-600">
                {montantGlobal.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>

            {montantAvenants > 0 && (
              <div className="flex justify-between items-center pl-6">
                <span className="text-xs text-gray-500">dont avenants validés/signés</span>
                <span className="text-xs font-medium text-blue-600">
                  + {montantAvenants.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </span>
              </div>
            )}

            {budgetPrev > 0 && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Budget prévisionnel</span>
                  <span className="text-xs font-medium text-gray-700">
                    {budgetPrev.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Écart</span>
                  <span className={`text-xs font-bold ${
                    pourcentageBudget > 100 ? "text-red-600" : "text-green-600"
                  }`}>
                    {pourcentageBudget > 100 ? '+' : ''}{(montantGlobal - budgetPrev).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € ({pourcentageBudget}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      pourcentageBudget > 100 ? "bg-red-500" : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(pourcentageBudget, 100)}%` }}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t mt-4">
            <Button
              variant="link"
              className="text-orange-600 hover:text-orange-700 p-0 h-auto"
              onClick={handleCardClick}
            >
              Voir le projet →
            </Button>
            
            {(onEdit || onDelete || onDuplicate) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={handleEdit}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                  )}
                  {onDuplicate && (
                    <DropdownMenuItem onClick={handleDuplicate}>
                      <Copy className="w-4 h-4 mr-2" />
                      Dupliquer
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={handleDelete}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      {onDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer le chantier "{chantier?.nom || 'ce chantier'}" ?
                Cette action est irréversible et supprimera également tous les marchés, travaux supplémentaires, certificats et sous-traitances associés.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}