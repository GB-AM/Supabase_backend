import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Users, MapPin, Phone } from "lucide-react";

export default function ClientsList({ clients, onEdit }) {
  if (clients.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Aucun client enregistré
        </h3>
        <p className="text-gray-500">
          Ajoutez votre premier client pour commencer
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {clients.map((client) => (
        <Card key={client.id} className="p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
                  {client.nom}
                </h3>
                {client.siret && (
                  <Badge variant="outline" className="text-xs">
                    SIRET: {client.siret}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(client)}
              className="flex-shrink-0"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            {(client.adresse_1 || client.ville) && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  {client.adresse_1 && <div>{client.adresse_1}</div>}
                  {client.adresse_2 && <div>{client.adresse_2}</div>}
                  {(client.code_postal || client.ville) && (
                    <div>
                      {client.code_postal} {client.ville}
                    </div>
                  )}
                </div>
              </div>
            )}

            {client.telephone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>{client.telephone}</span>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}