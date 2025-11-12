// ⚠️ COMPOSANT FIGÉ - Liste des marchés avec modification
// Ce composant affiche la liste des marchés dans un tableau avec bouton de modification
// NE PAS MODIFIER sans validation

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Building } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function MarchesList({ marches, chantiers, entreprises, onEdit }) {
  const getChantierName = (chantierId) => {
    if (!chantiers || chantiers.length === 0) return "Chantier";
    const chantier = chantiers.find(c => c && c.id === chantierId);
    return chantier?.nom || "Chantier inconnu";
  };

  const getEntrepriseName = (entrepriseId) => {
    const entreprise = entreprises.find(e => e.id === entrepriseId);
    return entreprise?.nom || "Entreprise inconnue";
  };

  const calculateMontantTTC = (montantHT, tauxTVA) => {
    const tva = tauxTVA || 20;
    return montantHT + (montantHT * tva / 100);
  };

  if (marches.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Building className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Aucun marché enregistré
        </h3>
        <p className="text-gray-500">
          Ajoutez votre premier marché pour commencer
        </p>
      </Card>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-orange-600 text-white">
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">N° Lot</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap min-w-[200px]">Intitulé</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap min-w-[150px]">Entreprise</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Date</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">Montant HT</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">Taux de TVA</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">Montant TTC</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">N° Marché</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">Caution</th>
              {onEdit && (
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {marches.map((marche, index) => {
              const montantTTC = calculateMontantTTC(marche.montant, marche.taux_tva);
              
              return (
                <tr 
                  key={marche.id} 
                  className={`border-b hover:bg-orange-50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3">
                    {marche.numero_lot ? (
                      <Badge variant="outline" className="font-mono">
                        {marche.numero_lot}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{marche.intitule_lot}</div>
                    {marche.notes && (
                      <div className="text-xs text-gray-500 mt-1">{marche.notes}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {getEntrepriseName(marche.entreprise_id)}
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {format(new Date(marche.date), "dd/MM/yyyy", { locale: fr })}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-orange-600 whitespace-nowrap">
                    {marche.montant.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700 whitespace-nowrap">
                    {marche.taux_tva || 20}%
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600 whitespace-nowrap">
                    {montantTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {marche.numero_marche || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={marche.a_caution ? "default" : "outline"} className="whitespace-nowrap">
                      {marche.a_caution ? "Oui" : "Non"}
                    </Badge>
                  </td>
                  {onEdit && (
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(marche)}
                        className="hover:bg-orange-100"
                        title="Modifier le marché"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
            
            <tr className="bg-orange-50 border-t-2 border-orange-600 font-bold">
              <td colSpan="4" className="px-4 py-4 text-right text-gray-900">
                TOTAL
              </td>
              <td className="px-4 py-4 text-right text-orange-600 whitespace-nowrap">
                {marches.reduce((sum, m) => sum + (m.montant || 0), 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </td>
              <td></td>
              <td className="px-4 py-4 text-right text-green-600 whitespace-nowrap">
                {marches.reduce((sum, m) => sum + calculateMontantTTC(m.montant, m.taux_tva), 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </td>
              <td colSpan={onEdit ? "3" : "2"}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}