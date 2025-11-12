import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, UserCog, Mail, Phone, Trash2 } from "lucide-react";

export default function MembreEquipesList({ membres, onEdit, onDelete }) {
  if (membres.length === 0) {
    return (
      <Card className="p-12 text-center">
        <UserCog className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Aucun membre enregistré
        </h3>
        <p className="text-gray-500">
          Ajoutez votre premier membre d'équipe pour commencer
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {membres.map((membre) => (
        <Card key={membre.id} className="p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <UserCog className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <Badge variant="outline" className="text-xs mb-2">
                  {membre.civilite}
                </Badge>
                <h3 className="text-lg font-bold text-gray-900 truncate">
                  {membre.prenom} {membre.nom}
                </h3>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(membre)}
                title="Modifier"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(membre)}
                  title="Supprimer"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            {membre.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{membre.email}</span>
              </div>
            )}

            {membre.telephone_portable && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>{membre.telephone_portable}</span>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}