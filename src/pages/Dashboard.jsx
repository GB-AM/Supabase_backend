import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { TrendingUp, Building2, AlertCircle, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ChantierCard from "../components/chantiers/ChantierCard";
import StatCard from "../components/dashboard/StatCard";

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

export default function Dashboard() {
  const navigate = useNavigate();
  const { hasPermission, currentUser } = usePermissions();

  const canViewChantiers = hasPermission('chantiers_view');
  const canViewDashboard = hasPermission('dashboard_view');

  // 🔍 Logs de diagnostic pour le Dashboard
  useEffect(() => {
    console.log(`📊 [Dashboard] Chargement...`);
    console.log(`👤 Utilisateur: ${currentUser?.email || 'Non connecté'}`);
    console.log(`🔐 Permissions: dashboard=${canViewDashboard}, chantiers=${canViewChantiers}`);
  }, [currentUser, canViewDashboard, canViewChantiers]);

  const { data: chantiers } = useQuery({
    queryKey: ['chantiers'],
    queryFn: () => base44.entities.Chantier.list('-created_date'),
    initialData: [],
    enabled: canViewChantiers,
  });

  const { data: marches } = useQuery({
    queryKey: ['marches'],
    queryFn: () => base44.entities.MarcheEntreprise.list(),
    initialData: [],
    enabled: canViewChantiers,
  });

  const { data: avenants } = useQuery({
    queryKey: ['avenants'],
    queryFn: () => base44.entities.Avenant.list(),
    initialData: [],
    enabled: canViewChantiers,
  });

  // 🔍 Logs des données chargées
  useEffect(() => {
    console.log(`📊 [Dashboard] Chantiers: ${chantiers.length}`);
    console.log(`📊 [Dashboard] Marchés: ${marches.length}`);
    console.log(`📊 [Dashboard] Avenants: ${avenants.length}`);
  }, [chantiers, marches, avenants]);

  const chantiersActifs = chantiers.filter(c => c.statut === 'en_cours');

  // Calcul du montant global : base des marchés + avenants validés/signés
  const montantGlobalMarches = React.useMemo(() => {
    const montantBaseMarches = marches.reduce((sum, m) => sum + (m.montant || 0), 0);
    const montantAvenants = avenants
      .filter(a => a.statut === 'valide' || a.statut === 'signe')
      .reduce((sum, a) => sum + (a.montant_total_ht || 0), 0);
    
    const total = montantBaseMarches + montantAvenants;
    
    // 🔍 Log du calcul
    console.log(`💰 [Dashboard] Montant base marchés: ${montantBaseMarches.toLocaleString("fr-FR")} €`);
    console.log(`💰 [Dashboard] Montant avenants validés/signés: ${montantAvenants.toLocaleString("fr-FR")} €`);
    console.log(`💰 [Dashboard] MONTANT GLOBAL: ${total.toLocaleString("fr-FR")} €`);
    
    return total;
  }, [marches, avenants]);

  const chantiersDepassement = chantiers.filter(c => {
    if (!c.budget_previsionnel || c.budget_previsionnel === 0) return false;
    
    const marchesChantier = marches.filter(m => m.chantier_id === c.id);
    const montantBaseMarches = marchesChantier.reduce((sum, m) => sum + (m.montant || 0), 0);
    
    const avenantsChantier = avenants.filter(a => 
      a.chantier_id === c.id && 
      (a.statut === 'valide' || a.statut === 'signe')
    );
    const montantAvenants = avenantsChantier.reduce((sum, a) => sum + (a.montant_total_ht || 0), 0);
    
    const montantTotal = montantBaseMarches + montantAvenants;
    
    return montantTotal > c.budget_previsionnel;
  });

  const handleChantierClick = (chantierId) => {
    const url = new URL(window.location.origin + createPageUrl("ChantierDetails"));
    url.searchParams.set('chantierId', chantierId);
    navigate(url.pathname + url.search);
  };

  if (!canViewDashboard && !canViewChantiers) {
    return (
      <div className="p-4 md:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Card className="p-12 text-center">
            <Lock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Accès restreint
            </h3>
            <p className="text-gray-500">
              Vous n'avez pas la permission d'accéder au tableau de bord. Contactez un administrateur.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de bord</h1>
          <p className="text-gray-600">Vue d'ensemble de vos projets et financements</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Montant global"
            value={`${montantGlobalMarches.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
            icon={TrendingUp}
            iconColor="text-orange-600"
            iconBg="bg-orange-100"
          />
          
          <StatCard
            title="Chantiers actifs"
            value={chantiersActifs.length.toString()}
            icon={Building2}
            iconColor="text-blue-600"
            iconBg="bg-blue-100"
          />
          
          <StatCard
            title="Dépassements"
            value={chantiersDepassement.length.toString()}
            icon={AlertCircle}
            iconColor="text-red-600"
            iconBg="bg-red-100"
          />
        </div>

        <div className="space-y-6">
          {chantiersDepassement.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h2 className="text-xl font-bold text-gray-900">Alertes budgétaires</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {chantiersDepassement.map(chantier => (
                  <ChantierCard 
                    key={chantier.id}
                    chantier={chantier}
                    onClick={() => handleChantierClick(chantier.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Chantiers actifs</h2>
            {chantiersActifs.length === 0 ? (
              <Card className="p-12 text-center">
                <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Aucun chantier actif
                </h3>
                <p className="text-gray-500">
                  Les chantiers en cours apparaîtront ici
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {chantiersActifs.map(chantier => (
                  <ChantierCard 
                    key={chantier.id}
                    chantier={chantier}
                    onClick={() => handleChantierClick(chantier.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}