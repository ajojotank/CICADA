import React, { useState, useRef, useEffect } from "react";
import { uploadDocument, fetchFolderStructure, FolderStructure } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FileUp, X, Loader2, Check, ChevronRight, ChevronDown, FolderOpen, Lock, Unlock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";

interface ProcessingStatus {
  stage: 'uploading' | 'processing' | 'complete' | null;
  message: string;
}

// Upload state interface for localStorage
interface UploadState {
  isUploading: boolean;
  uploadSuccess: boolean;
  processingStatus: ProcessingStatus;
  selectedFileName: string | null;
  selectedFileSize: number | null;
}

const UPLOAD_STATE_KEY = 'cicada-upload-state';

const UploadForm = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({ stage: null, message: '' });
  const [privateFolders, setPrivateFolders] = useState<FolderStructure[]>([]);
  const [publicFolders, setPublicFolders] = useState<FolderStructure[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const [metadata, setMetadata] = useState({
    title: "",
    description: "",
    date: "",
    tags: "",
    source: "",
    folder: "",
    isPublic: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderDropdownRef = useRef<HTMLDivElement>(null);

  // Effect to restore upload state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(UPLOAD_STATE_KEY);
    if (savedState) {
      const state: UploadState = JSON.parse(savedState);
      setIsUploading(state.isUploading);
      setUploadSuccess(state.uploadSuccess);
      setProcessingStatus(state.processingStatus);
      if (state.selectedFileName && state.selectedFileSize) {
        // Create a minimal File object to show the UI state
        const dummyFile = new File([], state.selectedFileName, {
          type: 'application/pdf',
          lastModified: Date.now()
        });
        Object.defineProperty(dummyFile, 'size', {
          value: state.selectedFileSize
        });
        setSelectedFile(dummyFile);
      }
    }
  }, []);

  // Effect to save upload state to localStorage
  useEffect(() => {
    if (isUploading || uploadSuccess || processingStatus.stage) {
      const state: UploadState = {
        isUploading,
        uploadSuccess,
        processingStatus,
        selectedFileName: selectedFile?.name || null,
        selectedFileSize: selectedFile?.size || null
      };
      localStorage.setItem(UPLOAD_STATE_KEY, JSON.stringify(state));
    } else {
      // Clean up localStorage when upload is complete or cancelled
      localStorage.removeItem(UPLOAD_STATE_KEY);
    }
  }, [isUploading, uploadSuccess, processingStatus, selectedFile]);

  // Effect to fetch folders
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const [privateFoldersData, publicFoldersData] = await Promise.all([
          fetchFolderStructure('private'),
          fetchFolderStructure('public')
        ]);

        setPrivateFolders(privateFoldersData);
        setPublicFolders(publicFoldersData);

        if (!metadata.folder) {
          const defaultFolders = metadata.isPublic ? publicFoldersData : privateFoldersData;
          if (defaultFolders.length > 0) {
            setMetadata(prev => ({ ...prev, folder: defaultFolders[0].path }));
          }
        }
      } catch (error) {
        console.error("Error fetching folders:", error);
      }
    };

    fetchFolders();

    const handleClickOutside = (event: MouseEvent) => {
      if (folderDropdownRef.current && !folderDropdownRef.current.contains(event.target as Node)) {
        setIsFolderDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [metadata.folder, metadata.isPublic]);

  // Effect to update folder when switching between public/private
  useEffect(() => {
    const folders = metadata.isPublic ? publicFolders : privateFolders;
    if (folders.length > 0 && (!metadata.folder || !folders.some(f => f.path === metadata.folder))) {
      setMetadata(prev => ({ ...prev, folder: folders[0].path }));
    }
  }, [metadata.isPublic, metadata.folder, privateFolders, publicFolders]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.type !== "application/pdf") {
      toast({
        title: "Error",
        description: "Only PDF files are supported.",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    setMetadata((prev) => ({
      ...prev,
      title: file.name.split(".")[0],
    }));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setMetadata((prev) => ({ ...prev, [name]: value }));
  };

  const toggleFolderExpanded = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const selectFolder = (path: string) => {
    setMetadata(prev => ({ ...prev, folder: path }));
    setIsFolderDropdownOpen(false);
  };

  const togglePrivacy = () => {
    setMetadata(prev => ({ ...prev, isPublic: !prev.isPublic }));
  };

  const renderFolderTree = (folders: FolderStructure[], depth = 0) => {
    if (!folders || folders.length === 0) {
      return (
        <section className="py-3 text-center text-gray-500 dark:text-gray-400">
          No folders or files
        </section>
      );
    }

    return folders.map((folder) => (
      <section key={folder.path} className="mb-1">
        <section 
          className={`flex items-center py-1.5 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
            metadata.folder === folder.path ? "bg-cicada-primary/10 text-cicada-primary" : ""
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => selectFolder(folder.path)}
        >
          {folder.children && folder.children.length > 0 ? (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 p-0 mr-1"
              onClick={(e) => toggleFolderExpanded(folder.path, e)}
            >
              {expandedFolders[folder.path] ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
            </Button>
          ) : (
            <section className="w-5 mr-1"></section>
          )}

          <FolderOpen className="h-4 w-4 mr-2 text-yellow-500" />
          <span className="text-sm">{folder.name}</span>
        </section>

        {folder.children && expandedFolders[folder.path] && (
          <section>
            {renderFolderTree(folder.children, depth + 1)}
          </section>
        )}
      </section>
    ));
  };

  const getFolderDisplayName = (path: string) => {
    const folders = metadata.isPublic ? publicFolders : privateFolders;

    const findFolder = (folders: FolderStructure[], path: string): string => {
      for (const folder of folders) {
        if (folder.path === path) return folder.name;
        if (folder.children) {
          const name = findFolder(folder.children, path);
          if (name) return name;
        }
      }
      return path;
    };

    return path ? findFolder(folders, path) : "Select Folder";
  };

  const handlePublicFolderChange = (value: string) => {
    setMetadata(prev => ({ ...prev, folder: value }));
  };

  const triggerDocumentProcessing = async (documentId: string, filename: string, isPublic: boolean) => {
    try {
      console.log('Starting document processing with:', {
        documentId,
        filename,
        isPublic,
        currentFolder: metadata.folder
      });
      
      setProcessingStatus({ stage: 'processing', message: 'Generating AI insights...' });
      
      // Get user ID for constructing the storage path
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("No authenticated user found");
      
      // File path is already the full storage path from the upload
      // No need to reconstruct it as it's already properly formatted with timestamp
      
      const payload = {
        document_id: documentId,
        file_path: filename, // This is already the full storage path from the upload
        bucket: isPublic ? 'public-files' : 'private-files',
        is_public: isPublic,
        user_id: userData.user.id
      };

      console.log('Calling edge function with payload:', payload);

      const { data, error } = await supabase.functions.invoke('parseUploadedDocuments', {
        body: payload,
      });

      console.log('Edge function response:', { data, error });

      if (error) throw error;

      setProcessingStatus({ stage: 'complete', message: 'Document processed successfully!' });
      toast({
        title: "Success",
        description: "Document processed and insights generated successfully!",
      });

      // Clear localStorage after successful completion
      localStorage.removeItem(UPLOAD_STATE_KEY);
    } catch (error) {
      console.error('Error processing document:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      setProcessingStatus({ stage: null, message: '' });
      toast({
        title: "Processing Error",
        description: "Failed to generate document insights. The file was uploaded but processing failed.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !metadata.title) {
      toast({
        title: "Error",
        description: "Please select a file and provide a title.",
        variant: "destructive"
      });
      return;
    }

    if (!metadata.folder) {
      toast({
        title: "Error",
        description: "Please select a folder for the document.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setProcessingStatus({ stage: 'uploading', message: 'Uploading document...' });

    try {
      const processedMetadata = {
        ...metadata,
        tags: metadata.tags.split(",").map((tag) => tag.trim()),
        fileSystemType: (metadata.isPublic ? 'public' : 'private') as 'public' | 'private',
        category: metadata.isPublic ? metadata.folder : "Private Category"
      };

      const response = await uploadDocument(selectedFile, processedMetadata);
      setUploadSuccess(true);
      toast({
        title: "Success",
        description: "File uploaded successfully!",
      });

      await triggerDocumentProcessing(
        response.id,
        response.filename,
        metadata.isPublic
      );

      // Clear localStorage and reset form after successful completion
      localStorage.removeItem(UPLOAD_STATE_KEY);
      setTimeout(() => {
        setSelectedFile(null);
        setMetadata({
          title: "",
          description: "",
          date: "",
          tags: "",
          source: "",
          folder: metadata.isPublic ? 
            (publicFolders.length > 0 ? publicFolders[0].path : "") : 
            (privateFolders.length > 0 ? privateFolders[0].path : ""),
          isPublic: metadata.isPublic
        });
        setUploadSuccess(false);
        setProcessingStatus({ stage: null, message: '' });
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      });
      setProcessingStatus({ stage: null, message: '' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {processingStatus.stage && (
        <Alert className="mb-4">
          <AlertDescription className="flex items-center gap-2">
            {processingStatus.stage === 'uploading' && <Loader2 className="h-4 w-4 animate-spin" />}
            {processingStatus.stage === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
            {processingStatus.stage === 'complete' && <Check className="h-4 w-4" />}
            {processingStatus.message}
          </AlertDescription>
        </Alert>
      )}

      <section
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-cicada-primary bg-cicada-primary/5"
            : selectedFile
            ? "border-green-500 bg-green-50 dark:bg-green-900/10"
            : "border-gray-300 dark:border-gray-700"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept=".pdf"
          className="hidden"
        />

        {selectedFile ? (
          <section className="py-4">
            <section className="flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-500" />
            </section>
            <h3 className="text-lg font-medium mb-1">File Selected</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
            <Button 
              variant="outline" 
              type="button"
              onClick={() => setSelectedFile(null)}
              className="text-sm"
            >
              <X className="h-4 w-4 mr-2" />
              Remove File
            </Button>
          </section>
        ) : (
          <section className="py-8">
            <section className="flex justify-center mb-4">
              <FileUp className="h-12 w-12 text-gray-400 dark:text-gray-600" />
            </section>
            <h3 className="text-lg font-medium mb-1">Drag & Drop File</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              or click to browse (PDF only)
            </p>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </Button>
          </section>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <section className="space-y-2">
              <Label htmlFor="title">Document Title *</Label>
              <Input
                id="title"
                name="title"
                value={metadata.title}
                onChange={handleInputChange}
                required
              />
            </section>

            <section className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={metadata.description}
                onChange={handleInputChange}
                rows={4}
              />
            </section>

            <section className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                name="tags"
                value={metadata.tags}
                onChange={handleInputChange}
                placeholder="e.g., constitution, amendment, case law"
              />
            </section>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <section className="space-y-2">
              <Label htmlFor="date">Document Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={metadata.date}
                onChange={handleInputChange}
              />
            </section>

            <section className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                name="source"
                value={metadata.source}
                onChange={handleInputChange}
                placeholder="e.g., congress.gov, supremecourt.gov"
              />
            </section>

            <section className="space-y-2">
              <Label htmlFor="privacy">Document Privacy</Label>
              <section className="flex items-center space-x-4 mt-2">
                <Switch 
                  id="privacy"
                  checked={metadata.isPublic} 
                  onCheckedChange={togglePrivacy}
                />
                <section className="flex items-center gap-1">
                  {metadata.isPublic ? (
                    <>
                      <Unlock className="h-4 w-4" />
                      <span>Public (available to all users)</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>Private (admin access only)</span>
                    </>
                  )}
                </section>
              </section>
            </section>

            <section className="space-y-2 h-40">
              <Label>Folder</Label>
              {metadata.isPublic ? (
                <Select value={metadata.folder} onValueChange={handlePublicFolderChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Categories</SelectLabel>
                      {publicFolders.map(folder => (
                        <SelectItem key={folder.path} value={folder.path}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : (
                <section className="space-y-2 relative" ref={folderDropdownRef}>
                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
                  >
                    <section className="flex items-center">
                      <FolderOpen className="h-4 w-4 mr-2 text-yellow-500" />
                      <span>{getFolderDisplayName(metadata.folder)}</span>
                    </section>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isFolderDropdownOpen ? "rotate-180" : ""}`} />
                  </Button>
                  
                  {isFolderDropdownOpen && (
                    <section className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border p-2 max-h-64 overflow-y-auto">
                      <section className="overflow-y-auto max-h-40">
                        {renderFolderTree(privateFolders)}
                      </section>
                    </section>
                  )}
                </section>
              )}
            </section>
          </CardContent>
        </Card>
      </section>

      <section className="flex justify-end pt-4">
        <Button 
          type="submit" 
          disabled={isUploading || !selectedFile || uploadSuccess}
          className="w-full sm:w-auto"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : uploadSuccess ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Uploaded Successfully
            </>
          ) : (
            "Upload Document"
          )}
        </Button>
      </section>
    </form>
  );
};

export default UploadForm;
