import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, doc } from 'firebase/firestore'; // Importa doc para referencias a documentos específicos
import { db } from '../firebaseConfig'; // Tu configuración de Firebase
import { MoreHorizontal } from 'lucide-react'; // Icono de tres puntos para el menú

// --- COMPONENTES BÁSICOS (Si no tienes los tuyos propios en src/components) ---
const Button = ({ children, className = '', ...props }) => (
  <button
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors
      focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50
      bg-blue-600 text-white hover:bg-blue-700 h-9 px-4 py-2 ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Card = ({ children, className = '' }) => (
  <div className={`rounded-lg border bg-white text-gray-900 shadow-sm ${className}`}>
    {children}
  </div>
);
// --- FIN COMPONENTES BÁSICOS ---

function Projects() {
  const [projects, setProjects] = useState([]);
  const [usersData, setUsersData] = useState({}); // Almacenará datos de usuarios: { userId: { photoURL, email, displayName }, ... }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set()); // Para la selección de checkboxes

  const fetchProjectAndUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Projects
      const projectsCollectionRef = collection(db, "Projects");
      const projectSnapshot = await getDocs(projectsCollectionRef);
      const fetchedProjects = projectSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProjects(fetchedProjects);

      // 2. Collect unique User IDs from projects
      const uniqueUserIds = new Set();
      fetchedProjects.forEach(project => {
        if (project.userId) { // Assuming 'userId' field exists in project documents
          uniqueUserIds.add(project.userId);
        }
      });

      // 3. Fetch User Data for unique IDs (from a 'Users' collection)
      const fetchedUsers = {};
      if (uniqueUserIds.size > 0) {
        // Create an array of promises for fetching individual user documents
        const userPromises = Array.from(uniqueUserIds).map(async (uid) => {
          const userDocRef = doc(db, "Users", uid); // Assuming a 'Users' collection where doc.id is the UID
          const userDoc = await getDocs(userDocRef);
          if (userDoc.exists()) {
            fetchedUsers[uid] = userDoc.data();
          } else {
            console.warn(`User document not found for UID: ${uid}`);
          }
        });
        await Promise.all(userPromises);
      }
      setUsersData(fetchedUsers);

    } catch (err) {
      console.error("Error al cargar los datos:", err);
      setError("No se pudieron cargar los datos. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []); // Dependencias vacías para que la función se cree una vez

  useEffect(() => {
    fetchProjectAndUserData();
  }, [fetchProjectAndUserData]); // Se ejecuta cuando fetchProjectAndUserData cambia (en este caso, solo una vez)


  const handleCheckboxChange = (id) => {
    setSelectedRows((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  };

  const handleSelectAllChange = (e) => {
    if (e.target.checked) {
      const allProjectIds = projects.map(project => project.id);
      setSelectedRows(new Set(allProjectIds));
    } else {
      setSelectedRows(new Set());
    }
  };

  return (
    <div className="p-6 min-w-full w-[76vw]">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Projects</h2>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">Add Project</Button>
        </div>

        {loading && <p className="text-center text-gray-600">Cargando proyectos y datos de usuarios...</p>}
        {error && <p className="text-center text-red-600">Error: {error}</p>}

        {!loading && !error && (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out rounded"
                      checked={selectedRows.size === projects.length && projects.length > 0}
                      onChange={handleSelectAllChange}
                    />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User Email
                  </th> {/* Cambiado a User Email para claridad */}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      No hay proyectos disponibles.
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => {
                    const user = usersData[project.userId] || {}; // Get user data using userId
                    const userPhoto = user.photoURL || "https://via.placeholder.com/40/007bff/ffffff?text=U";
                    const userEmailDisplay = user.email || project.userId || "N/A"; // Prefer user.email from Users collection, fallback to project.userId

                    return (
                      <tr key={project.id} className={selectedRows.has(project.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out rounded"
                            checked={selectedRows.has(project.id)}
                            onChange={() => handleCheckboxChange(project.id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 mr-3">
                              <img
                                className="h-10 w-10 rounded-full object-cover border border-gray-200"
                                src={userPhoto}
                                alt={`Foto de ${userEmailDisplay}`}
                              />
                            </div>
                            <div>
                              {project.name || "N/A"}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {userEmailDisplay}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {project.provider || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-between items-center text-sm text-gray-600">
          <span>{selectedRows.size} of {projects.length} row(s) selected.</span>
          <div className="flex space-x-2">
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">Previous</Button>
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default Projects;