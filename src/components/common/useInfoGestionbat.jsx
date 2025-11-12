import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook réutilisable pour récupérer les informations de l'entreprise GESTIONBAT
 * Ces informations sont partagées dans toute l'application (logo, adresse, SIRET, etc.)
 * 
 * Utilisation:
 * const { infoGestionbat, isLoading } = useInfoGestionbat();
 */
export function useInfoGestionbat() {
  const { data: infoGestionbat, isLoading } = useQuery({
    queryKey: ['info-gestionbat'],
    queryFn: async () => {
      const infos = await base44.entities.InfoGestionbat.list();
      return infos.length > 0 ? infos[0] : null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - évite les requêtes répétées
  });

  return {
    infoGestionbat,
    isLoading,
    // Helpers pour accès facile
    nom: infoGestionbat?.nom_entreprise || 'GESTIONBAT',
    adresse: infoGestionbat?.adresse || '',
    codePostal: infoGestionbat?.code_postal || '',
    ville: infoGestionbat?.ville || '',
    telephone: infoGestionbat?.telephone || '',
    siret: infoGestionbat?.siret || '',
    logoUrl: infoGestionbat?.logo_url || '',
  };
}