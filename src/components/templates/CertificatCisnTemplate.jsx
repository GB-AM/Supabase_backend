/**
 * ⚠️ TEMPLATE FIGÉ v2.8.5 - Certificat de paiement format CISN
 * ========================================
 * Template spécifique reproduisant le format CISN pour les certificats de paiement
 * 
 * MAPPING DES NUMÉROS (auto-remplissage) :
 * (1) = Numéro du certificat (auto-incrémenté par entreprise)
 * (2) = Nom du chantier (MAJUSCULES + GRAS)
 * (3) = Adresse du chantier
 * (4) = Date (à la date du...)
 * (5) = Date de situation
 * (6) = Numéro du lot
 * (7) = Nom de l'entreprise
 * (8) = Adresse entreprise
 * (9) = Téléphone entreprise
 * (10) = Numéro du marché
 * (11) = Taux de TVA
 * (12-14) = Montant marché (HT, TVA, TTC)
 * (15-17) = Avenants à ce jour (HT, TVA, TTC)
 * (18-20) = Total à ce jour (HT, TVA, TTC)
 * (21) = Montant sous-traité
 * (22) = Avancement du marché (%)
 * (23-25) = Travaux de base marché (Mois, Précédents, Cumulés)
 * (26-28) = Travaux sur avenants (Mois, Précédents, Cumulés)
 * (29-31) = Total des travaux (Mois, Précédents, Cumulés)
 * (32-35) = Retenue garantie marché initial (Taux, Mois, Précédents, Cumulés)
 * (36-39) = Retenue garantie avenant (Taux, Mois, Précédents, Cumulés)
 * (40-42) = Total retenue (Mois, Précédents, Cumulés)
 * (43-45) = Provision 3% (Mois, Précédents, Cumulés)
 * (46-48) = Total provision (Mois, Précédents, Cumulés)
 * (49-51) = Déblocage provision (Mois, Précédents, Cumulés)
 * (52-54) = Total HT (Mois, Précédents, Cumulés)
 * (55-57) = TVA (Mois, Précédents, Cumulés)
 * (58-60) = Total TTC (Mois, Précédents, Cumulés)
 * (61) = Date génération
 * 
 * ⚠️ NE PAS MODIFIER sans validation
 * ========================================
 */

export function generateCertificatCisnHtml({
  certificat,
  chantier,
  client,
  entreprise,
  marche,
  situationsPrecedentes = [],
  avenantsDeLEntreprise = [],
  paiementsSousTraitants = [],
  penalitesAppliquees = [],
  infoGestionbat,
  tauxTVA = 20
}) {
  // Calculs financiers
  const montantMarcheBase = marche?.montant || 0;
  const montantTotalAvenantsHT = avenantsDeLEntreprise.reduce((sum, av) => sum + (av.montant_total_ht || 0), 0);
  const montantMarcheAvecAvenants = montantMarcheBase + montantTotalAvenantsHT;
  
  const montantCumulePrecedentHT = situationsPrecedentes.reduce((sum, c) => sum + (c.montant_ht || 0), 0);
  const montantMoisHT = certificat.montant_ht || 0;
  const montantCumuleTotalHT = montantCumulePrecedentHT + montantMoisHT;
  
  const pourcentageAvancement = montantMarcheAvecAvenants > 0 
    ? ((montantCumuleTotalHT / montantMarcheAvecAvenants) * 100).toFixed(2) 
    : 0;

  // Retenue de garantie (5% si pas cautionné, 0% si cautionné)
  const tauxRetenue = marche?.a_caution ? 0 : 0.05;
  const retenueGarantieMarcheInitialMois = montantMarcheBase * tauxRetenue * (montantMoisHT / montantMarcheAvecAvenants);
  const retenueGarantieAvenantMois = montantTotalAvenantsHT * tauxRetenue * (montantMoisHT / montantMarcheAvecAvenants);
  const retenueGarantieTotalMois = retenueGarantieMarcheInitialMois + retenueGarantieAvenantMois;
  
  const retenueGarantieCumulee = montantMarcheAvecAvenants * tauxRetenue * (montantCumuleTotalHT / montantMarcheAvecAvenants);
  const retenueGarantiePrecedente = montantMarcheAvecAvenants * tauxRetenue * (montantCumulePrecedentHT / montantMarcheAvecAvenants);

  // Provision 3%
  const provisionMois = montantMoisHT * 0.03;
  const provisionCumulee = montantCumuleTotalHT * 0.03;
  const provisionPrecedente = montantCumulePrecedentHT * 0.03;

  // Pénalités
  const totalPenalitesMois = penalitesAppliquees.reduce((sum, p) => sum + (parseFloat(p.montant_calcule) || 0), 0);
  
  // Total HT, TVA, TTC
  const totalHTMois = montantMoisHT - retenueGarantieTotalMois - provisionMois;
  const totalHTPrecedent = montantCumulePrecedentHT - retenueGarantiePrecedente - provisionPrecedente;
  const totalHTCumule = montantCumuleTotalHT - retenueGarantieCumulee - provisionCumulee;
  
  const tvaMois = totalHTMois * (tauxTVA / 100);
  const tvaPrecedent = totalHTPrecedent * (tauxTVA / 100);
  const tvaCumulee = totalHTCumule * (tauxTVA / 100);
  
  const totalTTCMois = totalHTMois + tvaMois;
  const totalTTCPrecedent = totalHTPrecedent + tvaPrecedent;
  const totalTTCCumule = totalHTCumule + tvaCumulee;
  
  const montantFinalApresDeduction = totalTTCMois - totalPenalitesMois;
  
  // Sous-traitants
  const totalSousTraitantsHT = paiementsSousTraitants.reduce((sum, p) => sum + (parseFloat(p.montant_ht) || 0), 0);
  
  // Formatage dates
  const dateSituation = certificat.date_situation ? new Date(certificat.date_situation).toLocaleDateString('fr-FR') : '';
  const dateGeneration = new Date().toLocaleDateString('fr-FR');

  // Logo (utiliser logo client ou CISN par défaut)
  const logoUrl = chantier?.logo_client_url || '';
  const logoHtml = logoUrl 
    ? `<img src="${logoUrl}" alt="Logo" style="max-width: 120px; max-height: 60px; object-fit: contain;" />`
    : `<div style="font-weight: bold; color: #1e40af; font-size: 11pt; padding: 10px;">CISN<br/><span style="font-size: 7pt;">CONSTRUCTIONS</span></div>`;

  // Lignes de pénalités (toutes les pénalités du chantier)
  const penalitesChantier = chantier?.penalites || [];
  const lignesPenalites = penalitesChantier.map((penChantier, idx) => {
    const penaliteAppliquee = penalitesAppliquees.find(p => p.type_penalite === penChantier.type_penalite);
    const nombre = penaliteAppliquee ? (parseFloat(penaliteAppliquee.nombre) || 0) : 0;
    const montant = penaliteAppliquee ? (parseFloat(penaliteAppliquee.montant_calcule) || 0) : 0;
    
    return `
      <tr>
        <td style="padding: 3px 5px; border: 1px solid #999; font-size: 7pt;">${penChantier.type_penalite}</td>
        <td style="padding: 3px 5px; border: 1px solid #999; text-align: center; font-size: 7pt;">${nombre} ${penChantier.base.toLowerCase()}(s)</td>
        <td style="padding: 3px 5px; border: 1px solid #999; text-align: center; font-size: 7pt;">x ${penChantier.valeur.toFixed(2).replace('.', ',')} € H.T.</td>
        <td style="padding: 3px 5px; border: 1px solid #999; text-align: right; font-size: 7pt;">${montant.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
        <td style="padding: 3px 5px; border: 1px solid #999; text-align: right; font-size: 7pt;">${montant.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
        <td style="padding: 3px 5px; border: 1px solid #999; text-align: right; font-size: 7pt;">${montant.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
    `;
  }).join('');

  // Lignes paiements sous-traitants
  const lignesSousTraitants = paiementsSousTraitants.slice(0, 2).map((st, idx) => {
    const stEntreprise = entreprise; // Dans le contexte, on devrait récupérer l'entreprise réelle
    const montantHT = parseFloat(st.montant_ht) || 0;
    return `
      <tr>
        <td colspan="3" style="padding: 3px 5px; border: 1px solid #999; font-size: 7pt;">Dont paiement H.T. au sous traitant ${stEntreprise?.nom || ''}</td>
        <td style="padding: 3px 5px; border: 1px solid #999; text-align: right; font-size: 7pt;">${montantHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Certificat de Paiement N° ${certificat.numero}</title>
  <style>
    @page { 
      size: A4;
      margin: 0.5cm;
    }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 8pt; 
      margin: 0; 
      padding: 5px;
      line-height: 1.2;
      color: #000;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    td {
      border: 1px solid #000;
      padding: 4px;
      vertical-align: top;
    }
    .header-cell {
      background-color: #d9d9d9;
      font-weight: bold;
      text-align: center;
      padding: 8px 5px;
    }
    .no-border {
      border: none;
    }
    .border-bottom {
      border-bottom: 1px solid #000;
    }
    .border-right {
      border-right: 1px solid #000;
    }
    .text-center {
      text-align: center;
    }
    .text-right {
      text-align: right;
    }
    .bold {
      font-weight: bold;
    }
    .small {
      font-size: 7pt;
    }
    .tiny {
      font-size: 6pt;
    }
  </style>
</head>
<body>
  <!-- En-tête principal -->
  <table style="margin-bottom: 5px;">
    <tr>
      <td style="width: 15%; text-align: center; padding: 10px;">
        ${logoHtml}
      </td>
      <td class="header-cell" style="width: 85%; font-size: 11pt;">
        CERTIFICAT DE PAIEMENT N° : ${certificat.numero}
      </td>
    </tr>
  </table>

  <!-- Informations chantier et entreprise -->
  <table style="margin-bottom: 5px;">
    <tr>
      <td style="width: 50%; padding: 8px;">
        <div style="font-weight: bold; font-size: 10pt; text-transform: uppercase; margin-bottom: 5px;">
          ${chantier?.nom || ''}
        </div>
        <div style="font-size: 7pt;">
          ${chantier?.adresse || ''}
        </div>
        <div style="font-size: 7pt; margin-top: 10px;">
          à la date du ${dateSituation}
        </div>
      </td>
      <td style="width: 50%; vertical-align: top;">
        <table style="width: 100%; border: none;">
          <tr>
            <td style="border: none; border-bottom: 1px solid #000; padding: 4px; font-size: 7pt;">
              <strong>LOT N°</strong> ${marche?.numero_lot || ''}
            </td>
            <td rowspan="3" style="border: none; border-left: 1px solid #000; text-align: center; vertical-align: middle; font-weight: bold; font-size: 9pt;">
              SITUATION ${certificat.numero}
            </td>
          </tr>
          <tr>
            <td style="border: none; border-bottom: 1px solid #000; padding: 4px; font-size: 7pt;">
              <strong>ENTREPRISE</strong> ${entreprise?.nom || ''}
            </td>
          </tr>
          <tr>
            <td style="border: none; padding: 4px; font-size: 6pt;">
              ${entreprise?.adresse_1 || ''}<br/>
              ${entreprise?.telephone || ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Montants marché et avancement -->
  <table style="margin-bottom: 5px;">
    <tr>
      <td style="width: 50%; padding: 4px;">
        <table style="width: 100%; border: none;">
          <tr>
            <td style="border: none; font-size: 7pt; padding: 2px;">Marché n° <strong>${marche?.numero_marche || ''}</strong></td>
          </tr>
          <tr>
            <td style="border: none; font-size: 7pt; padding: 2px;">Taux de T.V.A. <strong>${tauxTVA}%</strong></td>
          </tr>
        </table>
      </td>
      <td style="width: 16%; text-align: center; font-size: 7pt; padding: 2px; font-weight: bold;">HT</td>
      <td style="width: 16%; text-align: center; font-size: 7pt; padding: 2px; font-weight: bold;">TVA</td>
      <td style="width: 18%; text-align: center; font-size: 7pt; padding: 2px; font-weight: bold;">TTC</td>
    </tr>
    <tr>
      <td style="font-size: 7pt; padding: 2px;">Montant du marché................................</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">${montantMarcheBase.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">${(montantMarcheBase * tauxTVA / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">${(montantMarcheBase * (1 + tauxTVA / 100)).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
    <tr>
      <td style="font-size: 7pt; padding: 2px;">Avenant(s) à ce jour.............................</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">${montantTotalAvenantsHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">${(montantTotalAvenantsHT * tauxTVA / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">${(montantTotalAvenantsHT * (1 + tauxTVA / 100)).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
    <tr style="background-color: #f0f0f0;">
      <td style="font-size: 7pt; padding: 2px; font-weight: bold;">Total à ce jour.......................................</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${montantMarcheAvecAvenants.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${(montantMarcheAvecAvenants * tauxTVA / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${(montantMarcheAvecAvenants * (1 + tauxTVA / 100)).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
    <tr>
      <td style="font-size: 7pt; padding: 2px;">Dont Montant sous traité</td>
      <td colspan="3" style="text-align: right; font-size: 7pt; padding: 2px;">${totalSousTraitantsHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
    <tr>
      <td colspan="4" style="font-size: 7pt; padding: 4px; text-align: center; font-weight: bold;">
        Avancement du Marché : ${pourcentageAvancement}%
      </td>
    </tr>
  </table>

  <!-- Section TRAVAUX -->
  <table style="margin-bottom: 5px;">
    <tr style="background-color: #d9d9d9;">
      <td colspan="4" style="font-size: 8pt; font-weight: bold; padding: 5px;">TRAVAUX</td>
    </tr>
    <tr>
      <td style="width: 40%; font-size: 7pt; padding: 2px;"></td>
      <td style="width: 20%; text-align: center; font-size: 7pt; padding: 2px; font-weight: bold; background-color: #f0f0f0;">Cumulés</td>
      <td style="width: 20%; text-align: center; font-size: 7pt; padding: 2px; font-weight: bold; background-color: #f0f0f0;">Précédents</td>
      <td style="width: 20%; text-align: center; font-size: 7pt; padding: 2px; font-weight: bold; background-color: #f0f0f0;">Mois</td>
    </tr>
    <tr>
      <td style="font-size: 7pt; padding: 2px;">Travaux de base marché</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">${montantCumuleTotalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">${montantCumulePrecedentHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">${montantMoisHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
    <tr>
      <td style="font-size: 7pt; padding: 2px;">Travaux sur avenants</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">0,00</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">0,00</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">0,00</td>
    </tr>
    <tr style="background-color: #f0f0f0;">
      <td style="font-size: 7pt; padding: 2px; font-weight: bold;">Total des travaux</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${montantCumuleTotalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${montantCumulePrecedentHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${montantMoisHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
    <tr>
      <td style="font-size: 7pt; padding: 2px;">Actualisation et révision de prix</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">0,00</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">0,00</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">0,00</td>
    </tr>
    <tr style="background-color: #f0f0f0;">
      <td style="font-size: 7pt; padding: 2px; font-weight: bold;">Total actualisé et révisé</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${montantCumuleTotalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${montantCumulePrecedentHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${montantMoisHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
    <tr>
      <td style="font-size: 6pt; padding: 2px;">3.4.1 Retenue de garantie ou caution bancaire (Marché initial)</td>
      <td style="text-align: center; font-size: 6pt; padding: 2px;">${(tauxRetenue * 100).toFixed(1)}%</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">${retenueGarantiePrecedente.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">${retenueGarantieMarcheInitialMois.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">${retenueGarantieCumulee.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
    <tr>
      <td style="font-size: 6pt; padding: 2px;">3.4.1 Retenue de garantie ou caution bancaire (Avenant)</td>
      <td style="text-align: center; font-size: 6pt; padding: 2px;">${(tauxRetenue * 100).toFixed(1)}%</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">0,00</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">${retenueGarantieAvenantMois.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">0,00</td>
    </tr>
    <tr style="background-color: #f0f0f0;">
      <td colspan="2" style="font-size: 7pt; padding: 2px; font-weight: bold;">Total retenue</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${retenueGarantiePrecedente.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${retenueGarantieTotalMois.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${retenueGarantieCumulee.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
    <tr>
      <td style="font-size: 6pt; padding: 2px;">3.4.6 Provision (compte-prorata, DOE, levées des réserves)</td>
      <td style="text-align: center; font-size: 6pt; padding: 2px;">3%</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">${provisionPrecedente.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">${provisionMois.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">${provisionCumulee.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
    <tr>
      <td colspan="2" style="font-size: 7pt; padding: 2px;">Autres retenues (ex: Compte Inter Entreprise)</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">0,00</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">0,00</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">0,00</td>
    </tr>
    <tr style="background-color: #f0f0f0;">
      <td colspan="2" style="font-size: 7pt; padding: 2px; font-weight: bold;">Total provision</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${provisionPrecedente.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${provisionMois.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${provisionCumulee.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
    <tr>
      <td colspan="2" style="font-size: 7pt; padding: 2px;">Déblocage provision</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">0,00</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">0,00</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">0,00</td>
    </tr>
    <tr style="background-color: #ffffcc;">
      <td colspan="2" style="font-size: 7pt; padding: 2px; font-weight: bold;">Total H.T.</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${totalHTPrecedent.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${totalHTMois.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${totalHTCumule.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
    <tr>
      <td colspan="2" style="font-size: 7pt; padding: 2px; font-weight: bold;">TVA</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">${tvaPrecedent.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">${tvaMois.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">${tvaCumulee.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
    <tr style="background-color: #ffffcc;">
      <td colspan="2" style="font-size: 7pt; padding: 2px; font-weight: bold;">Total T.T.C.</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${totalTTCPrecedent.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${totalTTCMois.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${totalTTCCumule.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
    <tr>
      <td colspan="4" style="font-size: 7pt; padding: 4px; text-align: right; font-weight: bold;">
        Montant des travaux de la présente situation : ${totalTTCMois.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
      </td>
    </tr>
  </table>

  <!-- Section PÉNALITÉS -->
  <table style="margin-bottom: 5px;">
    <tr style="background-color: #d9d9d9;">
      <td colspan="6" style="font-size: 8pt; font-weight: bold; padding: 5px;">
        PÉNALITÉS <span style="color: #cc0000; font-style: italic;">(Les pénalités ne sont pas soumises à TVA)</span>
      </td>
    </tr>
    <tr>
      <td style="width: 40%; font-size: 7pt; padding: 2px; font-weight: bold; background-color: #f0f0f0;">détails des pénalités</td>
      <td style="width: 12%; text-align: center; font-size: 7pt; padding: 2px; font-weight: bold; background-color: #f0f0f0;">Nbre/jrs</td>
      <td style="width: 12%; text-align: center; font-size: 7pt; padding: 2px; font-weight: bold; background-color: #f0f0f0;"></td>
      <td style="width: 12%; text-align: center; font-size: 7pt; padding: 2px; font-weight: bold; background-color: #f0f0f0;">Cumulés</td>
      <td style="width: 12%; text-align: center; font-size: 7pt; padding: 2px; font-weight: bold; background-color: #f0f0f0;">Précédents</td>
      <td style="width: 12%; text-align: center; font-size: 7pt; padding: 2px; font-weight: bold; background-color: #f0f0f0;">Mois</td>
    </tr>
    ${lignesPenalites}
    <tr style="background-color: #ffffcc;">
      <td colspan="3" style="font-size: 7pt; padding: 2px; font-weight: bold;">Total pénalités</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${totalPenalitesMois.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">0,00 €</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px; font-weight: bold;">${totalPenalitesMois.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
    </tr>
    <tr>
      <td colspan="3" style="font-size: 7pt; padding: 2px;">Déblocage pénalités</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">0,00 €</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">0,00 €</td>
      <td style="text-align: right; font-size: 7pt; padding: 2px;">0,00 €</td>
    </tr>
  </table>

  <!-- Récapitulatif final -->
  <table style="margin-bottom: 5px;">
    <tr style="background-color: #d9d9d9;">
      <td style="width: 25%; text-align: center; font-size: 7pt; padding: 3px; font-weight: bold;">H.T.</td>
      <td style="width: 25%; text-align: center; font-size: 7pt; padding: 3px; font-weight: bold;">T.V.A.</td>
      <td style="width: 25%; text-align: center; font-size: 7pt; padding: 3px; font-weight: bold;">Taux de T.V.A.</td>
      <td style="width: 25%; text-align: center; font-size: 7pt; padding: 3px; font-weight: bold;">T.T.C.</td>
      <td style="width: 25%; text-align: center; font-size: 7pt; padding: 3px; font-weight: bold;">TOTAL</td>
    </tr>
    <tr>
      <td style="text-align: right; font-size: 7pt; padding: 3px;">${totalHTMois.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-size: 7pt; padding: 3px;">${tvaMois.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: center; font-size: 7pt; padding: 3px;">${tauxTVA}%</td>
      <td style="text-align: right; font-size: 7pt; padding: 3px;">${totalTTCMois.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td rowspan="2" style="text-align: center; font-size: 10pt; padding: 3px; font-weight: bold; vertical-align: middle;">
        ${montantFinalApresDeduction.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
      </td>
    </tr>
    <tr>
      <td colspan="4" style="font-size: 7pt; padding: 3px; background-color: #ffffcc; font-weight: bold;">
        PENALITES Sans objet (BOI 3b-1-06) : ${totalPenalitesMois.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
      </td>
    </tr>
    <tr style="background-color: #66cc66;">
      <td colspan="4" style="font-size: 8pt; padding: 5px; font-weight: bold; text-align: center;">
        Montant du règlement de la présente situation
      </td>
      <td style="text-align: center; font-size: 10pt; padding: 5px; font-weight: bold;">
        ${montantFinalApresDeduction.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
      </td>
    </tr>
    ${lignesSousTraitants}
  </table>

  <!-- Signature -->
  <table>
    <tr>
      <td style="border: none; padding: 10px; text-align: center; font-size: 7pt;">
        <div>Fait à ${client?.ville || 'NANTES'}</div>
        <div style="margin-top: 5px;">Date : ${dateGeneration}</div>
        <div style="margin-top: 30px; font-style: italic;">Tampon + signature</div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}