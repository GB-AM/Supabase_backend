import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Chantiers from "./Chantiers";

import Rapports from "./Rapports";

import Entreprises from "./Entreprises";

import Clients from "./Clients";

import ChantierDetails from "./ChantierDetails";

import EquipeGestionbat from "./EquipeGestionbat";

import Partenaires from "./Partenaires";

import GestionUtilisateurs from "./GestionUtilisateurs";

import EditionDocuments from "./EditionDocuments";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Chantiers: Chantiers,
    
    Rapports: Rapports,
    
    Entreprises: Entreprises,
    
    Clients: Clients,
    
    ChantierDetails: ChantierDetails,
    
    EquipeGestionbat: EquipeGestionbat,
    
    Partenaires: Partenaires,
    
    GestionUtilisateurs: GestionUtilisateurs,
    
    EditionDocuments: EditionDocuments,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Chantiers" element={<Chantiers />} />
                
                <Route path="/Rapports" element={<Rapports />} />
                
                <Route path="/Entreprises" element={<Entreprises />} />
                
                <Route path="/Clients" element={<Clients />} />
                
                <Route path="/ChantierDetails" element={<ChantierDetails />} />
                
                <Route path="/EquipeGestionbat" element={<EquipeGestionbat />} />
                
                <Route path="/Partenaires" element={<Partenaires />} />
                
                <Route path="/GestionUtilisateurs" element={<GestionUtilisateurs />} />
                
                <Route path="/EditionDocuments" element={<EditionDocuments />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}