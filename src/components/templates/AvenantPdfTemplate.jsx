/**
 * ⚠️ TEMPLATE FIGÉ v2.7.1 FINAL - NE PAS MODIFIER
 * ========================================
 * Ce template est utilisé quand il n'y a pas de modèle client personnalisé
 * 
 * Structure FIGÉE :
 * - Header : Logo CLIENT à gauche, Logo GESTIONBAT à droite
 * - Footer : Architecte / GESTIONBAT / Autres partenaires (dans cet ordre)
 * - Ordre des partenaires : 1. Architecte, 2. GESTIONBAT, 3. Autres
 * 
 * ⚠️ TOUTE MODIFICATION DOIT ÊTRE VALIDÉE ET VERSIONNÉE
 * ========================================
 */

export function generateAvenantPdfHtml({
  avenant,
  chantier,
  client,
  entreprise,
  marche,
  devisAssocies,
  avenantsPrecedents,
  infoGestionbat,
  partenaires = [],
  tauxTVA = 20
}) {
  const logoGestionbat = infoGestionbat?.logo_url
    ? `<img src="${infoGestionbat.logo_url}" alt="Logo GESTIONBAT" style="max-width: 150px; max-height: 80px; object-fit: contain;" />`
    : '<p style="font-weight: bold; color: #f97316; font-size: 16pt;">GESTIONBAT</p>';

  const logoClient = chantier?.logo_client_url
    ? `<img src="${chantier.logo_client_url}" alt="Logo Client" style="max-width: 150px; max-height: 80px; object-fit: contain;" />`
    : '';

  // ✅ ORDRE DES PARTENAIRES FIGÉ : Architecte / GESTIONBAT / Autres
  const partenairesList = chantier?.partenaires || [];
  const partenairesData = partenairesList
    .map(p => {
      const partenaire = partenaires.find(part => part.id === p.partenaire_id);
      if (!partenaire) return null;
      return {
        nom: partenaire.nom,
        role: (p.role || '').toLowerCase()
      };
    })
    .filter(p => p !== null);
  
  const architecte = partenairesData.find(p => p.role.includes('architecte'));
  const autresPartenaires = partenairesData.filter(p => !p.role.includes('architecte'));
  
  const partenairesOrdonnes = [];
  if (architecte) {
    partenairesOrdonnes.push(architecte.nom);
  }
  partenairesOrdonnes.push(infoGestionbat?.nom_entreprise || 'GESTIONBAT');
  autresPartenaires.forEach(p => partenairesOrdonnes.push(p.nom));
  
  const partenairesString = partenairesOrdonnes.join(" / ");

  const montantTotalTTC = avenant.montant_total_ht * (1 + tauxTVA / 100);

  // Générer les lignes des devis
  const lignesDevis = devisAssocies.map((d, index) => {
    const montantTTC = d.montant_ht * (1 + tauxTVA / 100);
    const dateFormat = new Date(d.date_devis).toLocaleDateString('fr-FR');
    return `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td>${d.numero_devis || `No.${index + 1}`}</td>
        <td>${dateFormat}</td>
        <td>${d.intitule_devis}</td>
        <td style="text-align: center;">${d.type_devis}</td>
        <td style="text-align: right;">${d.montant_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
        <td style="text-align: right;">${montantTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
    `;
  }).join('');

  // Calculer les montants du marché
  const montantMarcheBase = marche?.montant || 0;
  const montantMarcheBaseTTC = montantMarcheBase * (1 + tauxTVA / 100);
  const montantTotalAvenantsPrecedentsHT = avenantsPrecedents.reduce((sum, av) => sum + (av.montant_total_ht || 0), 0);
  const montantTotalAvenantsPrecedentsTTC = montantTotalAvenantsPrecedentsHT * (1 + tauxTVA / 100);
  const nouveauMontantMarcheHT = montantMarcheBase + montantTotalAvenantsPrecedentsHT + avenant.montant_total_ht;
  const nouveauMontantMarcheTTC = nouveauMontantMarcheHT * (1 + tauxTVA / 100);

  // Générer les lignes des avenants précédents
  const lignesAvenantsPrecedents = avenantsPrecedents.length > 0 ? avenantsPrecedents.map(av => `
    <tr>
      <td>Avenant N°${av.numero}</td>
      <td style="text-align: right; font-weight: 600; color: #f97316;">${av.montant_total_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      <td style="text-align: right; font-weight: 600; color: #f97316;">${(av.montant_total_ht * (1 + tauxTVA / 100)).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
    </tr>
  `).join('') : '';

  const dateAvenant = new Date(avenant.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const dateFormatee = new Date().toLocaleDateString('fr-FR');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Avenant N° ${avenant.numero}</title>
  <style>
    @page { margin: 1.2cm; size: A4; }
    body {
      font-family: Arial, sans-serif;
      font-size: 8pt;
      margin: 0;
      padding: 10px;
      line-height: 1.3;
      color: #333;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #f97316;
      page-break-after: avoid;
    }
    .header-left {
      flex: 0 0 auto;
      min-width: 150px;
      max-width: 150px;
    }
    .header-center {
      flex: 1;
      text-align: center;
      padding: 0 10px;
    }
    .header-right {
      flex: 0 0 auto;
      min-width: 150px;
      max-width: 150px;
    }
    .header h1 {
      margin: 0 0 4px 0;
      font-size: 16pt;
      color: #f97316;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header .numero {
      font-size: 11pt;
      color: #666;
      font-weight: bold;
    }
    .header p {
      margin: 2px 0;
    }
    .section-title {
      font-size: 9pt;
      font-weight: bold;
      color: #f97316;
      margin: 10px 0 6px 0;
      padding-bottom: 3px;
      border-bottom: 1.5px solid #f97316;
      page-break-after: avoid;
    }
    .info-grid {
      display: table;
      width: 100%;
      margin-bottom: 8px;
      page-break-inside: avoid;
    }
    .info-row {
      display: table-row;
    }
    .info-label {
      display: table-cell;
      width: 30%;
      font-weight: 600;
      padding: 3px 10px 3px 0;
      vertical-align: top;
      color: #555;
      font-size: 7.5pt;
    }
    .info-value {
      display: table-cell;
      padding: 3px 0;
      vertical-align: top;
      color: #333;
      font-size: 7.5pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      font-size: 7pt;
      page-break-inside: avoid;
    }
    th {
      background-color: #f97316;
      color: white;
      padding: 6px 4px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #e86710;
      font-size: 7pt;
    }
    td {
      padding: 5px 4px;
      border: 1px solid #ddd;
      font-size: 7pt;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .total-row {
      font-weight: bold;
      background-color: #fff3e0 !important;
      border-top: 2px solid #f97316;
      page-break-inside: avoid;
    }
    .total-row td {
      padding: 5px 4px;
      font-size: 7pt;
    }
    .mentions-legales {
      margin: 12px 0;
      padding: 8px;
      background-color: #f8f9fa;
      border-left: 3px solid #f97316;
      font-size: 7pt;
      line-height: 1.4;
      page-break-inside: avoid;
    }
    .mentions-legales p {
      margin: 4px 0;
    }
    .signatures {
      margin-top: 15px;
      display: flex;
      justify-content: space-between;
      gap: 15px;
      page-break-inside: avoid;
    }
    .signature-bloc {
      flex: 1;
      text-align: center;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background-color: #fafafa;
      min-height: 150px;
    }
    .signature-bloc p {
      font-size: 7pt;
      margin: 3px 0;
    }
    .signature-bloc p strong {
      font-size: 7.5pt;
    }
    .signature-space {
      margin-top: 65px;
      border-bottom: 1px solid #333;
      margin-bottom: 5px;
    }
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 1.5cm;
      font-size: 8pt;
      color: #666;
      border-top: 1px solid #ddd;
      background: white;
    }
    .footer-left {
      flex: 1;
      text-align: left;
      font-size: 7pt;
    }
    .footer-center {
      flex: 1;
      text-align: center;
      font-weight: bold;
    }
    .footer-right {
      flex: 1;
      text-align: right;
    }
    @media print {
      .footer {
        position: fixed;
        bottom: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">${logoClient}</div>
    <div class="header-center">
      <h1>Avenant</h1>
      <p class="numero">N° ${avenant.numero}</p>
      <p style="margin-top: 5px; font-size: 8pt; color: #666;">Date : ${dateAvenant}</p>
    </div>
    <div class="header-right">${logoGestionbat}</div>
  </div>

  <h2 class="section-title">Informations du Chantier</h2>
  <div class="info-grid">
    <div class="info-row">
      <div class="info-label">Chantier :</div>
      <div class="info-value"><strong>${chantier?.nom || ''}</strong></div>
    </div>
    <div class="info-row">
      <div class="info-label">Adresse :</div>
      <div class="info-value">${chantier?.adresse || ''}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Maître d'Ouvrage :</div>
      <div class="info-value">
        <strong>${client?.nom || ''}</strong><br/>
        ${client?.adresse_1 || ''}<br/>
        ${client?.adresse_2 || '' ? client?.adresse_2 + '<br/>' : ''}
        ${client?.code_postal || ''} ${client?.ville || ''}
      </div>
    </div>
  </div>

  <h2 class="section-title">Entreprise</h2>
  <div class="info-grid">
    <div class="info-row">
      <div class="info-label">Raison sociale :</div>
      <div class="info-value"><strong>${entreprise?.nom || ''}</strong></div>
    </div>
    ${entreprise?.siret ? `
    <div class="info-row">
      <div class="info-label">SIRET :</div>
      <div class="info-value">${entreprise.siret}</div>
    </div>
    ` : ''}
    ${entreprise?.adresse_1 ? `
    <div class="info-row">
      <div class="info-label">Adresse :</div>
      <div class="info-value">
        ${entreprise.adresse_1}<br/>
        ${entreprise.adresse_2 ? entreprise.adresse_2 + '<br/>' : ''}
        ${entreprise.code_postal || ''} ${entreprise.ville || ''}
      </div>
    </div>
    ` : ''}
    ${marche?.numero_lot || marche?.intitule_lot ? `
    <div class="info-row">
      <div class="info-label">Lot :</div>
      <div class="info-value"><strong>${marche?.numero_lot || ''} ${marche?.numero_lot && marche?.intitule_lot ? '- ' : ''}${marche?.intitule_lot || ''}</strong></div>
    </div>
    ` : ''}
  </div>

  <h2 class="section-title">Détail des Devis Inclus</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 4%;">N°</th>
        <th style="width: 10%;">N° Devis</th>
        <th style="width: 10%;">Date</th>
        <th style="width: 38%;">Intitulé</th>
        <th style="width: 8%;">Type</th>
        <th style="width: 15%; text-align: right;">Montant HT</th>
        <th style="width: 15%; text-align: right;">Montant TTC</th>
      </tr>
    </thead>
    <tbody>
      ${lignesDevis}
      <tr class="total-row">
        <td colspan="5"><strong>MONTANT TOTAL DE L'AVENANT</strong></td>
        <td style="text-align: right;"><strong>${avenant.montant_total_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
        <td style="text-align: right;"><strong>${montantTotalTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
      </tr>
    </tbody>
  </table>

  <h2 class="section-title">Mise à jour du Montant Marché</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 60%;">Désignation</th>
        <th style="width: 20%; text-align: right;">Montant HT</th>
        <th style="width: 20%; text-align: right;">Montant TTC</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Marché de base</strong></td>
        <td style="text-align: right;">${montantMarcheBase.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
        <td style="text-align: right;">${montantMarcheBaseTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
      ${lignesAvenantsPrecedents}
      <tr>
        <td><strong>Avenant N°${avenant.numero} (actuel)</strong></td>
        <td style="text-align: right; font-weight: 600; color: #f97316;">${avenant.montant_total_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
        <td style="text-align: right; font-weight: 600; color: #f97316;">${montantTotalTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
      </tr>
      <tr class="total-row">
        <td><strong>NOUVEAU MONTANT MARCHÉ</strong></td>
        <td style="text-align: right;"><strong>${nouveauMontantMarcheHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
        <td style="text-align: right;"><strong>${nouveauMontantMarcheTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="mentions-legales">
    <p><strong>• Les conditions particulières et conditions générales du marché sont applicables au présent avenant.</strong></p>
    <p><strong>• Le présent avenant vaut ordre de service.</strong></p>
  </div>

  <div class="signatures">
    <div class="signature-bloc">
      <p><strong>Pour l'Entreprise</strong></p>
      <p style="margin-top: 3px;">${entreprise?.nom || ''}</p>
      <div class="signature-space"></div>
      <p style="font-style: italic; color: #666;">Signature</p>
    </div>
    <div class="signature-bloc">
      <p><strong>Pour la MOE</strong></p>
      <p style="margin-top: 3px;">${infoGestionbat?.nom_entreprise || 'GESTIONBAT'}</p>
      <div class="signature-space"></div>
      <p style="font-style: italic; color: #666;">Signature</p>
    </div>
    <div class="signature-bloc">
      <p><strong>Pour le Maître d'Ouvrage</strong></p>
      <p style="margin-top: 3px;">${client?.nom || ''}</p>
      <div class="signature-space"></div>
      <p style="font-style: italic; color: #666;">Signature</p>
    </div>
  </div>

  <div class="footer">
    <div class="footer-left">${partenairesString}</div>
    <div class="footer-center">Page 1</div>
    <div class="footer-right">${dateFormatee}</div>
  </div>
</body>
</html>`;
}