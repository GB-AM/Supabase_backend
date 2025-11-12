import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MapPin, Calendar, Users, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MarchesTab from "../components/chantier-details/MarchesTab";
import CertificatsTab from "../components/chantier-details/CertificatsTab";
import SousTraitanceTab from "../components/chantier-details/SousTraitanceTab";
import TravauxSupTab from "../components/chantier-details/TravauxSupTab";

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

export default function ChantierDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const chantierId = searchParams.get('chantierId');
  const [activeTab, setActiveTab] = useState("marches");

  const { data: chantier } = useQuery({
    queryKey: ['chantier', chantierId],
    queryFn: async () => {
      const chantiers = await base44.entities.Chantier.list();
      return chantiers.find(c => c.id === chantierId);
    },
    enabled: !!chantierId,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const { data: membresEquipe } = useQuery({
    queryKey: ['membres-equipe'],
    queryFn: () => base44.entities.MembreEquipe.list(),
    initialData: [],
  });

  const { data: marches } = useQuery({
    queryKey: ['marches'],
    queryFn: () => base44.entities.MarcheEntreprise.list(),
    initialData: [],
  });

  const { data: avenants } = useQuery({
    queryKey: ['avenants'],
    queryFn: () => base44.entities.Avenant.list(),
    initialData: [],
  });

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.nom || "Client inconnu";
  };

  const getMembresEquipe = () => {
    if (!chantier?.membres_equipe_ids || chantier.membres_equipe_ids.length === 0) return [];
    return membresEquipe.filter(m => chantier.membres_equipe_ids.includes(m.id));
  };

  // Calculer le montant de base du marché (sans les avenants)
  const montantBaseMarche = useMemo(() => {
    if (!chantierId) return 0;
    return marches
      .filter(m => m.chantier_id === chantierId)
      .reduce((sum, m) => sum + (m.montant || 0), 0);
  }, [marches, chantierId]);

  // Calculer le montant des avenants validés et signés
  const montantAvenants = useMemo(() => {
    if (!chantierId) return 0;
    return avenants
      .filter(a => a.chantier_id === chantierId && (a.statut === 'valide' || a.statut === 'signe'))
      .reduce((sum, a) => sum + (a.montant_total_ht || 0), 0);
  }, [avenants, chantierId]);

  // Montant global = base + avenants
  const montantGlobal = montantBaseMarche + montantAvenants;

  const equipe = getMembresEquipe();

  if (!chantier) {
    return (
      <div className="p-4 md:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Card className="p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Chantier introuvable
            </h3>
            <p className="text-gray-500 mb-4">
              Le chantier demandé n'existe pas ou vous n'avez pas accès.
            </p>
            <Button onClick={() => navigate(createPageUrl("Chantiers"))}>
              Retour aux chantiers
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6 gap-2"
          onClick={() => navigate(createPageUrl("Chantiers"))}
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux chantiers
        </Button>

        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{chantier.nom}</h1>
                <p className="text-orange-100">{getClientName(chantier.client_id)}</p>
              </div>
              <Badge className={`${statutColors[chantier.statut]} border`}>
                {statutLabels[chantier.statut]}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {chantier.adresse && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{chantier.adresse}</span>
                </div>
              )}

              {chantier.date_debut && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {format(new Date(chantier.date_debut), "dd MMM yyyy", { locale: fr })}
                    {chantier.date_fin_prevue && ` - ${format(new Date(chantier.date_fin_prevue), "dd MMM yyyy", { locale: fr })}`}
                  </span>
                </div>
              )}

              {equipe.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{equipe.length} membre{equipe.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-white border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Montant de base du marché */}
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Montant de base du marché</p>
                <p className="text-2xl font-bold text-gray-700">
                  {montantBaseMarche.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </p>
              </div>

              {/* Montant global du marché */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                  <p className="text-sm text-gray-500">Montant global du marché</p>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  {montantGlobal.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </p>
                {montantAvenants > 0 && (
                  <p className="text-xs text-blue-600">
                    dont avenants validés/signés : + {montantAvenants.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </p>
                )}
              </div>

              {/* Budget prévisionnel */}
              {chantier.budget_previsionnel && chantier.budget_previsionnel > 0 && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Budget prévisionnel</p>
                  <p className="text-2xl font-bold text-gray-700">
                    {chantier.budget_previsionnel.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </p>
                  <p className={`text-xs font-semibold ${
                    montantGlobal > chantier.budget_previsionnel ? "text-red-600" : "text-green-600"
                  }`}>
                    Écart : {montantGlobal > chantier.budget_previsionnel ? '+' : ''}
                    {(montantGlobal - chantier.budget_previsionnel).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </p>
                </div>
              )}
            </div>

            {chantier.description && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">{chantier.description}</p>
              </div>
            )}

            {equipe.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-2">Suivi par :</p>
                <div className="flex flex-wrap gap-2">
                  {equipe.map((membre) => (
                    <Badge key={membre.id} variant="outline" className="text-xs">
                      {membre.prenom} {membre.nom}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="marches">Marchés</TabsTrigger>
            <TabsTrigger value="travaux-sup">Travaux Sup. & Avenants</TabsTrigger>
            <TabsTrigger value="certificats">Certificats</TabsTrigger>
            <TabsTrigger value="sous-traitance">Sous-traitance</TabsTrigger>
          </TabsList>

          <TabsContent value="marches">
            <MarchesTab chantierId={chantierId} />
          </TabsContent>

          <TabsContent value="travaux-sup">
            <TravauxSupTab chantierId={chantierId} />
          </TabsContent>

          <TabsContent value="certificats">
            <CertificatsTab chantierId={chantierId} />
          </TabsContent>

          <TabsContent value="sous-traitance">
            <SousTraitanceTab chantierId={chantierId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}