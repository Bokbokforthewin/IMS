import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function PermissionMatrix() {
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [matrixState, setMatrixState] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // 1. Fetch roles and permissions on mount
  useEffect(() => {
    axios.get('/api/v1/permissions-matrix') // Adjust route prefix as needed
      .then(response => {
        const fetchedRoles = response.data.roles;
        const fetchedPermissions = response.data.allPermissions;

        setRoles(fetchedRoles);
        setAllPermissions(fetchedPermissions);

        // Initialize local checkbox state: { [roleId]: [permissionId, permissionId] }
        const initialMatrix = {};
        fetchedRoles.forEach(role => {
          initialMatrix[role.id] = role.permissions.map(p => p.id);
        });
        setMatrixState(initialMatrix);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching permissions matrix:', error);
        setLoading(false);
      });
  }, []);

  // 2. Handle checkbox toggle
  const handleCheckboxChange = (roleId, permissionId) => {
    setMatrixState(prev => {
      const currentPermissions = prev[roleId] || [];
      if (currentPermissions.includes(permissionId)) {
        // Remove permission if already checked
        return {
          ...prev,
          [roleId]: currentPermissions.filter(id => id !== permissionId)
        };
      } else {
        // Add permission if unchecked
        return {
          ...prev,
          [roleId]: [...currentPermissions, permissionId]
        };
      }
    });
  };

  // 3. Save matrix back to Laravel backend
  const handleSave = () => {
    setSaving(true);
    setMessage('');

    // Format payload to match your controller validation: matrix.*.role_id & permission_ids
    const payload = {
      matrix: Object.keys(matrixState).map(roleId => ({
        role_id: parseInt(roleId),
        permission_ids: matrixState[roleId]
      }))
    };

    axios.put('/api/v1/permissions-matrix', payload)
      .then(response => {
        setMessage('Permissions updated successfully!');
        setSaving(false);
      })
      .catch(error => {
        console.error('Error updating permissions:', error);
        setMessage('Failed to update permissions.');
        setSaving(false);
      });
  };

  if (loading) return <div>Loading permission matrix...</div>;

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Role & Permission Matrix</h2>

      {message && <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">{message}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">Permissions / Roles</th>
              {roles.map(role => (
                <th key={role.id} className="border border-gray-300 p-2 text-center">{role.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allPermissions.map(permission => (
              <tr key={permission.id}>
                <td className="border border-gray-300 p-2 font-medium">{permission.name}</td>
                {roles.map(role => {
                  const isChecked = matrixState[role.id]?.includes(permission.id) || false;
                  return (
                    <td key={role.id} className="border border-gray-300 p-2 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleCheckboxChange(role.id, permission.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving Changes...' : 'Save Permission Matrix'}
      </button>
    </div>
  );
}