import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#6b7280'];

const categorieLabels = {
  materiaux: "Matériaux",
  main_oeuvre: "Main d'œuvre",
  equipement: "Équipement",
  sous_traitance: "Sous-traitance",
  transport: "Transport",
  administratif: "Administratif",
  autres: "Autres"
};

export default function Rapports() {
  const [selectedChantier, setSelectedChantier] = useState("tous");

  const { data: chantiers, isLoading: loadingChantiers } = useQuery({
    queryKey: ['chantiers'],
    queryFn: () => base44.entities.Chantier.list(),
    initialData: [],
  });

  const { data: marches, isLoading: loadingMarches } = useQuery({
    queryKey: ['marches'],
    queryFn: () => base44.entities.MarcheEntreprise.list(),
    initialData: [],
  });

  const filteredMarches = selectedChantier === "tous" 
    ? marches 
    : marches.filter(m => m.chantier_id === selectedChantier);

  // Marchés par catégorie
  const marchesParCategorie = Object.entries(
    filteredMarches.reduce((acc, m) => {
      acc[m.categorie] = (acc[m.categorie] || 0) + m.montant;
      return acc;
    }, {})
  ).map(([categorie, montant]) => ({
    categorie: categorieLabels[categorie],
    montant: parseFloat(montant.toFixed(2))
  }));

  // Marchés par chantier
  const marchesParChantier = chantiers.map(chantier => {
    const marchesChantier = marches.filter(m => m.chantier_id === chantier.id);
    const total = marchesChantier.reduce((sum, m) => sum + m.montant, 0);
    // ✅ FIX: Ajout d'une valeur par défaut pour éviter .substring() sur undefined
    const nomChantier = chantier.nom || 'Chantier sans nom';
    return {
      nom: nomChantier.length > 20 ? nomChantier.substring(0, 20) + '...' : nomChantier,
      marches: parseFloat(total.toFixed(2)),
      budget: chantier.budget_total
    };
  }).filter(c => c.marches > 0);

  const isLoading = loadingChantiers || loadingMarches;

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Rapports</h1>
          <p className="text-gray-600">Analyses et statistiques de vos chantiers</p>
        </div>

        <div className="mb-6">
          <Select value={selectedChantier} onValueChange={setSelectedChantier}>
            <SelectTrigger className="w-full md:w-64 bg-white">
              <SelectValue placeholder="Filtrer par chantier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les chantiers</SelectItem>
              {chantiers.map(chantier => (
                <SelectItem key={chantier.id} value={chantier.id}>
                  {chantier.nom || 'Chantier sans nom'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Marchés par catégorie */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Répartition des marchés par catégorie</CardTitle>
              </CardHeader>
              <CardContent>
                {marchesParCategorie.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Aucun marché à afficher
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={marchesParCategorie}
                          dataKey="montant"
                          nameKey="categorie"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={(entry) => `${entry.categorie}: ${entry.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`}
                        >
                          {marchesParCategorie.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`} />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="space-y-3">
                      {marchesParCategorie.map((item, index) => (
                        <div key={item.categorie} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium">{item.categorie}</span>
                          </div>
                          <span className="font-bold text-orange-600">
                            {item.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Marchés vs Budget par chantier */}
            {selectedChantier === "tous" && (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Marchés vs Budget par chantier</CardTitle>
                </CardHeader>
                <CardContent>
                  {marchesParChantier.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      Aucune donnée à afficher
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={marchesParChantier}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="nom" />
                        <YAxis tickFormatter={(value) => `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`} />
                        <Tooltip formatter={(value) => `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`} />
                        <Legend />
                        <Bar dataKey="budget" fill="#3b82f6" name="Budget" />
                        <Bar dataKey="marches" fill="#f97316" name="Marchés" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}