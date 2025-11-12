import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Upload, Download, FileCheck, Loader2, AlertCircle, CheckCircle, Merge } from "lucide-react";
import { toast } from "sonner";

const DOCUMENT_TYPES = [
  { value: "certificat_paiement", label: "Certificat de paiement", template: "trame_certificats_url" },
  { value: "marche", label: "Marché entreprise", template: "trame_marches_url" },
  { value: "avenant", label: "Avenant", template: "trame_avenants_url" },
  { value: "rapport", label: "Rapport personnalisé", template: null },
];

export default function EditionDocuments() {
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [uploadedDocument, setUploadedDocument] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [documentType, setDocumentType] = useState("");
  const [selectedChantier, setSelectedChantier] = useState("");
  const [filledHtml, setFilledHtml] = useState("");
  const [finalPdfBase64, setFinalPdfBase64] = useState(null);
  const [additionalPdfs, setAdditionalPdfs] = useState([]);

  const { data: chantiers } = useQuery({
    queryKey: ['chantiers'],
    queryFn: () => base44.entities.Chantier.list('-created_date'),
    initialData: [],
  });

  const selectedChantierData = useMemo(() => {
    return chantiers.find(c => c.id === selectedChantier);
  }, [chantiers, selectedChantier]);

  const templateUrl = useMemo(() => {
    if (!documentType || !selectedChantierData) return null;
    const docType = DOCUMENT_TYPES.find(dt => dt.value === documentType);
    if (!docType || !docType.template) return null;
    return selectedChantierData[docType.template];
  }, [documentType, selectedChantierData]);

  const handleFileUpload = async (e, isAdditional = false) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      if (isAdditional) {
        setAdditionalPdfs([...additionalPdfs, { name: file.name, url: file_url }]);
        toast.success("PDF annexe ajouté");
      } else {
        setUploadedDocument({ name: file.name, url: file_url });
        toast.success("Document uploadé avec succès");
      }
    } catch (error) {
      console.error("Erreur upload:", error);
      toast.error("Erreur lors de l'upload du fichier");
    }
  };

  const handleExtractData = async () => {
    if (!uploadedDocument) {
      toast.error("Veuillez uploader un document PDF d'abord");
      return;
    }

    setProcessing(true);
    setProgress(20);

    try {
      const response = await base44.functions.invoke('extractDocument', {
        document: uploadedDocument.url
      });

      if (response.data.success) {
        setExtractedData(response.data.extracted_data);
        setStep(2);
        setProgress(40);
        toast.success("Données extraites avec succès");
      } else {
        throw new Error(response.data.error || "Erreur extraction");
      }
    } catch (error) {
      console.error("Erreur extraction:", error);
      toast.error("Erreur lors de l'extraction des données");
    } finally {
      setProcessing(false);
    }
  };

  const handleFillTemplate = async () => {
    if (!documentType || !selectedChantier) {
      toast.error("Sélectionnez un type de document et un chantier");
      return;
    }

    if (!templateUrl) {
      toast.error("Aucune trame définie pour ce chantier");
      return;
    }

    setProcessing(true);
    setProgress(50);

    try {
      const mappedData = {
        ...extractedData,
        "{{CHANTIER_NOM}}": selectedChantierData?.nom || '',
        "{{CHANTIER_ADRESSE}}": selectedChantierData?.adresse || '',
        "{{DATE_TODAY}}": new Date().toLocaleDateString('fr-FR'),
      };

      const response = await base44.functions.invoke('fillExcel', {
        template: templateUrl,
        data: mappedData
      });

      if (response.data.success) {
        setFilledHtml(response.data.html_content || "");
        setStep(3);
        setProgress(70);
        toast.success("Template rempli avec succès");
      } else {
        throw new Error(response.data.error || "Erreur remplissage");
      }
    } catch (error) {
      console.error("Erreur remplissage:", error);
      toast.error("Erreur lors du remplissage du template");
    } finally {
      setProcessing(false);
    }
  };

  const handleGeneratePdf = async () => {
    setProcessing(true);
    setProgress(80);

    try {
      const response = await base44.functions.invoke('htmlToPdf', {
        html_content: filledHtml,
        css: `
          @page { margin: 2cm; }
          body { font-family: Arial, sans-serif; font-size: 10pt; }
          .header { text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f97316; color: white; }
        `
      });

      if (response.data.success) {
        let finalPdf = response.data.pdf_base64;

        if (additionalPdfs.length > 0) {
          setProgress(90);
          const pdfsList = [
            { data: finalPdf, type: "base64" },
            ...additionalPdfs.map(pdf => ({ data: pdf.url, type: "url" }))
          ];

          const mergeResponse = await base44.functions.invoke('mergePdfs', {
            pdfs: pdfsList
          });

          if (mergeResponse.data.success) {
            finalPdf = mergeResponse.data.merged_pdf_base64;
            toast.success("PDFs fusionnés avec succès");
          }
        }

        setFinalPdfBase64(finalPdf);
        setStep(4);
        setProgress(100);
        toast.success("PDF généré avec succès !");
      } else {
        throw new Error(response.data.error || "Erreur conversion PDF");
      }
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!finalPdfBase64) return;

    try {
      const byteCharacters = atob(finalPdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `document_${documentType}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF téléchargé avec succès");
    } catch (error) {
      console.error("Erreur téléchargement:", error);
      toast.error("Erreur lors du téléchargement");
    }
  };

  const handleReset = () => {
    setStep(1);
    setProgress(0);
    setUploadedDocument(null);
    setExtractedData(null);
    setDocumentType("");
    setSelectedChantier("");
    setFilledHtml("");
    setFinalPdfBase64(null);
    setAdditionalPdfs([]);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Édition de Documents
          </h1>
          <p className="text-gray-600">
            Workflow automatisé de génération de documents PDF
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Progression</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Extraction</span>
                <span>Remplissage</span>
                <span>Conversion</span>
                <span>Téléchargement</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-orange-600" />
                Étape 1 : Upload et Extraction
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Uploadez un document PDF pour extraire automatiquement les données
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Document PDF source (optionnel)</Label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileUpload(e, false)}
                  className="cursor-pointer"
                />
                {uploadedDocument && (
                  <Alert>
                    <FileCheck className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{uploadedDocument.name}</strong> chargé
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleExtractData}
                  disabled={!uploadedDocument || processing}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Extraction...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Extraire les données
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(2);
                    setProgress(40);
                  }}
                >
                  Passer à l'étape suivante →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                Étape 2 : Configuration du Document
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Sélectionnez le type de document et le chantier
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {extractedData && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <strong>Données extraites :</strong> {Object.keys(extractedData).length} champs détectés
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type de document *</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(dt => (
                        <SelectItem key={dt.value} value={dt.value}>
                          {dt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Chantier *</Label>
                  <Select value={selectedChantier} onValueChange={setSelectedChantier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un chantier" />
                    </SelectTrigger>
                    <SelectContent>
                      {chantiers.map(chantier => (
                        <SelectItem key={chantier.id} value={chantier.id}>
                          {chantier.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {templateUrl && (
                <Alert>
                  <FileCheck className="h-4 w-4" />
                  <AlertDescription>
                    Trame trouvée pour ce type de document
                  </AlertDescription>
                </Alert>
              )}

              {!templateUrl && documentType && selectedChantier && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription>
                    Aucune trame définie pour ce chantier. Le document sera généré avec un template par défaut.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  ← Retour
                </Button>
                <Button
                  onClick={handleFillTemplate}
                  disabled={!documentType || !selectedChantier || processing}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Remplissage...
                    </>
                  ) : (
                    <>
                      Remplir le template →
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                Étape 3 : Génération du PDF
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Convertir le document en PDF et ajouter des annexes (optionnel)
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  Document rempli avec succès. Prêt pour la conversion PDF.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Ajouter des PDFs annexes (optionnel)</Label>
                <Input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={(e) => {
                    Array.from(e.target.files).forEach(file => {
                      handleFileUpload({ target: { files: [file] } }, true);
                    });
                  }}
                  className="cursor-pointer"
                />
                {additionalPdfs.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {additionalPdfs.map((pdf, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                        <Merge className="w-4 h-4 text-gray-500" />
                        <span>{pdf.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                >
                  ← Retour
                </Button>
                <Button
                  onClick={handleGeneratePdf}
                  disabled={processing}
                  className="bg-orange-600 hover:bg-orange-700 gap-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Génération du PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Générer le PDF final
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && finalPdfBase64 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                PDF Généré avec Succès !
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Votre document est prêt à être téléchargé
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  Le PDF a été généré avec succès{additionalPdfs.length > 0 ? ` et fusionné avec ${additionalPdfs.length} annexe(s)` : ''}.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  onClick={handleDownloadPdf}
                  className="bg-green-600 hover:bg-green-700 gap-2"
                  size="lg"
                >
                  <Download className="w-5 h-5" />
                  Télécharger le PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                >
                  Nouveau document
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}