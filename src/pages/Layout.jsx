

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Building2, Building, Users, FileText, LogOut, UserCog, Shield, RefreshCw } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const APP_VERSION = "2.8.5";

const navigationItems = [
  {
    title: "Tableau de bord",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Chantiers",
    url: createPageUrl("Chantiers"),
    icon: Building2,
  },
  {
    title: "Clients",
    url: createPageUrl("Clients"),
    icon: Users,
  },
  {
    title: "Entreprises",
    url: createPageUrl("Entreprises"),
    icon: Building,
  },
  {
    title: "Partenaires",
    url: createPageUrl("Partenaires"),
    icon: UserCog,
  },
  {
    title: "Equipe GESTIONBAT",
    url: createPageUrl("EquipeGestionbat"),
    icon: UserCog,
  },
  {
    title: "Rapports",
    url: createPageUrl("Rapports"),
    icon: FileText,
  },
  {
    title: "Gestion des utilisateurs",
    url: createPageUrl("GestionUtilisateurs"),
    icon: Shield,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  useEffect(() => {
    const storedVersion = localStorage.getItem('app_version');
    console.log(`📦 Version actuelle: ${APP_VERSION}, Version stockée: ${storedVersion || 'aucune'}`);
    
    if (storedVersion && storedVersion !== APP_VERSION) {
      console.log(`🔔 Nouvelle version disponible: ${APP_VERSION}`);
      setShowUpdateBanner(true);
    } else if (!storedVersion) {
      localStorage.setItem('app_version', APP_VERSION);
    }
  }, []);

  const handleUpdateApp = () => {
    console.log(`🔄 Mise à jour vers la version ${APP_VERSION}`);
    localStorage.setItem('app_version', APP_VERSION);
    sessionStorage.clear();
    
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    window.location.reload(true);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
        <Sidebar className="border-r border-gray-200">
          <SidebarHeader className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">GESTIONBAT</h2>
                <p className="text-xs text-gray-500">v{APP_VERSION}</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-orange-50 hover:text-orange-700 transition-colors duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-orange-50 text-orange-700 font-semibold' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 p-4">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => base44.auth.logout()}
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-semibold">GESTIONBAT v{APP_VERSION}</h1>
            </div>
          </header>

          {showUpdateBanner && (
            <Alert className="m-4 bg-blue-50 border-blue-200">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-sm text-blue-900">
                  <strong>Nouvelle version disponible !</strong> Version {APP_VERSION} avec de nouvelles fonctionnalités.
                </span>
                <div className="flex gap-2 ml-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowUpdateBanner(false)}
                    className="text-xs"
                  >
                    Plus tard
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleUpdateApp}
                    className="bg-blue-600 hover:bg-blue-700 text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Mettre à jour
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
      
      <Toaster 
        position="top-right"
        expand={false}
        richColors={false}
        closeButton={true}
        duration={1500}
        visibleToasts={2}
        toastOptions={{
          unstyled: false,
          style: {
            background: 'white',
            border: '1px solid #e5e7eb',
            fontSize: '12px',
            padding: '8px 12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          },
          classNames: {
            toast: 'toast-ultra-minimal',
            title: 'text-xs',
            description: 'text-xs',
          },
        }}
      />
    </SidebarProvider>
  );
}

