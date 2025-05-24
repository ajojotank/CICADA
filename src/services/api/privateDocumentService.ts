/* eslint-disable @typescript-eslint/no-explicit-any */
// Private Document API service functions
import { Document, DocumentMetadata, UploadDocumentResponse } from './types';
import { supabase } from '@/lib/supabase';

/**
 * Fetches private documents
 * @returns A promise that resolves to an array of Documents
 */
export const fetchPrivateDocuments = async (): Promise<Document[]> => {
  try {
    console.log("Fetching private documents...");
    
    // Query private documents table with AI insights fields
    const { data, error } = await supabase
      .from('documents_private')
      .select(`
        *,
        ai_summary,
        ai_key_sections,
        ai_citations
      `)
      .not('file_name', 'eq', '.folder_placeholder')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching private documents:", error);
      throw error;
    }

    console.log("Private documents raw data:", data);

    // Map the database results to the Document type
    const documents = data.map((item: any) => ({
      id: item.id,
      url: item.file_url,
      title: item.title || item.file_name,
      description: item.description || '',
      type: item.file_name.split('.').pop() || 'unknown',
      date: item.document_date || item.created_at?.split('T')[0],
      tags: item.tags || [],
      source: item.source || '',
      content: '',
      size: item.metadata?.size || 'unknown',
      isPublic: false,
      folder: item.folder || '',
      ai_summary: item.ai_summary || null,
      ai_key_sections: item.ai_key_sections || null,
      ai_citations: item.ai_citations || null
    }));

    console.log("Processed private documents:", documents);
    return documents;

  } catch (error) {
    console.error('Error fetching private documents:', error);
    throw error;
  }
};

/**
 * Get a signed URL for a private document
 * @param storagePath The storage path of the file
 * @param expiresIn Time in seconds until URL expires (default 3600 = 1 hour)
 * @returns A promise that resolves to a signed URL string
 */
export const getSignedUrl = async (storagePath: string, expiresIn = 3600): Promise<string> => {
  try {
    const { data, error } = await supabase
      .storage
      .from('private-files')
      .createSignedUrl(storagePath, expiresIn);
      
    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};

/**
 * Updates a private document
 * @param document The document to update
 * @returns A promise that resolves to the updated Document
 */
export const updatePrivateDocument = async (document: Document): Promise<Document> => {
  try {
    // Check if user is authenticated
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("You must be logged in to update documents");
    }

    // Prepare the update data
    const updateData = {
      title: document.title,
      description: document.description,
      tags: document.tags,
      source: document.source,
      document_date: document.date,
      folder: document.folder
    };

    // Update document in the private table
    const { data, error } = await supabase
      .from('documents_private')
      .update(updateData)
      .eq('id', document.id)
      .eq('user_id', userData.user.id)
      .select()
      .single();

    if (error) throw error;
    
    // Return the updated document
    return {
      ...document,
      title: data.title,
      description: data.description,
      date: data.document_date || data.created_at?.split('T')[0],
      tags: data.tags || [],
      source: data.source || '',
      folder: data.folder || ''
    };
  } catch (error) {
    console.error('Error updating private document:', error);
    throw error;
  }
};

/**
 * Deletes a private document by ID
 * @param id The ID of the document to delete
 * @returns A promise that resolves to a boolean indicating success
 */
export const deletePrivateDocument = async (id: string): Promise<boolean> => {
  try {
    // Check if user is authenticated
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("You must be logged in to delete documents");
    }

    // First, get the file path so we can delete it from storage
    const { data: documentData, error: fetchError } = await supabase
      .from('documents_private')
      .select('file_url, metadata')
      .eq('id', id)
      .eq('user_id', userData.user.id)
      .single();

    if (fetchError) throw fetchError;
    
    // Get the storage path from metadata if available, otherwise extract from URL
    let storagePath;
    if (documentData.metadata?.storagePath) {
      storagePath = documentData.metadata.storagePath;
    } else {
      // Fallback to using the file_url directly since we're storing the storage path there
      storagePath = documentData.file_url;
    }

    // Delete the file from storage
    if (storagePath) {
      const { error: storageError } = await supabase
        .storage
        .from('private-files')
        .remove([storagePath]);

      if (storageError) {
        console.error('Error deleting private file from storage:', storageError);
        // Continue execution to delete the database record even if storage delete fails
      }
    }

    // Delete the database record
    const { error } = await supabase
      .from('documents_private')
      .delete()
      .match({ id, user_id: userData.user.id });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting private document:', error);
    throw error;
  }
};

/**
 * Uploads a new private document
 * @param file The file to upload
 * @param metadata Metadata for the document
 * @returns A promise that resolves to an upload response
 */
export const uploadPrivateDocument = async (
  file: File, 
  metadata: DocumentMetadata
): Promise<UploadDocumentResponse> => {
  try {
    // Check if user is authenticated
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new Error("You must be logged in to upload documents");
    }

    console.log("Uploading private document for user:", userData.user.id);
    
    const { folder = '', title = '', description = '', tags = [], source = '', date = '' } = metadata;
    
    // Check if a file with the same name exists in the folder
    const { data: existingFiles, error: checkError } = await supabase
      .from('documents_private')
      .select('file_name')
      .match({ 
        folder, 
        user_id: userData.user.id,
        file_name: file.name 
      });
      
    if (checkError) throw checkError;
    
    if (existingFiles && existingFiles.length > 0) {
      throw new Error(`A file named "${file.name}" already exists in this folder. Please rename the file or choose a different folder.`);
    }
    
    // Create a safe filename - replace spaces and special characters
    const timestamp = Date.now();
    const safeFileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    
    // Create storage path with user ID to match RLS policies
    const folderPath = folder ? folder.replace(/\//g, '_') : 'root';
    const storagePath = `${userData.user.id}/${folderPath}/${safeFileName}`;
    
    console.log(`Uploading private file with path: ${storagePath}`);

    // Upload the file to Supabase storage
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('private-files')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (storageError) {
      console.error("Storage upload error details:", storageError);
      throw new Error(`Error uploading private file: ${storageError.message}`);
    }

    // For private files, just store the storage path directly
    // We'll generate signed URLs when needed
    const filePath = storageData.path;
    console.log("Private file uploaded successfully, path:", filePath);

    // Prepare document record for private documents
    const documentData = {
      user_id: userData.user.id,
      file_name: file.name,
      file_url: filePath, // Store only the storage path for private files
      title: title || file.name,
      description: description || '',
      tags: tags,
      source: source || '',
      folder: folder,
      document_date: date || new Date().toISOString().split('T')[0],
      metadata: {
        size: `${(file.size / 1024).toFixed(1)}KB`,
        contentType: file.type,
        originalName: file.name,
        storagePath: storagePath,
      }
    };
    
    console.log("Creating private document record");
    
    // Create document record in private table
    const { data, error } = await supabase
      .from('documents_private')
      .insert(documentData)
      .select()
      .single();

    if (error) {
      console.error("Database insert error details:", error);
      
      // If the database insert fails, try to clean up the uploaded file
      try {
        await supabase.storage.from('private-files').remove([storagePath]);
      } catch (cleanupError) {
        console.error("Failed to clean up uploaded file after error:", cleanupError);
      }
      
      throw error;
    }

    return {
      success: true,
      id: data.id,
      filename: storagePath, // Return full storage path instead of just file_name
      size: documentData.metadata.size,
      uploadDate: data.created_at
    };
  } catch (error) {
    console.error('Error uploading private document:', error);
    throw error;
  }
};