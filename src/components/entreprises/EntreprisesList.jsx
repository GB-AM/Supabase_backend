import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Building, MapPin, Phone, User } from "lucide-react";

export default function EntreprisesList({ entreprises, onEdit }) {
  if (entreprises.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Building className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Aucune entreprise enregistrée
        </h3>
        <p className="text-gray-500">
          Ajoutez votre première entreprise pour commencer
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {entreprises.map((entreprise) => (
        <Card key={entreprise.id} className="p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
                  {entreprise.nom}
                </h3>
                {entreprise.siret && (
                  <Badge variant="outline" className="text-xs">
                    SIRET: {entreprise.siret}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(entreprise)}
              className="flex-shrink-0"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            {(entreprise.adresse_1 || entreprise.ville) && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  {entreprise.adresse_1 && <div>{entreprise.adresse_1}</div>}
                  {entreprise.adresse_2 && <div>{entreprise.adresse_2}</div>}
                  {(entreprise.code_postal || entreprise.ville) && (
                    <div>
                      {entreprise.code_postal} {entreprise.ville}
                    </div>
                  )}
                </div>
              </div>
            )}

            {entreprise.telephone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>{entreprise.telephone}</span>
              </div>
            )}

            {(entreprise.representant_nom || entreprise.representant_prenom) && (
              <div className="flex items-start gap-2 pt-2 border-t mt-2">
                <User className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-600" />
                <div>
                  <p className="text-xs text-gray-500 mb-1">Représentée par:</p>
                  <p className="font-medium text-gray-900">
                    {entreprise.representant_civilite} {entreprise.representant_prenom} {entreprise.representant_nom}
                  </p>
                  {entreprise.representant_qualite && (
                    <p className="text-xs text-gray-500 italic">{entreprise.representant_qualite}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}