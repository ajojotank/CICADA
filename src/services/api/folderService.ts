// Folder API service functions
import { FileSystemType, FolderStructure } from './types';
import { supabase } from '@/lib/supabase';

/**
 * Fetches the folder structure based on file system type
 * @param fileSystemType The type of file system (private or public)
 * @returns A promise that resolves to an array of FolderStructure
 */
export const fetchFolderStructure = async (fileSystemType: FileSystemType = 'private'): Promise<FolderStructure[]> => {
  if (fileSystemType === 'private') {
    try {
      // Get all distinct folder paths from documents_private
      const { data, error } = await supabase
        .from('documents_private')
        .select('folder')
        .not('folder', 'is', null);

      if (error) throw error;

      // Extract unique folder paths
      const folderPaths = data
        .map(doc => doc.folder)
        .filter(Boolean) // Remove null/undefined
        .filter((value, index, self) => self.indexOf(value) === index); // Get unique values

      return buildFolderTree(folderPaths);
    } catch (error) {
      console.error('Error fetching folder structure:', error);
      throw error;
    }
  } else {
    // For public, the categories are predefined in the schema
    return [
      {
        name: "Constitutional Documents",
        path: "Constitutional Documents",
        children: []
      },
      {
        name: "Supreme Court Cases",
        path: "Supreme Court Cases",
        children: []
      },
      {
        name: "Legislation",
        path: "Legislation",
        children: []
      },
      {
        name: "Government Gazettes",
        path: "Government Gazettes",
        children: []
      },
      {
        name: "Regulations",
        path: "Regulations",
        children: []
      },
      {
        name: "Case Law",
        path: "Case Law",
        children: []
      },
      {
        name: "Other",
        path: "Other",
        children: []
      }
    ];
  }
};

/**
 * Helper function to build folder tree from flat paths
 * This is a completely rewritten version that ensures no duplication
 * @param paths Array of folder paths (e.g., ["folder/subfolder", "folder/another"])
 * @returns Hierarchical folder structure
 */
const buildFolderTree = (paths: string[]): FolderStructure[] => {
  // Create a map to track all folders by their full path
  const folderMap: Record<string, FolderStructure> = {};
  
  // First pass: create all folder objects
  paths.forEach(fullPath => {
    if (!fullPath) return;
    
    // For each path, create all the necessary folder objects in the hierarchy
    const pathParts = fullPath.split('/');
    
    // Create folder objects for each level of the path
    for (let i = 1; i <= pathParts.length; i++) {
      const currentPath = pathParts.slice(0, i).join('/');
      const currentName = pathParts[i - 1];
      
      // Only create if it doesn't exist yet
      if (!folderMap[currentPath]) {
        folderMap[currentPath] = {
          name: currentName,
          path: currentPath,
          children: []
        };
      }
    }
  });
  
  // Second pass: build the hierarchy
  const rootFolders: FolderStructure[] = [];
  
  Object.keys(folderMap).forEach(path => {
    const folder = folderMap[path];
    const pathParts = path.split('/');
    
    if (pathParts.length === 1) {
      // This is a root folder
      rootFolders.push(folder);
    } else {
      // This is a child folder, add it to its parent
      const parentPath = pathParts.slice(0, -1).join('/');
      const parent = folderMap[parentPath];
      
      // Only add if it's not already in the parent's children
      if (parent && !parent.children.some(child => child.path === folder.path)) {
        parent.children.push(folder);
      }
    }
  });
  
  return rootFolders;
};

/**
 * Creates a new folder
 * @param path The parent path where to create the folder
 * @param name The name of the new folder
 * @param fileSystemType The type of file system (private or public)
 * @returns A promise that resolves to the created FolderStructure
 */
export const createFolder = async (path: string, name: string, fileSystemType: FileSystemType = 'private'): Promise<FolderStructure> => {
  if (fileSystemType === 'public') {
    throw new Error("Cannot create folders in the public file system");
  }

  try {
    // Make sure path is defined properly
    let parentPath = path?.trim() || '';
    
    // Check if the path already ends with the folder name to prevent duplication
    if (parentPath.endsWith(`/${name}`) || parentPath === name) {
      // Path already includes the name, so don't append it again
      console.log(`Path already includes folder name: "${parentPath}"`);
      parentPath = parentPath.replace(new RegExp(`\\/?${name}$`), '');
    }
    
    // Create the folder path - ensuring we don't get path/name when path is empty
    const folderPath = parentPath ? `${parentPath}/${name}` : name;
    
    console.log(`Creating folder with path: "${folderPath}"`);
    
    // Check if the folder already exists
    const { data: existingFolders, error: checkError } = await supabase
      .from('documents_private')
      .select('folder')
      .eq('folder', folderPath)
      .limit(1);
    
    if (checkError) throw checkError;
    
    if (existingFolders && existingFolders.length > 0) {
      throw new Error(`Folder '${name}' already exists in this location`);
    }
    
    // Check if user is authenticated
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("You must be logged in to create folders");
    }
    
    // Create a placeholder document with minimal metadata to establish the folder
    const { data, error } = await supabase
      .from('documents_private')
      .insert({
        user_id: userData.user.id,
        file_name: '.folder_placeholder',
        file_url: 'placeholder',
        folder: folderPath,
        title: `${name} Folder`,
        description: 'Folder placeholder',
        tags: ['folder', 'placeholder']
      })
      .select();

    if (error) throw error;
    
    // Return the new folder structure
    const newFolder: FolderStructure = {
      name,
      path: folderPath,
      children: []
    };
    
    return newFolder;
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
};

/**
 * Updates a folder
 * @param path The path of the folder to update
 * @param newName The new name for the folder
 * @param fileSystemType The type of file system (private or public)
 * @returns A promise that resolves to the updated FolderStructure
 */
export const updateFolder = async (path: string, newName: string, fileSystemType: FileSystemType = 'private'): Promise<FolderStructure> => {
  if (fileSystemType === 'public') {
    throw new Error("Cannot rename folders in the public file system");
  }

  try {
    // Extract parent path and old name from path
    const pathParts = path.split('/');
    const oldName = pathParts.pop() || '';
    const parentPath = pathParts.join('/');
    
    // Construct new path
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;
    
    // Check if the new folder name already exists at the same level
    const { data: existingFolders, error: checkError } = await supabase
      .from('documents_private')
      .select('folder')
      .eq('folder', newPath)
      .limit(1);
    
    if (checkError) throw checkError;
    
    if (existingFolders && existingFolders.length > 0) {
      throw new Error(`Folder '${newName}' already exists in this location`);
    }
    
    // Check if user is authenticated
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("You must be logged in to rename folders");
    }
    
    // Update all documents that are directly in this folder
    const { data, error } = await supabase
      .from('documents_private')
      .update({ folder: newPath })
      .eq('folder', path)
      .eq('user_id', userData.user.id)
      .select();

    if (error) throw error;
    
    // Also update documents in subfolders
    const { data: subFolderData, error: subFolderError } = await supabase
      .from('documents_private')
      .select('id, folder')
      .like('folder', `${path}/%`)
      .eq('user_id', userData.user.id);
      
    if (subFolderError) throw subFolderError;
    
    // Update each subfolder path
    for (const doc of subFolderData || []) {
      const newSubFolderPath = doc.folder.replace(path, newPath);
      await supabase
        .from('documents_private')
        .update({ folder: newSubFolderPath })
        .eq('id', doc.id)
        .eq('user_id', userData.user.id);
    }
    
    // Return the updated folder structure
    const updatedFolder: FolderStructure = {
      name: newName,
      path: newPath,
      children: []  // In a real scenario, we'd include the children here
    };
    
    return updatedFolder;
  } catch (error) {
    console.error('Error updating folder:', error);
    throw error;
  }
};

/**
 * Deletes a folder
 * @param path The path of the folder to delete
 * @param fileSystemType The type of file system (private or public)
 * @returns A promise that resolves to a boolean indicating success
 */
export const deleteFolder = async (path: string, fileSystemType: FileSystemType = 'private'): Promise<boolean> => {
  if (fileSystemType === 'public') {
    throw new Error("Cannot delete folders in the public file system");
  }

  try {
    // Check if user is authenticated
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("You must be logged in to delete folders");
    }
    
    // Delete all documents in this folder
    const { error: folderError } = await supabase
      .from('documents_private')
      .delete()
      .eq('folder', path)
      .eq('user_id', userData.user.id);
      
    if (folderError) throw folderError;
    
    // Delete all documents in subfolders
    const { error: subFolderError } = await supabase
      .from('documents_private')
      .delete()
      .like('folder', `${path}/%`)
      .eq('user_id', userData.user.id);
      
    if (subFolderError) throw subFolderError;
    
    return true;
  } catch (error) {
    console.error('Error deleting folder:', error);
    throw error;
  }
};