import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  FileText,
  File,
  Globe,
  Info,
  Download,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSignedUrl } from "@/services/api/privateDocumentService";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Helper function to parse markdown bullet points
const parseMarkdownBullets = (markdown?: string): string[] => {
  if (!markdown) return [];
  return markdown
    .split("\n")
    .filter((line) => line.trim().startsWith("*"))
    .map((line) => line.replace(/^\*\s+/, "").trim());
};

// Helper function to parse markdown sections
const parseMarkdownSections = (
  markdown?: string
): Array<{ title: string; content: string }> => {
  if (!markdown) return [];

  const sections: Array<{ title: string; content: string }> = [];
  const lines = markdown.split("\n");

  lines.forEach((line) => {
    const match = line.match(/^\*\s+\*\*(.*?):(.*)/);
    if (match) {
      sections.push({
        title: match[1].trim(),
        content: match[2].trim(),
      });
    }
  });

  return sections;
};

type SourceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  source: {
    id: string;
    title: string;
    domain: string;
    preview: string;
    date?: string;
    size?: string;
    tags?: string[];
    type?: string;
    pdfUrl?: string;
    url?: string;
    isPublic?: boolean;
    ai_summary?: string;
    ai_key_sections?: string;
    ai_citations?: string;
  } | null;
};

const SourceModal: React.FC<SourceModalProps> = ({
  isOpen,
  onClose,
  source,
}) => {
  const [tab, setTab] = useState("document");
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isPdf =
    source?.type?.toLowerCase() === "pdf" ||
    source?.pdfUrl?.toLowerCase().endsWith(".pdf");

  // Fetch signed URL for private documents when modal opens
  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!source || !source.pdfUrl) return;

      try {
        setIsLoading(true);
        // For public files, use the URL directly
        if (source.isPublic) {
          setDocumentUrl(source.pdfUrl);
        }
        // For private files, generate a signed URL
        else {
          const signedUrl = await getSignedUrl(source.pdfUrl);
          setDocumentUrl(signedUrl);
        }
      } catch (error) {
        console.error("Failed to generate signed URL:", error);
        setDocumentUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && source && isPdf) {
      fetchSignedUrl();
    } else {
      setDocumentUrl(null);
    }
  }, [isOpen, source, isPdf]);

  if (!source) return null;

  // Handle file download or view
  const handleDownload = async () => {
    if (!documentUrl && source?.pdfUrl && !source.isPublic) {
      try {
        setIsLoading(true);
        const signedUrl = await getSignedUrl(source.pdfUrl);
        window.open(signedUrl, "_blank");
      } catch (error) {
        console.error("Failed to generate download URL:", error);
      } finally {
        setIsLoading(false);
      }
    } else if (documentUrl) {
      window.open(documentUrl, "_blank");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-full h-[100vh] sm:h-[90vh] max-h-[100vh] sm:max-h-[90vh] p-0 overflow-hidden">
        {/* Header with document title and close button */}
        <div className="flex-none p-4 sm:p-6 border-b bg-background flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            {isPdf ? (
              <File className="h-5 w-5 text-red-500 shrink-0" />
            ) : (
              <FileText className="h-5 w-5 text-purple-600 shrink-0" />
            )}
            <DialogTitle className="text-lg font-medium truncate">
              {source.title}
            </DialogTitle>
          </div>

          {/* Download button for PDFs */}
          {isPdf && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={handleDownload}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="text-sm">Loading...</span>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Open Document</span>
                </>
              )}
            </Button>
          )}
        </div>

        {/* Mobile Tabs */}
        <div className="flex-none block md:hidden px-4 pt-2 pb-2 border-b bg-background">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="document" className="flex-1">
                Document
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex-1">
                AI Insights
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Main content layout - subtract header height */}
        <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] sm:h-[calc(90vh-120px)] overflow-hidden">
          {/* Document Tab */}
          <div
            className={`h-full flex-1 flex flex-col overflow-hidden ${
              tab !== "document" && "hidden md:flex"
            }`}
          >
            <div className="flex-none flex items-center justify-between border-b p-3 md:hidden">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {source.domain}
                </span>
              </div>
              {source.date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {source.date}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Document meta information (desktop) */}
              <div className="flex-none hidden md:flex items-center justify-between p-4 sm:p-6 border-b">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {source.domain}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {source.date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {source.date}
                      </span>
                    </div>
                  )}
                  {source.size && (
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {source.size}
                    </span>
                  )}
                  {source.type && (
                    <Badge variant="outline" className="text-xs">
                      {source.type}
                    </Badge>
                  )}
                </div>
              </div>

              {/* PDF Preview */}
              {isPdf ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {documentUrl ? (
                    <div className="flex-1 relative min-h-0">
                      <iframe
                        src={`${documentUrl}#toolbar=0`}
                        className="absolute inset-0 w-full h-full border-0"
                        title="PDF Document"
                      >
                        <div className="flex flex-col items-center justify-center h-full text-center p-4">
                          <FileText className="h-12 w-12 text-gray-400 mb-4" />
                          <p className="text-gray-500 dark:text-gray-400 mb-4">
                            Unable to display PDF directly
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownload}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </Button>
                        </div>
                      </iframe>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-4">
                      <div className="flex flex-col items-center justify-center text-center p-8 max-w-md border rounded-lg bg-gray-50 dark:bg-gray-800/30">
                        <FileText className="h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          {isLoading ? "Loading document..." : "PDF preview not available"}
                        </p>
                        {(source.pdfUrl || !source.isPublic) && !isLoading && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownload}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View PDF in Browser
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4 sm:p-6">
                    {/* Tags */}
                    {source.tags && source.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-6">
                        {source.tags.map((tag, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Document content */}
                    <div className="prose prose-sm md:prose dark:prose-invert max-w-none">
                      {source.preview.split("\n").map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                    </div>

                    {/* Document preview placeholder */}
                    {source.preview ===
                      "No preview available for this document." && (
                      <div className="flex flex-col items-center justify-center text-center p-8 my-8 border rounded-lg bg-gray-50 dark:bg-gray-800/30">
                        <FileText className="h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 mb-2">
                          Document Preview Placeholder
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-4">
                          This is where the document content would be displayed
                          in a production environment.
                        </p>
                        {source.pdfUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={handleDownload}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Document
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Insights Tab */}
          <div
            className={`h-full w-full md:w-1/3 flex flex-col overflow-hidden border-l ${
              tab !== "insights" && "hidden md:flex"
            }`}
          >
            <div className="flex-none p-4 sm:p-6 border-b">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                AI Insights
              </h3>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4">
                <Accordion type="single" collapsible defaultValue="summary">
                  {source.ai_summary && (
                    <AccordionItem value="summary" className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2 [&[data-state=open]]:text-primary">
                        <h4 className="text-sm font-medium">Summary</h4>
                      </AccordionTrigger>
                      <AccordionContent className="max-h-[300px] overflow-y-auto">
                        <p className="text-sm text-gray-600 dark:text-gray-300 pt-2 pr-2">
                          {source.ai_summary}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {source.ai_key_sections && (
                    <AccordionItem value="sections" className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2 [&[data-state=open]]:text-primary">
                        <h4 className="text-sm font-medium">
                          Relevant Sections
                        </h4>
                      </AccordionTrigger>
                      <AccordionContent className="max-h-[300px] overflow-y-auto">
                        <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-300 space-y-2 pt-2 pr-2">
                          {parseMarkdownSections(source.ai_key_sections).map(
                            (section, index) => (
                              <li key={index}>
                                <span className="font-medium">
                                  {section.title}:
                                </span>{" "}
                                {section.content}
                              </li>
                            )
                          )}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {source.ai_citations && (
                    <AccordionItem value="citations" className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2 [&[data-state=open]]:text-primary">
                        <h4 className="text-sm font-medium">Key Citations</h4>
                      </AccordionTrigger>
                      <AccordionContent className="max-h-[300px] overflow-y-auto">
                        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1 pt-2 pr-2">
                          {parseMarkdownBullets(source.ai_citations).map(
                            (citation, index) => (
                              <p key={index}>- {citation}</p>
                            )
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>

                <section className="mt-6 bg-white dark:bg-gray-700 rounded-lg p-3">
                  <h4 className="text-sm font-medium mb-1">
                    Source Information
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Document from {source.domain}
                    <br />
                    Format: {source.type || "PDF"} ·{" "}
                    {source.date ? `Published: ${source.date}` : "Date unknown"}
                  </p>
                </section>

                {(source.ai_summary ||
                  source.ai_key_sections ||
                  source.ai_citations) && (
                  <section className="mt-4 bg-white dark:bg-gray-700 rounded-lg p-3 border-l-4 border-yellow-500">
                    <h4 className="text-sm font-medium mb-1">Analysis Note</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      This analysis was generated by an AI model based on the
                      document's semantic content. While it highlights
                      potentially relevant information, it may contain
                      inaccuracies, omissions, or misinterpretations. Please
                      review critically before relying on it.
                    </p>
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SourceModal;
