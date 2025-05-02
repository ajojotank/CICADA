/* eslint-disable @typescript-eslint/no-explicit-any */
// Public Document API service functions
import { Document, DocumentMetadata, UploadDocumentResponse } from './types';
import { supabase } from '@/lib/supabase';

// Valid categories for public documents
const VALID_CATEGORIES = [
  'Supreme Court Cases',
  'Legislation',
  'Government Gazettes',
  'Regulations',
  'Case Law',
  'Constitutional Documents',
  'Other'
];

/**
 * Fetches public documents
 * @returns A promise that resolves to an array of Documents
 */
export const fetchPublicDocuments = async (): Promise<Document[]> => {
  try {
    console.log("Fetching public documents...");
    
    // Query public documents table with AI insights fields
    const { data, error } = await supabase
      .from('documents_public')
      .select(`
        *,
        ai_summary,
        ai_key_sections,
        ai_citations
      `)
      .not('file_name', 'eq', '.folder_placeholder')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching public documents:", error);
      throw error;
    }

    console.log("Public documents raw data:", data);

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
      isPublic: true,
      folder: item.category || '',
      ai_summary: item.ai_summary || null,
      ai_key_sections: item.ai_key_sections || null,
      ai_citations: item.ai_citations || null
    }));

    console.log("Processed public documents:", documents);
    return documents;

  } catch (error) {
    console.error('Error fetching public documents:', error);
    throw error;
  }
};

/**
 * Updates a public document
 * @param document The document to update
 * @returns A promise that resolves to the updated Document
 */
export const updatePublicDocument = async (document: Document): Promise<Document> => {
  try {
    // Check if user is authenticated
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("You must be logged in to update documents");
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(document.folder)) {
      throw new Error(`Invalid category: ${document.folder}. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }

    // Prepare the update data
    const updateData = {
      title: document.title,
      description: document.description,
      tags: document.tags,
      source: document.source,
      document_date: document.date,
      category: document.folder, // Public documents use category instead of folder
    };

    // Update document in the public table
    const { data, error } = await supabase
      .from('documents_public')
      .update(updateData)
      .eq('id', document.id)
      .eq('uploader_user_id', userData.user.id)
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
      folder: data.category || '', // Public documents use category instead of folder
    };
  } catch (error) {
    console.error('Error updating public document:', error);
    throw error;
  }
};

/**
 * Deletes a public document by ID
 * @param id The ID of the document to delete
 * @returns A promise that resolves to a boolean indicating success
 */
export const deletePublicDocument = async (id: string): Promise<boolean> => {
  try {
    // Check if user is authenticated
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("You must be logged in to delete documents");
    }

    // First, get the file path so we can delete it from storage
    const { data: documentData, error: fetchError } = await supabase
      .from('documents_public')
      .select('file_url, metadata')
      .eq('id', id)
      .eq('uploader_user_id', userData.user.id)
      .single();

    if (fetchError) throw fetchError;
    
    // Get the storage path from metadata if available, otherwise extract from URL
    let storagePath;
    if (documentData.metadata?.storagePath) {
      storagePath = documentData.metadata.storagePath;
    } else {
      // Fallback to extracting from URL
      const fileUrlParts = documentData.file_url.split('/');
      storagePath = fileUrlParts[fileUrlParts.length - 1];
    }

    // Delete the file from storage
    if (storagePath) {
      const { error: storageError } = await supabase
        .storage
        .from('public-files')
        .remove([storagePath]);

      if (storageError) {
        console.error('Error deleting public file from storage:', storageError);
        // Continue execution to delete the database record even if storage delete fails
      }
    }

    // Delete the database record
    const { error } = await supabase
      .from('documents_public')
      .delete()
      .eq('id', id)
      .eq('uploader_user_id', userData.user.id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting public document:', error);
    throw error;
  }
};

/**
 * Uploads a new public document
 * @param file The file to upload
 * @param metadata Metadata for the document
 * @returns A promise that resolves to an upload response
 */
export const uploadPublicDocument = async (
  file: File, 
  metadata: DocumentMetadata
): Promise<UploadDocumentResponse> => {
  try {
    // Check if user is authenticated
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new Error("You must be logged in to upload documents");
    }

    console.log("Uploading public document for user:", userData.user.id);
    
    // For public documents, folder represents a category
    const { folder = 'Other', title = '', description = '', tags = [], source = '', date = '' } = metadata;
    
    // Validate category
    if (!VALID_CATEGORIES.includes(folder)) {
      throw new Error(`Invalid category: ${folder}. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }
    
    // Check if a file with the same name exists in the category
    const { data: existingFiles, error: checkError } = await supabase
      .from('documents_public')
      .select('file_name')
      .eq('category', folder)
      .eq('uploader_user_id', userData.user.id)
      .eq('file_name', file.name);
      
    if (checkError) throw checkError;
    
    if (existingFiles && existingFiles.length > 0) {
      throw new Error(`A file named "${file.name}" already exists in this category. Please rename the file or choose a different category.`);
    }
    
    // Create a safe filename - replace spaces and special characters
    const timestamp = Date.now();
    const safeFileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    
    // Create storage path with user ID to match RLS policies
    const categoryPath = folder.replace(/\//g, '_');
    const storagePath = `${userData.user.id}/${categoryPath}/${safeFileName}`;
    
    console.log(`Uploading public file with path: ${storagePath}`);

    // Upload the file to Supabase storage
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('public-files') // Use public-files bucket
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (storageError) {
      console.error("Storage upload error details:", storageError);
      throw new Error(`Error uploading public file: ${storageError.message}`);
    }

    // Get the public URL for the uploaded file - for public files, we store the permanent URL
    const { data: urlData } = supabase
      .storage
      .from('public-files') // Use public-files bucket
      .getPublicUrl(storageData.path);

    const fileUrl = urlData.publicUrl;
    console.log("Public file uploaded successfully, URL:", fileUrl);

    // Prepare document record for public documents
    const documentData = {
      uploader_user_id: userData.user.id,
      file_name: file.name,
      file_url: fileUrl, // For public files, we store the permanent public URL
      title: title || file.name,
      description: description || '',
      tags: tags,
      source: source || '',
      category: folder, // Public documents use category instead of folder
      document_date: date || new Date().toISOString().split('T')[0],
      metadata: {
        size: `${(file.size / 1024).toFixed(1)}KB`,
        contentType: file.type,
        originalName: file.name,
        storagePath: storagePath,
      }
    };
    
    console.log("Creating public document record");
    
    // Create document record in public table
    const { data, error } = await supabase
      .from('documents_public')
      .insert(documentData)
      .select()
      .single();

    if (error) {
      console.error("Database insert error details:", error);
      
      // If the database insert fails, try to clean up the uploaded file
      try {
        await supabase.storage.from('public-files').remove([storagePath]);
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
    console.error('Error uploading public document:', error);
    throw error;
  }
};