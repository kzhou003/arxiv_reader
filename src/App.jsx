import * as React from 'react';
import { createRoot } from 'react-dom/client';
import Settings from './Settings.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faTimes, faRobot } from '@fortawesome/free-solid-svg-icons';

const topics = {
    "Astrophysics": ["Astrophysics of Galaxies", "Cosmology and Nongalactic Astrophysics", "Earth and Planetary Astrophysics", "High Energy Astrophysical Phenomena", "Instrumentation and Methods for Astrophysics", "Solar and Stellar Astrophysics"],
    "Condensed Matter": ["Disordered Systems and Neural Networks", "Materials Science", "Mesoscale and Nanoscale Physics", "Other Condensed Matter", "Quantum Gases", "Soft Condensed Matter", "Statistical Mechanics", "Strongly Correlated Electrons", "Superconductivity"],
    "General Relativity and Quantum Cosmology": ["None"],
    "High Energy Physics - Experiment": ["None"],
    "High Energy Physics - Lattice": ["None"],
    "High Energy Physics - Phenomenology": ["None"],
    "High Energy Physics - Theory": ["None"],
    "Mathematical Physics": ["None"],
    "Nonlinear Sciences": ["Adaptation and Self-Organizing Systems", "Cellular Automata and Lattice Gases", "Chaotic Dynamics", "Exactly Solvable and Integrable Systems", "Pattern Formation and Solitons"],
    "Nuclear Experiment": ["None"],
    "Nuclear Theory": ["None"],
    "Physics": ["Accelerator Physics", "Applied Physics", "Atmospheric and Oceanic Physics", "Atomic and Molecular Clusters", "Atomic Physics", "Biological Physics", "Chemical Physics", "Classical Physics", "Computational Physics", "Data Analysis, Statistics and Probability", "Fluid Dynamics", "General Physics", "Geophysics", "History and Philosophy of Physics", "Instrumentation and Detectors", "Medical Physics", "Optics", "Physics and Society", "Physics Education", "Plasma Physics", "Popular Physics", "Space Physics"],
    "Quantum Physics": ["None"],
    "Mathematics": ["Algebraic Geometry", "Algebraic Topology", "Analysis of PDEs", "Category Theory", "Classical Analysis and ODEs", "Combinatorics", "Commutative Algebra", "Complex Variables", "Differential Geometry", "Dynamical Systems", "Functional Analysis", "General Mathematics", "General Topology", "Geometric Topology", "Group Theory", "History and Overview", "Information Theory", "K-Theory and Homology", "Logic", "Mathematical Physics", "Metric Geometry", "Number Theory", "Numerical Analysis", "Operator Algebras", "Optimization and Control", "Probability", "Quantum Algebra", "Representation Theory", "Rings and Algebras", "Spectral Theory", "Statistics Theory", "Symplectic Geometry"],
    "Computer Science": ["Artificial Intelligence", "Computation and Language", "Computational Complexity", "Computational Engineering, Finance, and Science", "Computational Geometry", "Computer Science and Game Theory", "Computer Vision and Pattern Recognition", "Computers and Society", "Cryptography and Security", "Data Structures and Algorithms", "Databases", "Digital Libraries", "Discrete Mathematics", "Distributed, Parallel, and Cluster Computing", "Emerging Technologies", "Formal Languages and Automata Theory", "General Literature", "Graphics", "Hardware Architecture", "Human-Computer Interaction", "Information Retrieval", "Information Theory", "Logic in Computer Science", "Machine Learning", "Mathematical Software", "Multiagent Systems", "Multimedia", "Networking and Internet Architecture", "Neural and Evolutionary Computing", "Numerical Analysis", "Operating Systems", "Other Computer Science", "Performance", "Programming Languages", "Robotics", "Social and Information Networks", "Software Engineering", "Sound", "Symbolic Computation", "Systems and Control"],
    "Quantitative Biology": ["Biomolecules", "Cell Behavior", "Genomics", "Molecular Networks", "Neurons and Cognition", "Other Quantitative Biology", "Populations and Evolution", "Quantitative Methods", "Subcellular Processes", "Tissues and Organs"],
    "Quantitative Finance": ["Computational Finance", "Economics", "General Finance", "Mathematical Finance", "Portfolio Management", "Pricing of Securities", "Risk Management", "Statistical Finance", "Trading and Market Microstructure"],
    "Statistics": ["Applications", "Computation", "Machine Learning", "Methodology", "Other Statistics", "Statistics Theory"],
    "Electrical Engineering and Systems Science": ["Audio and Speech Processing", "Image and Video Processing", "Signal Processing", "Systems and Control"],
    "Economics": ["Econometrics", "General Economics", "Theoretical Economics"]
}

function MainApp() {
  const [topic, setTopic] = React.useState('');
  const [subjects, setSubjects] = React.useState([]);
  const [interests, setInterests] = React.useState('');
  const [maxResults, setMaxResults] = React.useState(10);
  const [papers, setPapers] = React.useState([]);
  const [apiKey, setApiKey] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.on('api-key-updated', (newApiKey) => {
        setApiKey(newApiKey);
      });
    }
  }, []);

  React.useEffect(() => {
    if (window.electron && window.electron.ipcRenderer) {
      const handlePythonScriptResult = (event, result) => {
        console.log('Received result:', result);
        if (Array.isArray(result) && result.length > 0) {
          setPapers(result);
          console.log('Papers state updated:', result);
        } else {
          console.warn('Received empty or invalid result');
          setPapers([]);
        }
        setIsLoading(false);
      };

      window.electron.ipcRenderer.on('python-script-result', handlePythonScriptResult);

      // Cleanup function
      return () => {
        window.electron.ipcRenderer.removeListener('python-script-result', handlePythonScriptResult);
      };
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Check if topic and subjects are selected
    if (!topic) {
      setError('Please select a topic');
      setIsLoading(false);
      return;
    }

    if (subjects.length === 0) {
      setError('Please select at least one subject');
      setIsLoading(false);
      return;
    }

    try {
      if (window.electron && window.electron.ipcRenderer) {
        console.log('Sending request with params:', { topic, subjects, interests, maxResults});
        const results = await window.electron.ipcRenderer.invoke('run-python-script', {
          topic,
          subjects,
          interests,
          maxResults,
        });
        console.log('Received results:', results);
        setPapers(results);
      } else {
        throw new Error('Electron IPC not available');
      }
    } catch (error) {
      console.error('Error running Python script:', error);
      setError(error.message || 'An error occurred while generating papers');
      setPapers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openSettings = () => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('open-settings');
    }
  };

  const addSubject = (subject) => {
    if (!subjects.includes(subject)) {
      setSubjects([...subjects, subject]);
    }
  };

  const removeSubject = (subject) => {
    setSubjects(subjects.filter(s => s !== subject));
  };

  return (
    <div style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Arial, sans-serif',
        width: '100%',
        height: '100vh',
        margin: 0,
        backgroundColor: '#f5f5f5',
        boxSizing: 'border-box', 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <button onClick={openSettings} style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '24px',
              color: '#FFA500',
              transition: 'transform 0.2s',
            }}>
              <FontAwesomeIcon icon={faCog} />
            </button>
          </div>
        </div>
  
        <div style={{ display: 'flex', gap: '20px', flexGrow: 1, overflow: 'hidden' }}>
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minWidth: '300px', maxWidth: '400px' }}>
            <form onSubmit={handleSubmit} style={{
              backgroundColor: '#FFF5E6',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}>
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="topic" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Topic:</label>
              <select
                id="topic"
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setSubjects([]);
                }}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', color: '#333', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7em top 50%', backgroundSize: '.65em auto' }}
              >
                <option value="">Select a topic</option>
                {Object.keys(topics).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {topic && (
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="subject" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Subjects:</label>
                <select
                  id="subject"
                  onChange={(e) => addSubject(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', color: '#333', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7em top 50%', backgroundSize: '.65em auto' }}
                >
                  <option value="">Select a subject</option>
                  {topics[topic].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {subjects.map((subject) => (
                    <div key={subject} style={{
                      backgroundColor: '#FFA500',
                      color: 'white',
                      padding: '5px 10px',
                      borderRadius: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '14px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}>
                      {subject}
                      <button
                        onClick={() => removeSubject(subject)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          marginLeft: '5px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          transition: 'transform 0.2s',
                        }}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginBottom: '15px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="interests" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Interests:</label>
              <textarea
                id="interests"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  border: '1px solid #ddd', 
                  flexGrow: 1, 
                  resize: 'none', 
                  color: '#333',
                  alignSelf: 'center'
                }}
                placeholder="Describe your specific interests..."
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="maxResults" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Max Results:</label>
              <input
                type="number"
                id="maxResults"
                value={maxResults}
                onChange={(e) => setMaxResults(parseInt(e.target.value))}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', color: '#333' }}
                min="1"
                max="100"
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoading} 
              style={{
                padding: '12px 24px',
                backgroundColor: isLoading ? '#FFD700' : '#FFA500',
                color: isLoading ? '#333' : 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '18px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                width: '100%',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{
                display: 'inline-block',
                marginRight: isLoading ? '30px' : '0',
                transition: 'margin 0.3s ease',
              }}>
                {isLoading ? 'Searching...' : 'Search Papers'}
              </span>
              {isLoading && (
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '3px solid #FFA500',
                  borderTop: '3px solid #FFD700',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  position: 'absolute',
                  top: '50%',
                  right: '24px',
                  transform: 'translateY(-50%)',
                }}></div>
              )}
              {isLoading && (
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '0',
                  width: '100%',
                  height: '4px',
                  backgroundColor: '#FFD700',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#FFA500',
                    animation: 'progress 10s linear',
                  }}></div>
                </div>
              )}
            </button>
            <style>
              {`
                @keyframes spin {
                  0% { transform: translate(-50%, -50%) rotate(0deg); }
                  100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
              `}
            </style>
          </form>
          {error && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#ffebee',
              color: '#c62828',
              borderRadius: '4px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              Error: {error}
            </div>
          )}
        </div>
        <div style={{ flex: '2', overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: '600px' }}>
          {papers.length > 0 && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '20px' }}>
              <h2 style={{ color: '#333', borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '15px' }}>Selected Papers for your interests</h2>
              <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                {papers.map((paper, index) => (
                  <div key={index} style={{
                    marginBottom: '20px',
                    padding: '15px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    transition: 'box-shadow 0.3s',
                    ':hover': {
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    },
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{
                        fontSize: '1em',
                        color: '#87CEFA', // Changed to light blue color
                        fontWeight: 'bold',
                        backgroundColor: paper.relevancy_score >= 3 ? '#FFF3E0' : 'transparent',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        boxShadow: paper.relevancy_score >= 7 ? '0 1px 3px rgba(135,206,250,0.3)' : 'none', // Updated shadow color
                      }}>
                        Score: {paper.relevancy_score}
                      </span>
                      <span style={{ fontSize: '0.8em', color: '#555' }}>{paper.subjects}</span>
                      <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8em', color: '#FFA500', textDecoration: 'none' }}>PDF</a>
                    </div>
                    <h3 style={{ marginBottom: '10px' }}>
                      <a href={paper.url} target="_blank" rel="noopener noreferrer" style={{
                        color: '#FFA500',
                        textDecoration: 'none',
                        ':hover': {
                          textDecoration: 'underline',
                        },
                      }}>{paper.title}</a>
                    </h3>
                    <p style={{ color: '#555', lineHeight: '1.6', marginBottom: '10px' }}><strong>Authors:</strong> {paper.authors}</p>
                    <p style={{ color: '#555', lineHeight: '1.6', marginBottom: '10px' }}><strong>Abstract:</strong> {paper.abstract}</p>
                    
                    <p style={{ color: '#555', lineHeight: '1.6', marginBottom: '10px' }}><strong>Reasons for match:</strong> {paper.reasons_for_match}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
    const [currentRoute, setCurrentRoute] = React.useState(window.location.hash);
  
    React.useEffect(() => {
      const handleHashChange = () => {
        setCurrentRoute(window.location.hash);
      };
  
      window.addEventListener('hashchange', handleHashChange);
  
      return () => {
        window.removeEventListener('hashchange', handleHashChange);
      };
    }, []);
  
    return (
        <div style={{ height: '100%', width: '100%' }}>
        {currentRoute === '#settings' ? <Settings /> : <MainApp />}
      </div>
    );
  }

const root = createRoot(document.body);
root.render(<App />);
