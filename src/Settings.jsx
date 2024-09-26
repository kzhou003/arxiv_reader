import React, { useState, useEffect } from 'react';

function Settings() {
    const [apiKey, setApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    // Load the API key when the component mounts
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.invoke('load-api-key').then(savedApiKey => {
        if (savedApiKey) {
          setApiKey(savedApiKey);
        }
      }).catch(error => {
        console.error('Failed to load API key:', error);
        setSaveError('Failed to load API key. Please try again.');
      });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    if (window.electron && window.electron.ipcRenderer) {
      try {
        console.log('Attempting to save API key...');
        // Save the API key
        const result = await window.electron.ipcRenderer.invoke('save-api-key', apiKey);
        console.log('Save API key result:', result);
        
        // Check if the save was successful
        if (result && result.success) {
          console.log('API key saved successfully');
          // Close the window
          window.electron.ipcRenderer.send('close-settings-window');
        } else {
          throw new Error('Failed to save API key');
        }
      } catch (error) {
        console.error('Failed to save API key:', error);
        setSaveError('Failed to save API key. Please try again.');
      } finally {
        setIsSaving(false);
      }
    } else {
      console.error('Electron IPC not available');
      setSaveError('Electron IPC not available. Cannot save API key.');
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif', maxWidth: '500px', margin: '0 auto', backgroundColor: '#f9f9f9', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#333', borderBottom: '2px solid #FFA500', paddingBottom: '10px', marginBottom: '20px' }}>Settings</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="apiKey" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
            SambaNova API Key:
          </label>
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '16px',
              transition: 'border-color 0.3s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#FFA500'}
            onBlur={(e) => e.target.style.borderColor = '#ddd'}
          />
        </div>
        <button
          type="submit"
          disabled={isSaving}
          style={{
            padding: '12px 20px',
            backgroundColor: '#FFA500',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            opacity: isSaving ? 0.5 : 1,
            transition: 'background-color 0.3s',
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#FF8C00'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#FFA500'}
        >
          {isSaving ? 'Saving...' : 'Save API Key'}
        </button>
      </form>
      {saveError && <p style={{ color: 'red', marginTop: '10px' }}>{saveError}</p>}
    </div>
  );
}

export default Settings;
