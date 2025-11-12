/**
 * Schéma figé pour le formulaire de création/modification de devis
 * NE PAS MODIFIER sans validation
 */

export const DEVIS_FORM_SCHEMA = {
  sections: [
    {
      id: "entreprise",
      fields: [
        {
          name: "entreprise_id",
          label: "Entreprise",
          type: "select-entreprise",
          placeholder: "Sélectionner l'entreprise",
          required: true,
          description: "Entreprise ayant fourni le devis"
        }
      ]
    },
    {
      id: "identification",
      fields: [
        {
          name: "numero_devis",
          label: "Numéro du devis",
          type: "text",
          placeholder: "Ex: DEV-2024-001, 123, A1B2...",
          required: false,
          description: "Numéro du devis fourni par l'entreprise",
          col: 2
        },
        {
          name: "date_devis",
          label: "Date du devis",
          type: "date",
          required: true,
          col: 2
        }
      ]
    },
    {
      id: "description",
      fields: [
        {
          name: "intitule_devis",
          label: "Intitulé du devis",
          type: "text",
          placeholder: "Description des travaux",
          required: true
        }
      ]
    },
    {
      id: "montant",
      fields: [
        {
          name: "montant_ht",
          label: "Montant HT (€)",
          type: "number",
          step: "0.01",
          min: "0.01",
          placeholder: "0.00",
          required: true,
          col: 2
        },
        {
          name: "type_devis",
          label: "Type de devis",
          type: "select",
          options: [
            { value: "TMA", label: "TMA (Travaux Modificatifs Architecte)" },
            { value: "TS", label: "TS (Travaux Supplémentaires)" }
          ],
          required: true,
          col: 2
        }
      ]
    },
    {
      id: "origine",
      fields: [
        {
          name: "origine_devis",
          label: "Origine du devis",
          type: "select",
          placeholder: "Sélectionner l'origine",
          options: [
            { value: "", label: "Aucune" },
            { value: "Aléas chantier", label: "Aléas chantier" },
            { value: "Demande MOA", label: "Demande MOA" },
            { value: "Anomalie conception", label: "Anomalie conception" }
          ],
          required: false
        }
      ]
    },
    {
      id: "document",
      fields: [
        {
          name: "devis_pdf_url",
          label: "Devis PDF",
          type: "file-upload",
          accept: ".pdf",
          required: false
        }
      ]
    },
    {
      id: "notes",
      fields: [
        {
          name: "notes",
          label: "Notes",
          type: "textarea",
          placeholder: "Notes supplémentaires...",
          rows: 3,
          required: false
        }
      ]
    }
  ]
};

export const DEVIS_INITIAL_VALUES = {
  entreprise_id: "",
  numero_devis: "",
  date_devis: "",
  intitule_devis: "",
  montant_ht: "",
  type_devis: "TS",
  origine_devis: "",
  devis_pdf_url: "",
  statut: "brouillon",
  notes: ""
};

export const DEVIS_VALIDATION_RULES = {
  entreprise_id: {
    required: true,
    message: "Veuillez sélectionner une entreprise"
  },
  date_devis: {
    required: true,
    message: "Veuillez saisir une date"
  },
  intitule_devis: {
    required: true,
    minLength: 1,
    message: "Veuillez saisir un intitulé"
  },
  montant_ht: {
    required: true,
    min: 0.01,
    message: "Veuillez saisir un montant valide et supérieur à 0"
  },
  type_devis: {
    required: true,
    message: "Veuillez sélectionner un type de devis"
  }
};