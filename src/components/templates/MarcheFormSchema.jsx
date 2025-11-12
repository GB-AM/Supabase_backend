/**
 * Schéma figé pour le formulaire de création/modification de marché
 * NE PAS MODIFIER sans validation
 */

export const MARCHE_FORM_SCHEMA = {
  sections: [
    {
      id: "general",
      title: "Informations générales",
      fields: [
        {
          name: "numero_lot",
          label: "N° Lot",
          type: "text",
          placeholder: "Ex: LOT-01",
          required: false,
          col: 2
        },
        {
          name: "intitule_lot",
          label: "Intitulé du lot",
          type: "text",
          placeholder: "Ex: Gros œuvre",
          required: true,
          col: 2
        },
        {
          name: "entreprise_id",
          label: "Entreprise",
          type: "select-entreprise",
          required: true,
          col: 2
        },
        {
          name: "date",
          label: "Date",
          type: "date",
          required: true,
          col: 2
        },
        {
          name: "numero_marche",
          label: "N° Marché",
          type: "text",
          placeholder: "Ex: M-2024-001",
          required: false,
          col: 3
        },
        {
          name: "montant",
          label: "Montant (€)",
          type: "number",
          step: "0.01",
          placeholder: "0.00",
          required: true,
          col: 3
        },
        {
          name: "taux_tva",
          label: "Taux de TVA (%)",
          type: "select",
          options: [
            { value: "5.5", label: "5,5%" },
            { value: "10", label: "10%" },
            { value: "20", label: "20%" }
          ],
          required: true,
          col: 3
        }
      ]
    },
    {
      id: "contact",
      title: "Contact",
      fields: [
        {
          name: "contact_civilite",
          label: "Civilité",
          type: "select",
          options: [
            { value: "Mademoiselle", label: "Mademoiselle" },
            { value: "Madame", label: "Madame" },
            { value: "Monsieur", label: "Monsieur" }
          ],
          required: false,
          col: 3
        },
        {
          name: "contact_nom",
          label: "Nom",
          type: "text",
          placeholder: "Nom du contact",
          required: false,
          col: 3
        },
        {
          name: "contact_email",
          label: "Email",
          type: "email",
          placeholder: "contact@exemple.fr",
          required: false,
          col: 2
        },
        {
          name: "contact_telephone",
          label: "Téléphone",
          type: "tel",
          placeholder: "01 23 45 67 89",
          required: false,
          col: 2
        }
      ]
    },
    {
      id: "cautions",
      title: "Cautions",
      hasCheckbox: true,
      checkboxName: "a_caution",
      checkboxLabel: "Ce marché a une caution",
      fields: [
        {
          name: "cautions",
          type: "array",
          itemSchema: {
            reference: {
              label: "Référence",
              type: "text",
              placeholder: "Réf. caution"
            },
            montant: {
              label: "Montant (€)",
              type: "number",
              step: "0.01",
              placeholder: "0.00"
            },
            date_ajout: {
              label: "Date",
              type: "date"
            }
          }
        }
      ]
    },
    {
      id: "documents",
      title: "Documents",
      fields: [
        {
          name: "documents",
          type: "file-upload",
          accept: ".pdf",
          documentTypes: ["caution", "marche", "autre"]
        }
      ]
    },
    {
      id: "notes",
      title: "Notes",
      fields: [
        {
          name: "notes",
          label: "Notes supplémentaires",
          type: "textarea",
          rows: 3,
          placeholder: "Notes supplémentaires...",
          required: false
        }
      ]
    }
  ]
};

export const MARCHE_INITIAL_VALUES = {
  numero_lot: "",
  intitule_lot: "",
  entreprise_id: "",
  date: new Date().toISOString().split('T')[0],
  numero_marche: "",
  montant: "",
  taux_tva: "20",
  contact_civilite: "Monsieur",
  contact_nom: "",
  contact_email: "",
  contact_telephone: "",
  a_caution: false,
  cautions: [],
  documents: [],
  notes: ""
};