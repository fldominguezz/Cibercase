import React, { useState, useEffect } from 'react';
import { getAllRoles, getAllPermissions, createRole, updateRole, deleteRole } from '../api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';

const RoleManager = () => {
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [rolesData, permissionsData] = await Promise.all([
                getAllRoles(),
                getAllPermissions(),
            ]);
            setRoles(rolesData);
            setPermissions(permissionsData);
            setError(null);
        } catch (error) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (role = null) => {
        setEditingRole(role);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingRole(null);
        setIsModalOpen(false);
    };

    const handleDeleteRole = async (roleId) => {
        if (window.confirm('Are you sure you want to delete this role?')) {
            try {
                await deleteRole(roleId);
                fetchData(); // Refresh list
            } catch (error) {
                setError(error.message);
            }
        }
    };

    if (isLoading) return <div>Loading roles and permissions...</div>;
    if (error) return <div className="alert alert-danger">Error: {error}</div>;

    return (
        <div className="container mt-4">
            <h2 className="mb-4">Role Management</h2>

            <button className="btn btn-primary mb-3" onClick={() => handleOpenModal()}>
                <FontAwesomeIcon icon={faPlus} className="me-2" />
                Create New Role
            </button>

            <div className="card">
                <div className="card-header">
                    <h4 className="mb-0">Lista de Roles</h4>
                </div>
                <div className="card-body">
                    <table className="table table-striped">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Description</th>
                                <th>Permissions</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.map(role => (
                                <tr key={role.id}>
                                    <td>{role.name}</td>
                                    <td>{role.description}</td>
                                    <td>
                                        {role.permissions.map(p => (
                                            <span key={p.id} className="badge bg-secondary me-1">{p.name}</span>
                                        ))}
                                    </td>
                                    <td>
                                        <button className="btn btn-sm btn-secondary me-2" onClick={() => handleOpenModal(role)}>
                                            <FontAwesomeIcon icon={faPenToSquare} />
                                        </button>
                                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteRole(role.id)}>
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {isModalOpen && (
                <RoleEditModal
                    role={editingRole}
                    allPermissions={permissions}
                    onClose={handleCloseModal}
                    onSave={fetchData}
                />
            )}
        </div>
    );
};

const RoleEditModal = ({ role, allPermissions, onClose, onSave }) => {
    const [name, setName] = useState(role ? role.name : '');
    const [description, setDescription] = useState(role ? role.description : '');
    const [selectedPermissions, setSelectedPermissions] = useState(
        role ? role.permissions.map(p => p.id) : []
    );
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const handlePermissionChange = (permissionId) => {
        setSelectedPermissions(prev =>
            prev.includes(permissionId)
                ? prev.filter(id => id !== permissionId)
                : [...prev, permissionId]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        
        const roleData = { name, description, permission_ids: selectedPermissions };

        try {
            if (role) {
                await updateRole(role.id, roleData);
            } else {
                await createRole(roleData);
            }
            onSave();
            onClose();
        } catch (error) {
            setError(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <form onSubmit={handleSubmit}>
                        <div className="modal-header">
                            <h5 className="modal-title">{role ? 'Edit Role' : 'Create Role'}</h5>
                            <button type="button" className="btn-close" onClick={onClose}></button>
                        </div>
                        <div className="modal-body">
                            {error && <div className="alert alert-danger">{error}</div>}
                            <div className="mb-3">
                                <label htmlFor="roleName" className="form-label">Role Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="roleName"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="roleDescription" className="form-label">Description</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="roleDescription"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>
                            <div className="mb-3">
                               <h6>Permissions</h6>
                                <div className="permission-checkbox-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {allPermissions.map(permission => (
                                        <div key={permission.id} className="form-check">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id={`perm-${permission.id}`}
                                                checked={selectedPermissions.includes(permission.id)}
                                                onChange={() => handlePermissionChange(permission.id)}
                                            />
                                            <label className="form-check-label" htmlFor={`perm-${permission.id}`}>
                                                {permission.name} ({permission.description})
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                            <button type="submit" className="btn btn-primary" disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Role'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RoleManager;
