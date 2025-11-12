
import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, User as UserIcon, Search, Calendar, Settings, CheckCircle, XCircle, RefreshCw, AlertCircle, Link as LinkIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

// Liste complète des permissions disponibles
const PERMISSIONS_DISPONIBLES = [
  {
    id: "chantiers_view",
    label: "Voir les chantiers",
    category: "Chantiers",
    description: "Consulter la liste des chantiers"
  },
  {
    id: "chantiers_create",
    label: "Créer des chantiers",
    category: "Chantiers",
    description: "Créer de nouveaux chantiers"
  },
  {
    id: "chantiers_edit",
    label: "Modifier les chantiers",
    category: "Chantiers",
    description: "Modifier les informations des chantiers"
  },
  {
    id: "chantiers_delete",
    label: "Supprimer les chantiers",
    category: "Chantiers",
    description: "Supprimer des chantiers"
  },
  {
    id: "marches_view",
    label: "Voir les marchés",
    category: "Marchés",
    description: "Consulter les marchés entreprises"
  },
  {
    id: "marches_create",
    label: "Créer des marchés",
    category: "Marchés",
    description: "Créer de nouveaux marchés"
  },
  {
    id: "marches_edit",
    label: "Modifier les marchés",
    category: "Marchés",
    description: "Modifier les marchés existants"
  },
  {
    id: "marches_delete",
    category: "Marchés",
    label: "Supprimer les marchés",
    description: "Supprimer des marchés"
  },
  {
    id: "marches_export",
    label: "Exporter les marchés",
    category: "Marchés",
    description: "Exporter les marchés en PDF/Excel"
  },
  {
    id: "travaux_sup_view",
    label: "Voir les travaux supplémentaires",
    category: "Travaux Supplémentaires",
    description: "Consulter les devis et avenants"
  },
  {
    id: "travaux_sup_create",
    label: "Créer des devis/avenants",
    category: "Travaux Supplémentaires",
    description: "Créer de nouveaux devis et avenants"
  },
  {
    id: "travaux_sup_edit",
    label: "Modifier des devis/avenants",
    category: "Travaux Supplémentaires",
    description: "Modifier les devis et avenants"
  },
  {
    id: "travaux_sup_delete",
    label: "Supprimer des devis/avenants",
    category: "Travaux Supplémentaires",
    description: "Supprimer des devis et avenants"
  },
  {
    id: "certificats_view",
    label: "Voir les certificats de paiement",
    category: "Certificats",
    description: "Consulter les situations mensuelles"
  },
  {
    id: "certificats_create",
    label: "Créer des certificats",
    category: "Certificats",
    description: "Créer de nouvelles situations"
  },
  {
    id: "certificats_edit",
    label: "Modifier des certificats",
    category: "Certificats",
    description: "Modifier les situations"
  },
  {
    id: "certificats_validate",
    label: "Valider des certificats",
    category: "Certificats",
    description: "Valider les situations mensuelles"
  },
  {
    id: "certificats_export",
    label: "Exporter des certificats",
    category: "Certificats",
    description: "Générer les PDF de certificats"
  },
  {
    id: "clients_manage",
    label: "Gérer les clients",
    category: "Contacts",
    description: "Créer, modifier et supprimer les clients"
  },
  {
    id: "entreprises_manage",
    label: "Gérer les entreprises",
    category: "Contacts",
    description: "Créer, modifier et supprimer les entreprises"
  },
  {
    id: "partenaires_manage",
    label: "Gérer les partenaires",
    category: "Contacts",
    description: "Créer, modifier et supprimer les partenaires"
  },
  {
    id: "equipe_manage",
    label: "Gérer l'équipe GESTIONBAT",
    category: "Contacts",
    description: "Gérer les membres de l'équipe"
  },
  {
    id: "rapports_view",
    label: "Voir les rapports",
    category: "Rapports",
    description: "Consulter les rapports financiers"
  },
  {
    id: "rapports_export",
    label: "Exporter les rapports",
    category: "Rapports",
    description: "Exporter les tableaux de suivi"
  },
  {
    id: "users_manage",
    label: "Gérer les utilisateurs",
    category: "Administration",
    description: "Gérer les utilisateurs et leurs permissions"
  },
];

export default function GestionUtilisateurs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [userToModify, setUserToModify] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [tempPermissions, setTempPermissions] = useState([]);
  const [syncing, setSyncing] = useState(false);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    initialData: [],
  });

  const { data: membresEquipe } = useQuery({
    queryKey: ['membres-equipe'],
    queryFn: () => base44.entities.MembreEquipe.list(),
    initialData: [],
  });

  // Synchroniser automatiquement au chargement si l'utilisateur courant n'existe pas dans la BDD
  useEffect(() => {
    if (currentUser && users.length > 0 && !isLoading && membresEquipe.length > 0) {
      const currentUserExists = users.some(u => u.email === currentUser.email);
      if (!currentUserExists) {
        handleSyncUsers();
      }
    }
  }, [currentUser, users, isLoading, membresEquipe]);


  // ✅ FIX v2.7.7 : Synchronisation améliorée pour lier TOUS les utilisateurs
  // Force la mise à jour du lien membre_equipe_id même pour les utilisateurs existants
  // =================================================================================
  const handleSyncUsers = async () => {
    setSyncing(true);
    try {
      let updateCount = 0;
      let createCount = 0;

      // Parcourir tous les utilisateurs existants
      for (const user of users) {
        // Chercher le membre d'équipe correspondant par email
        const membreEquipe = membresEquipe.find(m => 
          m.email && m.email.toLowerCase() === user.email.toLowerCase()
        );
        
        // Si un membre d'équipe est trouvé et que le lien n'existe pas ou est différent
        if (membreEquipe && user.membre_equipe_id !== membreEquipe.id) {
          await base44.entities.User.update(user.id, {
            membre_equipe_id: membreEquipe.id
          });
          updateCount++;
        }
      }

      // Ajouter l'utilisateur courant s'il n'existe pas encore
      if (currentUser) {
        const existingUser = users.find(u => u.email === currentUser.email);
        
        if (!existingUser) {
          const membreEquipe = membresEquipe.find(m => 
            m.email && m.email.toLowerCase() === currentUser.email.toLowerCase()
          );
          
          await base44.entities.User.create({
            email: currentUser.email,
            full_name: currentUser.full_name || currentUser.email,
            role: currentUser.role || 'user',
            permissions: currentUser.permissions || [],
            membre_equipe_id: membreEquipe?.id || null
          });
          createCount++;
        }
      }
      
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['current-user'] });

      if (updateCount > 0 || createCount > 0) {
        toast.success("Synchronisation réussie", {
          description: `${updateCount} lien${updateCount > 1 ? 's' : ''} mis à jour, ${createCount} utilisateur${createCount > 1 ? 's' : ''} créé${createCount > 1 ? 's' : ''}`,
        });
      } else {
        toast.success("Synchronisation terminée", {
          description: "Tous les utilisateurs sont déjà à jour",
        });
      }
    } catch (error) {
      console.error("Erreur de synchronisation:", error);
      toast.error("Erreur de synchronisation", {
        description: error.message || "Une erreur est survenue",
      });
    } finally {
      setSyncing(false);
    }
  };

  // ✅ FIN FIX v2.7.7
  // =================================================================================

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => base44.entities.User.update(userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setShowConfirmDialog(false);
      setUserToModify(null);
      setNewRole("");
      toast.success("Rôle modifié");
    },
    onError: (error) => {
      toast.error("Erreur lors de la modification du rôle");
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ userId, permissions }) => base44.entities.User.update(userId, { permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setShowPermissionsDialog(false);
      setSelectedUser(null);
      setTempPermissions([]);
      toast.success("Permissions modifiées");
    },
    onError: (error) => {
      toast.error("Erreur lors de la modification");
    },
  });

  const handleChangeRole = (user, role) => {
    setUserToModify(user);
    setNewRole(role);
    setShowConfirmDialog(true);
  };

  const confirmChangeRole = () => {
    if (userToModify && newRole) {
      updateRoleMutation.mutate({ userId: userToModify.id, role: newRole });
    }
  };

  const handleOpenPermissions = (user) => {
    setSelectedUser(user);
    setTempPermissions(user.permissions || []);
    setShowPermissionsDialog(true);
  };

  const handleTogglePermission = (permissionId) => {
    setTempPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(p => p !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const handleSavePermissions = () => {
    if (selectedUser) {
      updatePermissionsMutation.mutate({
        userId: selectedUser.id,
        permissions: tempPermissions
      });
    }
  };

  const handleToggleAllCategory = (category) => {
    const categoryPermissions = PERMISSIONS_DISPONIBLES
      .filter(p => p.category === category)
      .map(p => p.id);
    
    const allSelected = categoryPermissions.every(p => tempPermissions.includes(p));
    
    if (allSelected) {
      setTempPermissions(prev => prev.filter(p => !categoryPermissions.includes(p)));
    } else {
      setTempPermissions(prev => {
        const newPerms = [...prev];
        categoryPermissions.forEach(p => {
          if (!newPerms.includes(p)) {
            newPerms.push(p);
          }
        });
        return newPerms;
      });
    }
  };

  const getMembreEquipeForUser = (user) => {
    if (!user.membre_equipe_id) return null;
    return membresEquipe.find(m => m.id === user.membre_equipe_id);
  };

  const filteredUsers = useMemo(() => {
    let result = users;

    // Filtre par rôle
    if (roleFilter !== "all") {
      result = result.filter(u => u.role === roleFilter);
    }

    // Recherche textuelle
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u =>
        u.full_name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [users, roleFilter, searchQuery]);

  const getRoleBadgeColor = (role) => {
    return role === 'admin' 
      ? 'bg-purple-100 text-purple-800 border-purple-200' 
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getRoleLabel = (role) => {
    return role === 'admin' ? 'Administrateur' : 'Utilisateur';
  };

  const isCurrentUserAdmin = currentUser?.role === 'admin';

  // Vérifier si l'utilisateur courant existe dans la DB et s'il a un membre d'équipe lié
  const currentUserExists = users.some(u => u.email === currentUser?.email);
  const currentUserData = users.find(u => u.email === currentUser?.email);
  const currentUserHasMembreLink = currentUserData?.membre_equipe_id;


  const statsUsers = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    users: users.filter(u => u.role === 'user').length,
    linked: users.filter(u => u.membre_equipe_id).length, // New stat
  };

  // Grouper les permissions par catégorie
  const permissionsByCategory = useMemo(() => {
    const grouped = {};
    PERMISSIONS_DISPONIBLES.forEach(perm => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    });
    return grouped;
  }, []);

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des utilisateurs</h1>
          <p className="text-gray-600">Gérez les rôles et permissions des utilisateurs</p>
        </div>

        {!currentUserExists && currentUser && (
          <Card className="p-6 mb-6 bg-orange-50 border-orange-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-2">Votre compte n'est pas encore synchronisé</h3>
                <p className="text-sm text-orange-800 mb-3">
                  Pour que le système de permissions fonctionne correctement, votre compte doit être synchronisé avec la base de données.
                </p>
                <Button
                  onClick={handleSyncUsers}
                  disabled={syncing}
                  className="bg-orange-600 hover:bg-orange-700 gap-2"
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? "Synchronisation..." : "Synchroniser mon compte"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {currentUserExists && !currentUserHasMembreLink && (
          <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">Lien avec l'équipe GESTIONBAT manquant</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Votre compte n'est pas lié à un membre de l'équipe GESTIONBAT. Pour accéder aux chantiers dont vous êtes responsable, vous devez être lié à un membre d'équipe ayant la même adresse email.
                </p>
                <div className="text-xs text-blue-700 mb-3">
                  <p className="font-medium mb-1">Comment résoudre :</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Allez dans "Equipe GESTIONBAT"</li>
                    <li>Créez ou modifiez un membre avec votre email : <strong>{currentUser?.email}</strong></li>
                    <li>Revenez ici et cliquez sur "Synchroniser"</li>
                  </ol>
                </div>
                <Button
                  onClick={handleSyncUsers}
                  disabled={syncing}
                  variant="outline"
                  className="gap-2"
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? "Vérification..." : "Vérifier le lien"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {!isCurrentUserAdmin && (
          <Card className="p-4 bg-yellow-50 border-yellow-200 mb-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <Shield className="w-5 h-5" />
              <p className="text-sm font-medium">
                Vous n'avez pas les permissions d'administrateur. Vous pouvez uniquement consulter la liste des utilisateurs.
              </p>
            </div>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total utilisateurs</p>
                <p className="text-2xl font-bold text-gray-900">{statsUsers.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Administrateurs</p>
                <p className="text-2xl font-bold text-gray-900">{statsUsers.admins}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Utilisateurs</p>
                <p className="text-2xl font-bold text-gray-900">{statsUsers.users}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <LinkIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Liés à l'équipe</p>
                <p className="text-2xl font-bold text-gray-900">{statsUsers.linked}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filtres et recherche */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tous les rôles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              <SelectItem value="admin">Administrateurs</SelectItem>
              <SelectItem value="user">Utilisateurs</SelectItem>
            </SelectContent>
          </Select>

          {isCurrentUserAdmin && (
            <Button
              onClick={handleSyncUsers}
              disabled={syncing}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              Synchroniser
            </Button>
          )}
        </div>

        {/* Tableau des utilisateurs */}
        {isLoading ? (
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Aucun utilisateur trouvé
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || roleFilter !== "all"
                ? "Essayez de modifier vos critères de recherche"
                : "Aucun utilisateur enregistré"}
            </p>
            {isCurrentUserAdmin && (
              <Button
                onClick={handleSyncUsers}
                disabled={syncing}
                className="bg-orange-600 hover:bg-orange-700 gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                Synchroniser les utilisateurs
              </Button>
            )}
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Membre équipe</TableHead> {/* New table head */}
                    <TableHead>Rôle</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Date d'inscription</TableHead>
                    {isCurrentUserAdmin && <TableHead className="w-56">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const membreEquipe = getMembreEquipeForUser(user);
                    return (
                      <TableRow key={user.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-semibold">
                              {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{user.full_name || 'Sans nom'}</p>
                              {user.email === currentUser?.email && (
                                <Badge variant="outline" className="text-xs">Vous</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">{user.email}</TableCell>
                        <TableCell>
                          {membreEquipe ? (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              <LinkIcon className="w-3 h-3 mr-1" />
                              {membreEquipe.prenom} {membreEquipe.nom}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-gray-500">
                              Non lié
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getRoleBadgeColor(user.role)} border`}>
                            {user.role === 'admin' ? (
                              <><Shield className="w-3 h-3 mr-1" />{getRoleLabel(user.role)}</>
                            ) : (
                              <><UserIcon className="w-3 h-3 mr-1" />{getRoleLabel(user.role)}</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.role === 'admin' ? (
                              <Badge variant="outline" className="text-xs">
                                Tous les droits
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {(user.permissions || []).length} permission{(user.permissions || []).length > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {format(new Date(user.created_date), "dd MMMM yyyy", { locale: fr })}
                          </div>
                        </TableCell>
                        {isCurrentUserAdmin && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Select
                                value={user.role}
                                onValueChange={(value) => handleChangeRole(user, value)}
                                disabled={user.email === currentUser?.email}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">
                                    <div className="flex items-center gap-2">
                                      <UserIcon className="w-4 h-4" />
                                      Utilisateur
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="admin">
                                    <div className="flex items-center gap-2">
                                      <Shield className="w-4 h-4" />
                                      Admin
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenPermissions(user)}
                                disabled={user.role === 'admin'}
                                className="gap-2"
                              >
                                <Settings className="w-4 h-4" />
                                Permissions
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Dialog de confirmation changement de rôle */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer le changement de rôle</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir changer le rôle de <strong>{userToModify?.full_name || userToModify?.email}</strong> en{" "}
                <strong>{newRole === 'admin' ? 'Administrateur' : 'Utilisateur'}</strong> ?
                <br /><br />
                {newRole === 'admin' ? (
                  <span className="text-purple-600 font-medium">
                    ⚠️ Cet utilisateur aura tous les accès administrateur et toutes les permissions.
                  </span>
                ) : (
                  <span className="text-gray-600">
                    Cet utilisateur aura des accès limités selon ses permissions.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setUserToModify(null);
                setNewRole("");
              }}>
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmChangeRole}
                className="bg-orange-600 hover:bg-orange-700"
                disabled={updateRoleMutation.isPending}
              >
                {updateRoleMutation.isPending ? "Modification..." : "Confirmer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de gestion des permissions */}
        <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl">
                Gérer les permissions de {selectedUser?.full_name || selectedUser?.email}
              </DialogTitle>
              <DialogDescription>
                Cochez les permissions que vous souhaitez accorder à cet utilisateur
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-4">
              <div className="space-y-6">
                {Object.entries(permissionsByCategory).map(([category, permissions]) => {
                  const categoryPermissions = permissions.map(p => p.id);
                  const allSelected = categoryPermissions.every(p => tempPermissions.includes(p));

                  return (
                    <div key={category} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b">
                        <h3 className="font-semibold text-lg text-gray-900">{category}</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAllCategory(category)}
                          className="gap-2"
                        >
                          {allSelected ? (
                            <>
                              <XCircle className="w-4 h-4" />
                              Tout désélectionner
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Tout sélectionner
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {permissions.map((perm) => (
                          <div
                            key={perm.id}
                            className="flex items-start gap-3 p-3 bg-white rounded-lg border hover:border-orange-300 transition-colors"
                          >
                            <Checkbox
                              id={perm.id}
                              checked={tempPermissions.includes(perm.id)}
                              onCheckedChange={() => handleTogglePermission(perm.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor={perm.id}
                                className="font-medium cursor-pointer text-sm"
                              >
                                {perm.label}
                              </Label>
                              <p className="text-xs text-gray-500 mt-1">
                                {perm.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <div className="flex justify-between items-center w-full">
                <Badge variant="outline" className="text-sm">
                  {tempPermissions.length} permission{tempPermissions.length > 1 ? 's' : ''} sélectionnée{tempPermissions.length > 1 ? 's' : ''}
                </Badge>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPermissionsDialog(false);
                      setSelectedUser(null);
                      setTempPermissions([]);
                    }}
                    disabled={updatePermissionsMutation.isPending}
                  >
                    Annuler
                  </Button>
                  <Button
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={handleSavePermissions}
                    disabled={updatePermissionsMutation.isPending}
                  >
                    {updatePermissionsMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
