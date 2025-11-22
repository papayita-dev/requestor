import { FC, useEffect, useState } from 'react';
import {
  Container,
  SpaceBetween,
  Input,
  Select,
  Button,
  Tabs,
  Table,
  Box,
  Header,
  FormField,
  ColumnLayout,
  CodeEditor,
  CodeEditorProps
} from '@cloudscape-design/components';
import { HttpRequest } from '@renderer/interfaces/app.interfaces';

interface RequestEditorProps {
  request: HttpRequest;
  onUpdate: (requestId: string, updates: Partial<HttpRequest>) => void;
  onSave: (requestId: string) => void;
}

export const RequestEditor: FC<RequestEditorProps> = ({ request, onUpdate, onSave }) => {
  const [localRequest, setLocalRequest] = useState<HttpRequest>(request);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [preferences, setPreferences] = useState<CodeEditorProps.Preferences>({
    wrapLines: true,
    theme: 'chrome'
  });

  // Actualizar cuando cambie el request externo (solo cuando cambia de tab)
  useEffect(() => {
    console.log('Request ID cambió, cargando nuevo request:', request);
    setLocalRequest(request);
    setHasUnsavedChanges(false);
  }, [request.id]);

  // Detectar cambios
  useEffect(() => {
    const hasChanges = JSON.stringify(localRequest) !== JSON.stringify(request);
    console.log('Detectando cambios:', hasChanges, 'Local:', localRequest, 'Request:', request);
    setHasUnsavedChanges(hasChanges);
  }, [localRequest, request]);

  const handleFieldChange = (field: keyof HttpRequest, value: any) => {
    console.log('Campo cambiado:', field, value);
    setLocalRequest((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    console.log('Guardando request:', localRequest);
    onUpdate(request.id, localRequest);
    onSave(request.id);
    setHasUnsavedChanges(false);
  };

  const handleSendRequest = async () => {
    // Guardar antes de enviar
    if (hasUnsavedChanges) {
      handleSave();
    }

    setIsSending(true);

    try {
      // Construir la URL con query params
      let finalUrl = localRequest.url || '';
      if (localRequest.queryParams && localRequest.queryParams.length > 0) {
        const params = new URLSearchParams();
        localRequest.queryParams.forEach((param) => {
          if (param.key) {
            params.append(param.key, param.value);
          }
        });
        const queryString = params.toString();
        if (queryString) {
          finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryString;
        }
      }

      // Construir headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (localRequest.headers && localRequest.headers.length > 0) {
        localRequest.headers.forEach((header) => {
          if (header.key) {
            headers[header.key] = header.value;
          }
        });
      }

      const startTime = Date.now();

      // @ts-ignore
      const result = await window.electronAPI.sendHttpRequest({
        url: finalUrl,
        method: localRequest.method || 'GET',
        headers,
        body: localRequest.method !== 'GET' && localRequest.body ? localRequest.body : undefined
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (result.ok) {
        let responseText;
        
        // Intentar formatear como JSON
        try {
          if (typeof result.data === 'string') {
            // Si es string, intentar parsearlo y formatearlo
            const parsed = JSON.parse(result.data);
            responseText = JSON.stringify(parsed, null, 2);
          } else {
            // Si ya es objeto, formatearlo directamente
            responseText = JSON.stringify(result.data, null, 2);
          }
        } catch {
          // Si no es JSON válido, dejarlo como texto plano
          responseText = typeof result.data === 'string' ? result.data : String(result.data);
        }
        
        const updates = {
          response: responseText,
          responseStatus: result.status || 200,
          responseTime
        };
        setLocalRequest((prev) => ({ ...prev, ...updates }));
        onUpdate(request.id, updates);
      } else {
        const updates = {
          response: JSON.stringify({ error: result.error }, null, 2),
          responseStatus: result.status || 500,
          responseTime
        };
        setLocalRequest((prev) => ({ ...prev, ...updates }));
        onUpdate(request.id, updates);
      }
    } catch (error: any) {
      const updates = {
        response: JSON.stringify({ error: error.message }, null, 2),
        responseStatus: 500,
        responseTime: 0
      };
      setLocalRequest((prev) => ({ ...prev, ...updates }));
      onUpdate(request.id, updates);
    } finally {
      setIsSending(false);
    }
  };

  const handleAddHeader = () => {
    const newHeaders = [...(localRequest.headers || []), { key: '', value: '' }];
    handleFieldChange('headers', newHeaders);
  };

  const handleUpdateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...(localRequest.headers || [])];
    newHeaders[index][field] = value;
    handleFieldChange('headers', newHeaders);
  };

  const handleRemoveHeader = (index: number) => {
    const newHeaders = (localRequest.headers || []).filter((_, i) => i !== index);
    handleFieldChange('headers', newHeaders);
  };

  const handleAddQueryParam = () => {
    const newParams = [
      ...(localRequest.queryParams || []),
      { key: '', value: '', description: '' }
    ];
    handleFieldChange('queryParams', newParams);
  };

  const handleUpdateQueryParam = (
    index: number,
    field: 'key' | 'value' | 'description',
    value: string
  ) => {
    const newParams = [...(localRequest.queryParams || [])];
    newParams[index][field] = value;
    handleFieldChange('queryParams', newParams);
  };

  const handleRemoveQueryParam = (index: number) => {
    const newParams = (localRequest.queryParams || []).filter((_, i) => i !== index);
    handleFieldChange('queryParams', newParams);
  };

  return (
    <SpaceBetween size="m">
      {/* Barra superior con método, URL y botón Send */}
      <Container>
        <SpaceBetween size="s">
          <FormField label="Nombre">
            <Input
              value={localRequest.name}
              onChange={({ detail }) => handleFieldChange('name', detail.value)}
              placeholder="Nombre de la petición"
            />
          </FormField>
          <ColumnLayout columns={3} variant="text-grid">
            <Select
              selectedOption={{
                label: localRequest.method || 'GET',
                value: localRequest.method || 'GET'
              }}
              onChange={({ detail }) => handleFieldChange('method', detail.selectedOption.value)}
              options={[
                { label: 'GET', value: 'GET' },
                { label: 'POST', value: 'POST' },
                { label: 'PUT', value: 'PUT' },
                { label: 'DELETE', value: 'DELETE' },
                { label: 'PATCH', value: 'PATCH' }
              ]}
            />
            <div style={{ gridColumn: 'span 2' }}>
              <Input
                value={localRequest.url || ''}
                onChange={({ detail }) => handleFieldChange('url', detail.value)}
                placeholder="https://api.example.com/endpoint"
              />
            </div>
          </ColumnLayout>
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              variant="primary"
              iconName="status-positive"
              onClick={handleSendRequest}
              loading={isSending}
              disabled={!localRequest.url}
            >
              Send
            </Button>
            {hasUnsavedChanges && (
              <Button onClick={handleSave} iconName="upload">
                Guardar
              </Button>
            )}
          </SpaceBetween>
        </SpaceBetween>
      </Container>

      {/* Tabs para Params, Headers, Body */}
      <Tabs
        tabs={[
          {
            label: 'Params',
            id: 'params',
            content: (
              <Container>
                <SpaceBetween size="m">
                  <Header
                    variant="h3"
                    actions={
                      <Button iconName="add-plus" onClick={handleAddQueryParam}>
                        Agregar
                      </Button>
                    }
                  >
                    Query Params
                  </Header>
                  <Table
                    columnDefinitions={[
                      {
                        id: 'key',
                        header: 'KEY',
                        cell: (item) => {
                          const index = (localRequest.queryParams || []).indexOf(item);
                          return (
                            <Input
                              value={item.key}
                              placeholder="Key"
                              onChange={({ detail }) =>
                                handleUpdateQueryParam(index, 'key', detail.value)
                              }
                            />
                          );
                        }
                      },
                      {
                        id: 'value',
                        header: 'VALUE',
                        cell: (item) => {
                          const index = (localRequest.queryParams || []).indexOf(item);
                          return (
                            <Input
                              value={item.value}
                              placeholder="Value"
                              onChange={({ detail }) =>
                                handleUpdateQueryParam(index, 'value', detail.value)
                              }
                            />
                          );
                        }
                      },
                      {
                        id: 'description',
                        header: 'DESCRIPTION',
                        cell: (item) => {
                          const index = (localRequest.queryParams || []).indexOf(item);
                          return (
                            <Input
                              value={item.description || ''}
                              placeholder="Description"
                              onChange={({ detail }) =>
                                handleUpdateQueryParam(index, 'description', detail.value)
                              }
                            />
                          );
                        }
                      },
                      {
                        id: 'actions',
                        header: '',
                        cell: (item) => {
                          const index = (localRequest.queryParams || []).indexOf(item);
                          return (
                            <Button
                              iconName="remove"
                              variant="icon"
                              onClick={() => handleRemoveQueryParam(index)}
                            />
                          );
                        },
                        width: 50
                      }
                    ]}
                    items={localRequest.queryParams || []}
                    variant="embedded"
                    empty={
                      <Box textAlign="center" color="inherit">
                        <b>No hay parámetros</b>
                        <Box padding={{ bottom: 's' }} variant="p" color="inherit">
                          Agrega parámetros de consulta
                        </Box>
                      </Box>
                    }
                  />
                </SpaceBetween>
              </Container>
            )
          },
          {
            label: 'Headers',
            id: 'headers',
            content: (
              <Container>
                <SpaceBetween size="m">
                  <Header
                    variant="h3"
                    actions={
                      <Button iconName="add-plus" onClick={handleAddHeader}>
                        Agregar
                      </Button>
                    }
                  >
                    Headers
                  </Header>
                  <Table
                    columnDefinitions={[
                      {
                        id: 'key',
                        header: 'KEY',
                        cell: (item) => {
                          const index = (localRequest.headers || []).indexOf(item);
                          return (
                            <Input
                              value={item.key}
                              placeholder="Key"
                              onChange={({ detail }) =>
                                handleUpdateHeader(index, 'key', detail.value)
                              }
                            />
                          );
                        }
                      },
                      {
                        id: 'value',
                        header: 'VALUE',
                        cell: (item) => {
                          const index = (localRequest.headers || []).indexOf(item);
                          return (
                            <Input
                              value={item.value}
                              placeholder="Value"
                              onChange={({ detail }) =>
                                handleUpdateHeader(index, 'value', detail.value)
                              }
                            />
                          );
                        }
                      },
                      {
                        id: 'actions',
                        header: '',
                        cell: (item) => {
                          const index = (localRequest.headers || []).indexOf(item);
                          return (
                            <Button
                              iconName="remove"
                              variant="icon"
                              onClick={() => handleRemoveHeader(index)}
                            />
                          );
                        },
                        width: 50
                      }
                    ]}
                    items={localRequest.headers || []}
                    variant="embedded"
                    empty={
                      <Box textAlign="center" color="inherit">
                        <b>No hay headers</b>
                        <Box padding={{ bottom: 's' }} variant="p" color="inherit">
                          Agrega headers personalizados
                        </Box>
                      </Box>
                    }
                  />
                </SpaceBetween>
              </Container>
            )
          },
          {
            label: 'Body',
            id: 'body',
            content: (
              <Container>
                <SpaceBetween size="s">
                  <Box>
                    <SpaceBetween direction="horizontal" size="xs">
                      <Button variant="inline-link">Pretty</Button>
                      <Button variant="inline-link">Raw</Button>
                      <Button variant="inline-link">Preview</Button>
                      <Select
                        selectedOption={{ label: 'JSON', value: 'json' }}
                        options={[
                          { label: 'JSON', value: 'json' },
                          { label: 'XML', value: 'xml' },
                          { label: 'Text', value: 'text' }
                        ]}
                      />
                    </SpaceBetween>
                  </Box>
                  <CodeEditor
                    ace={(window as any).ace}
                    language="json"
                    value={localRequest.body || '{\n  \n}'}
                    onChange={(e) => handleFieldChange('body', e.detail.value)}
                    preferences={preferences}
                    onPreferencesChange={(e) => setPreferences(e.detail)}
                    editorContentHeight={300}
                    i18nStrings={{
                      loadingState: 'Cargando editor...',
                      errorState: 'Error al cargar el editor',
                      errorStateRecovery: 'Reintentar',
                      editorGroupAriaLabel: 'Editor de código',
                      statusBarGroupAriaLabel: 'Barra de estado',
                      cursorPosition: (row, column) => `Ln ${row}, Col ${column}`,
                      errorsTab: 'Errores',
                      warningsTab: 'Advertencias',
                      preferencesButtonAriaLabel: 'Preferencias',
                      paneCloseButtonAriaLabel: 'Cerrar',
                      preferencesModalHeader: 'Preferencias',
                      preferencesModalCancel: 'Cancelar',
                      preferencesModalConfirm: 'Confirmar',
                      preferencesModalWrapLines: 'Ajustar líneas',
                      preferencesModalTheme: 'Tema',
                      preferencesModalLightThemes: 'Temas claros',
                      preferencesModalDarkThemes: 'Temas oscuros'
                    }}
                  />
                </SpaceBetween>
              </Container>
            )
          }
        ]}
      />

      {/* Sección de respuesta */}
      {localRequest.response && (
        <Container
          header={
            <Header
              variant="h3"
              description={
                <SpaceBetween direction="horizontal" size="xs">
                  <Box
                    color={
                      localRequest.responseStatus &&
                      localRequest.responseStatus >= 200 &&
                      localRequest.responseStatus < 300
                        ? 'text-status-success'
                        : 'text-status-error'
                    }
                  >
                    {localRequest.responseStatus || 200}{' '}
                    {localRequest.responseStatus &&
                    localRequest.responseStatus >= 200 &&
                    localRequest.responseStatus < 300
                      ? 'OK'
                      : 'ERROR'}
                  </Box>
                  <Box>{localRequest.responseTime || 0} ms</Box>
                </SpaceBetween>
              }
            >
              Response
            </Header>
          }
        >
          <CodeEditor
            ace={(window as any).ace}
            language="json"
            value={localRequest.response || ''}
            onChange={() => {}}
            preferences={preferences}
            onPreferencesChange={(e) => setPreferences(e.detail)}
            editorContentHeight={300}
            i18nStrings={{
              loadingState: 'Cargando editor...',
              errorState: 'Error al cargar el editor',
              errorStateRecovery: 'Reintentar',
              editorGroupAriaLabel: 'Editor de código',
              statusBarGroupAriaLabel: 'Barra de estado',
              cursorPosition: (row, column) => `Ln ${row}, Col ${column}`,
              errorsTab: 'Errores',
              warningsTab: 'Advertencias',
              preferencesButtonAriaLabel: 'Preferencias',
              paneCloseButtonAriaLabel: 'Cerrar',
              preferencesModalHeader: 'Preferencias',
              preferencesModalCancel: 'Cancelar',
              preferencesModalConfirm: 'Confirmar',
              preferencesModalWrapLines: 'Ajustar líneas',
              preferencesModalTheme: 'Tema',
              preferencesModalLightThemes: 'Temas claros',
              preferencesModalDarkThemes: 'Temas oscuros'
            }}
          />
        </Container>
      )}
    </SpaceBetween>
  );
};
