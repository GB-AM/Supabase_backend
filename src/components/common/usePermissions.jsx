import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function usePermissions() {
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
    // Raccourcis pour les permissions courantes
    canViewChantiers: hasPermission('chantiers_view'),
    canCreateChantiers: hasPermission('chantiers_create'),
    canEditChantiers: hasPermission('chantiers_edit'),
    canDeleteChantiers: hasPermission('chantiers_delete'),
    
    canViewMarches: hasPermission('marches_view'),
    canCreateMarches: hasPermission('marches_create'),
    canEditMarches: hasPermission('marches_edit'),
    canDeleteMarches: hasPermission('marches_delete'),
    canExportMarches: hasPermission('marches_export'),
    
    canViewTravauxSup: hasPermission('travaux_sup_view'),
    canCreateTravauxSup: hasPermission('travaux_sup_create'),
    canEditTravauxSup: hasPermission('travaux_sup_edit'),
    canDeleteTravauxSup: hasPermission('travaux_sup_delete'),
    
    canViewCertificats: hasPermission('certificats_view'),
    canCreateCertificats: hasPermission('certificats_create'),
    canEditCertificats: hasPermission('certificats_edit'),
    canValidateCertificats: hasPermission('certificats_validate'),
    canExportCertificats: hasPermission('certificats_export'),
    
    canManageClients: hasPermission('clients_manage'),
    canManageEntreprises: hasPermission('entreprises_manage'),
    canManagePartenaires: hasPermission('partenaires_manage'),
    canManageEquipe: hasPermission('equipe_manage'),
    
    canViewRapports: hasPermission('rapports_view'),
    canExportRapports: hasPermission('rapports_export'),
    
    canManageUsers: hasPermission('users_manage'),
  };
}