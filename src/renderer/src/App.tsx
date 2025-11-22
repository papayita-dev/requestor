import React, { FC, useEffect } from 'react';
import messages from '@cloudscape-design/components/i18n/messages/all.en';
import {
  AppLayout,
  ButtonDropdown,
  ContentLayout,
  Container,
  Grid,
  Header,
  Icon,
  SideNavigation,
  SpaceBetween,
  SplitPanel,
  TopNavigation,
  Box,
  Button,
  FormField,
  Input,
  Modal,
  Flashbar,
  Table,
  Link,
  Tabs,
  Select
} from '@cloudscape-design/components';
import { I18nProvider } from '@cloudscape-design/components/i18n';
import { applyDensity, applyMode, Density, Mode } from '@cloudscape-design/global-styles';
import { useHttpRequests } from './state/app.state';
import { Collection, HttpRequest } from './interfaces/app.interfaces';
import { RequestEditor } from './components/request-editor.component';

export const App: FC = () => {
  const {
    collections,
    newCollectionModalOpen,
    closeNewCollectionModal,
    openNewCollectionModal,
    newCollectionName,
    updateNewCollectionName,
    addCollection,
    newRequestModalOpen,
    closeNewRequestModal,
    openNewRequestModal,
    newRequestName,
    updateNewRequestName,
    selectedCollectionId,
    updateSelectedCollectionId,
    addRequest,
    deleteCollection,
    deleteRequest,
    updateRequest,
    updateCollection
  } = useHttpRequests();
  const [expandedItemIds, setExpandedItemIds] = React.useState<string[]>([]);
  const [openTabs, setOpenTabs] = React.useState<(Collection | HttpRequest)[]>([]);
  const [activeTabId, setActiveTabId] = React.useState<string | undefined>();
  const [selectedItems, setSelectedItems] = React.useState<(Collection | HttpRequest)[]>([]);

  // Aplicar modo compacto
  useEffect(() => {
    applyMode(Mode.Dark);
    applyDensity(Density.Compact);
  }, []);

  // Estados para modales de confirmación de eliminación
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<{
    type: 'collection' | 'request';
    collectionId: string;
    requestId?: string;
    name: string;
  } | null>(null);

  const handleDeleteClick = () => {
    if (selectedItems.length === 0) return;

    const item = selectedItems[0];
    const isCollection = !('url' in item);

    if (isCollection) {
      setItemToDelete({
        type: 'collection',
        collectionId: item.id,
        name: item.name
      });
    } else {
      const collection = collections.find((c) => c.children?.some((r) => r.id === item.id));
      setItemToDelete({
        type: 'request',
        collectionId: collection?.id || '',
        requestId: item.id,
        name: item.name
      });
    }

    setDeleteConfirmModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'collection') {
      deleteCollection(itemToDelete.collectionId);
      // Cerrar tabs de requests de esta colección
      const collection = collections.find((c) => c.id === itemToDelete.collectionId);
      if (collection?.children) {
        const requestIds = collection.children.map((r) => r.id);
        setOpenTabs((prev) => prev.filter((tab) => !requestIds.includes(tab.id)));
      }
    } else if (itemToDelete.type === 'request' && itemToDelete.requestId) {
      deleteRequest(itemToDelete.collectionId, itemToDelete.requestId);
      // Cerrar el tab si está abierto
      handleCloseTab(itemToDelete.requestId);
    }

    setSelectedItems([]);
    setDeleteConfirmModalOpen(false);
    setItemToDelete(null);
  };

  const handleOpenTab = (item: Collection | HttpRequest) => {
    // Verificar si el tab ya está abierto
    const existingTab = openTabs.find((tab) => tab.id === item.id);
    if (existingTab) {
      // Si ya existe, solo activarlo
      setActiveTabId(item.id);
    } else {
      // Si no existe, agregarlo
      setOpenTabs((prev) => [...prev, item]);
      setActiveTabId(item.id);
    }
  };

  const handleCloseTab = (tabId: string) => {
    setOpenTabs((prev) => {
      const filtered = prev.filter((tab) => tab.id !== tabId);
      // Si cerramos el tab activo, activar el último tab disponible
      if (activeTabId === tabId && filtered.length > 0) {
        setActiveTabId(filtered[filtered.length - 1].id);
      } else if (filtered.length === 0) {
        setActiveTabId(undefined);
      }
      return filtered;
    });
  };

  const handleUpdateRequestField = (requestId: string, field: keyof HttpRequest, value: any) => {
    // Encontrar la colección que contiene el request
    const collection = collections.find((c) => c.children?.some((r) => r.id === requestId));
    if (collection) {
      updateRequest(collection.id, requestId, { [field]: value });
      // Actualizar también el tab abierto
      setOpenTabs((prev) =>
        prev.map((tab) => (tab.id === requestId ? { ...tab, [field]: value } : tab))
      );
    }
  };

  const handleUpdateCollectionName = (collectionId: string, name: string) => {
    updateCollection(collectionId, { name });
    // Actualizar también el tab abierto
    setOpenTabs((prev) => prev.map((tab) => (tab.id === collectionId ? { ...tab, name } : tab)));
  };
  return (
    <I18nProvider locale={'ES'} messages={[messages]}>
      <TopNavigation
        identity={{
          href: '#',
          title: 'Requestor'
        }}
      />
      <AppLayout
        navigationHide={true}
        notifications={
          <Flashbar
            items={
              [
                /*{
                type: "success",
                dismissible: true,
                content: "This is an info flash message.",
                id: "message_1",
              },*/
              ]
            }
          />
        }
        content={
          <ContentLayout header={<Header variant="h1">Http Requests</Header>}>
            <Grid gridDefinition={[{ colspan: 4 }, { colspan: 8 }]}>
              <Table
                items={collections}
                selectionType="single"
                header={
                  <Header
                    actions={
                      <SpaceBetween direction="horizontal" size="xs">
                        {selectedItems.length > 0 && (
                          <Button
                            iconName="close"
                            variant="link"
                            onClick={() => setSelectedItems([])}
                          ></Button>
                        )}
                        <Button
                          iconName="remove"
                          disabled={selectedItems.length === 0}
                          onClick={handleDeleteClick}
                        ></Button>
                        <ButtonDropdown
                          items={[
                            {
                              text: 'Colección',
                              id: 'create-collection'
                            },
                            {
                              text: 'Petición',
                              id: 'create-request'
                            }
                          ]}
                          onItemClick={(item) => {
                            switch (item.detail.id) {
                              case 'create-collection':
                                openNewCollectionModal();
                                break;
                              case 'create-request':
                                openNewRequestModal();
                                break;
                            }
                          }}
                          variant="primary"
                        >
                          <Icon name={'add-plus'}></Icon>
                        </ButtonDropdown>
                      </SpaceBetween>
                    }
                    counter={collections.length ? '(' + collections.length + ')' : '(0)'}
                  >
                    Colecciones
                  </Header>
                }
                selectedItems={selectedItems}
                onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
                columnDefinitions={[
                  {
                    id: 'name',
                    header: 'Nombre',
                    cell: (item) => (
                      <Link
                        href="#"
                        onFollow={(e) => {
                          e.preventDefault();
                          handleOpenTab(item);
                        }}
                      >
                        {item.name}
                      </Link>
                    ),
                    isRowHeader: true
                  }
                ]}
                columnDisplay={[{ id: 'name', visible: true }]}
                expandableRows={{
                  getItemChildren: (item) => ('children' in item ? item.children : []) || [],
                  isItemExpandable: (item) => 'children' in item && Boolean(item.children),
                  expandedItems: collections.filter((col) => expandedItemIds.includes(col.id)),
                  onExpandableItemToggle: ({ detail }) => {
                    const itemId = detail.item.id;
                    setExpandedItemIds((prev) => {
                      if (detail.expanded) {
                        return prev.includes(itemId) ? prev : [...prev, itemId];
                      } else {
                        return prev.filter((id) => id !== itemId);
                      }
                    });
                  }
                }}
                variant="borderless"
              />
              <Tabs
                actions={
                  <Button variant="primary">
                    <Icon name={'add-plus'}></Icon>
                  </Button>
                }
                variant={'default'}
                activeTabId={activeTabId}
                onChange={({ detail }) => setActiveTabId(detail.activeTabId)}
                tabs={openTabs.map((tab) => {
                  const isCollection = 'children' in tab;

                  return {
                    label: tab.name,
                    id: tab.id,
                    content: isCollection ? (
                      // Contenido para Colección
                      <Container
                        header={<Header variant="h2">Configuración de la colección</Header>}
                      >
                        <FormField label="Nombre de la colección">
                          <Input
                            value={tab.name}
                            onChange={({ detail }) =>
                              handleUpdateCollectionName(tab.id, detail.value)
                            }
                            placeholder="Nombre de la colección"
                          />
                        </FormField>
                      </Container>
                    ) : (
                      // Contenido para Petición
                      <RequestEditor
                        request={tab as HttpRequest}
                        onUpdate={(requestId, updates) => {
                          // Encontrar la colección que contiene el request
                          const collection = collections.find((c) =>
                            c.children?.some((r) => r.id === requestId)
                          );
                          if (collection) {
                            updateRequest(collection.id, requestId, updates);
                          }
                          // Actualizar también en openTabs
                          setOpenTabs((prev) =>
                            prev.map((t) => (t.id === requestId ? { ...t, ...updates } : t))
                          );
                        }}
                        onSave={(requestId) => {
                          // Guardar en la colección
                          const collection = collections.find((c) =>
                            c.children?.some((r) => r.id === requestId)
                          );
                          if (collection) {
                            const request = openTabs.find((t) => t.id === requestId) as HttpRequest;
                            if (request) {
                              updateRequest(collection.id, requestId, request);
                            }
                          }
                        }}
                      />
                    ),
                    dismissible: true,
                    onDismiss: () => handleCloseTab(tab.id)
                  };
                })}
              />
            </Grid>
          </ContentLayout>
        }
        toolsHide={true}
        splitPanel={<SplitPanel header="Split panel header">Split panel content</SplitPanel>}
      />
      <Modal
        visible={newCollectionModalOpen}
        onDismiss={() => closeNewCollectionModal()}
        header="Crear colección"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => closeNewCollectionModal()}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  addCollection({
                    id: '',
                    name: newCollectionName
                  });
                  closeNewCollectionModal();
                }}
              >
                Crear
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField label="Nombre de la colección">
          <Input
            placeholder="Ej: Cuentas"
            value={newCollectionName}
            onChange={({ detail }) => updateNewCollectionName(detail.value)}
          />
        </FormField>
      </Modal>
      <Modal
        visible={newRequestModalOpen}
        onDismiss={() => closeNewRequestModal()}
        header="Crear petición"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => closeNewRequestModal()}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (selectedCollectionId && newRequestName) {
                    addRequest(selectedCollectionId, newRequestName);
                    closeNewRequestModal();
                  }
                }}
              >
                Crear
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Colección">
            <Select
              selectedOption={
                selectedCollectionId
                  ? {
                      label: collections.find((c) => c.id === selectedCollectionId)?.name || '',
                      value: selectedCollectionId
                    }
                  : null
              }
              onChange={({ detail }) =>
                updateSelectedCollectionId(detail.selectedOption.value || '')
              }
              options={collections.map((col) => ({
                label: col.name,
                value: col.id
              }))}
              placeholder="Selecciona una colección"
              filteringType="auto"
            />
          </FormField>
          <FormField label="Nombre de la petición">
            <Input
              placeholder="Ej: Obtener usuario"
              value={newRequestName}
              onChange={({ detail }) => updateNewRequestName(detail.value)}
            />
          </FormField>
        </SpaceBetween>
      </Modal>
      <Modal
        visible={deleteConfirmModalOpen}
        onDismiss={() => {
          setDeleteConfirmModalOpen(false);
          setItemToDelete(null);
        }}
        header={`Eliminar ${itemToDelete?.type === 'collection' ? 'colección' : 'petición'}`}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="link"
                onClick={() => {
                  setDeleteConfirmModalOpen(false);
                  setItemToDelete(null);
                }}
              >
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleDeleteConfirm}>
                Eliminar
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Box>
            {itemToDelete?.type === 'collection' ? (
              <>
                ¿Estás seguro de que deseas eliminar la colección{' '}
                <strong>{itemToDelete.name}</strong>?
                <br />
                <br />
                Esta acción eliminará todas las peticiones dentro de esta colección.
              </>
            ) : (
              <>
                ¿Estás seguro de que deseas eliminar la petición{' '}
                <strong>{itemToDelete?.name}</strong>?
              </>
            )}
          </Box>
        </SpaceBetween>
      </Modal>
    </I18nProvider>
  );
};
