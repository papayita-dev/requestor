import { useCallback, useState } from 'react';
import { v4 } from 'uuid';
import useLocalStorage from 'use-local-storage';
import { Collection, HttpRequest } from '@renderer/interfaces/app.interfaces';

const STORAGE_KEY = 'my_app_collections';

export const useHttpRequests = () => {
  const [collections, setCollections] = useLocalStorage<Collection[]>(STORAGE_KEY, []);

  const addCollection = useCallback(
    (c: Collection) => {
      c.id = v4();
      setCollections((prev) => [...(prev || []), c]);
    },
    [setCollections]
  );

  const [newCollectionModalOpen, setNewCollectionModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const closeNewCollectionModal = () => {
    setNewCollectionModalOpen(false);
    setNewCollectionName('');
  };
  const openNewCollectionModal = () => setNewCollectionModalOpen(true);
  const updateNewCollectionName = (name: string) => setNewCollectionName(name);

  const [newRequestModalOpen, setNewRequestModalOpen] = useState(false);
  const [newRequestName, setNewRequestName] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const closeNewRequestModal = () => {
    setNewRequestModalOpen(false);
    setNewRequestName('');
    setSelectedCollectionId('');
  };
  const openNewRequestModal = () => setNewRequestModalOpen(true);
  const updateNewRequestName = (name: string) => setNewRequestName(name);
  const updateSelectedCollectionId = (id: string) => setSelectedCollectionId(id);

  const addRequest = useCallback(
    (collectionId: string, requestName: string) => {
      setCollections((prev) =>
        (prev || []).map((col) =>
          col.id === collectionId
            ? {
                ...col,
                children: [
                  ...(col.children || []),
                  {
                    id: v4(),
                    name: requestName,
                    url: '',
                    method: 'GET',
                    body: '{\n  \n}',
                    headers: [],
                    queryParams: []
                  }
                ]
              }
            : col
        )
      );
    },
    [setCollections]
  );

  const deleteCollection = useCallback(
    (collectionId: string) => {
      setCollections((prev) => (prev || []).filter((col) => col.id !== collectionId));
    },
    [setCollections]
  );

  const deleteRequest = useCallback(
    (collectionId: string, requestId: string) => {
      setCollections((prev) =>
        (prev || []).map((col) =>
          col.id === collectionId
            ? {
                ...col,
                children: (col.children || []).filter((req) => req.id !== requestId)
              }
            : col
        )
      );
    },
    [setCollections]
  );

  const updateRequest = useCallback(
    (collectionId: string, requestId: string, updates: Partial<HttpRequest>) => {
      setCollections((prev) =>
        (prev || []).map((col) =>
          col.id === collectionId
            ? {
                ...col,
                children: (col.children || []).map((req) =>
                  req.id === requestId ? { ...req, ...updates } : req
                )
              }
            : col
        )
      );
    },
    [setCollections]
  );

  const updateCollection = useCallback(
    (collectionId: string, updates: Partial<Collection>) => {
      setCollections((prev) =>
        (prev || []).map((col) => (col.id === collectionId ? { ...col, ...updates } : col))
      );
    },
    [setCollections]
  );

  return {
    addCollection,
    addRequest,
    deleteCollection,
    deleteRequest,
    updateRequest,
    updateCollection,
    collections: collections || [],
    newCollectionModalOpen,
    closeNewCollectionModal,
    newCollectionName,
    updateNewCollectionName,
    openNewCollectionModal,
    newRequestModalOpen,
    closeNewRequestModal,
    openNewRequestModal,
    newRequestName,
    updateNewRequestName,
    selectedCollectionId,
    updateSelectedCollectionId
  };
};
