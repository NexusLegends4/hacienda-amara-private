import React, { useState, useEffect, useContext } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../utils/supabase";
import { SessionContext } from "../contexts/SessionContext";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiTrash2, FiEdit2, FiDollarSign, FiClock, FiUsers, FiArrowUp, FiArrowDown, FiArrowRight, FiSave, FiX } from "react-icons/fi";

const ManagePackages = () => {
    const { profile } = useContext(SessionContext);
    const navigate = useNavigate();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        base_price: '',
        min_price: '',
        max_price: '',
        duration_hours: '',
        check_in_time: '',
        check_out_time: '',
        max_guests: '',
        additional_guest_price: '',
        features: [],
        is_active: true,
        display_order: 0
    });

    useEffect(() => {
        if (profile?.role !== "admin") {
            navigate("/");
            return;
        }
        fetchPackages();
    }, [profile, navigate]);

    const fetchPackages = async () => {
        const { data, error } = await supabase
            .from("packages")
            .select("*")
            .order("display_order", { ascending: true });
        if (error) {
            alert(error.message);
        } else {
            setPackages(data || []);
        }
        setLoading(false);
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        if (name === 'features') {
            setFormData(prev => ({
                ...prev,
                features: value.split(',').map(f => f.trim()).filter(f => f)
            }));
        } else if (type === 'number') {
            setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
        } else if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: e.target.checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = { ...formData };
        payload.base_price = parseFloat(payload.base_price) || 0;
        payload.min_price = parseFloat(payload.min_price) || 0;
        payload.max_price = parseFloat(payload.max_price) || 0;
        payload.duration_hours = parseInt(payload.duration_hours) || 0;
        payload.max_guests = parseInt(payload.max_guests) || 0;
        payload.additional_guest_price = parseFloat(payload.additional_guest_price) || 0;
        payload.display_order = parseInt(payload.display_order) || 0;

        if (editingId) {
            const { error } = await supabase
                .from("packages")
                .update(payload)
                .eq("id", editingId);
            if (error) alert(error.message);
        } else {
            const { error } = await supabase
                .from("packages")
                .insert(payload);
            if (error) alert(error.message);
        }
        setEditingId(null);
        resetForm();
        fetchPackages();
    };

    const handleEdit = (pkg) => {
        setEditingId(pkg.id);
        setEditData({
            name: pkg.name,
            description: pkg.description || '',
            base_price: pkg.base_price,
            min_price: pkg.min_price,
            max_price: pkg.max_price,
            duration_hours: pkg.duration_hours,
            check_in_time: pkg.check_in_time?.slice(0, 5) || '',
            check_out_time: pkg.check_out_time?.slice(0, 5) || '',
            max_guests: pkg.max_guests,
            additional_guest_price: pkg.additional_guest_price,
            features: pkg.features?.join(', ') || '',
            is_active: pkg.is_active,
            display_order: pkg.display_order
        });
    };

    const handleEditChange = (e) => {
        const { name, value, type } = e.target;
        setEditData(prev => ({
            ...prev,
            [name]: type === 'checkbox'
                ? e.target.checked
                : type === 'number'
                    ? (value === '' ? '' : Number(value))
                    : value
        }));
    };

    const handleSaveEdit = async (id) => {
        if (!editData) return;
        setSaving(true);
        const payload = {
            ...editData,
            base_price: Number(editData.base_price) || 0,
            min_price: Number(editData.min_price) || 0,
            max_price: Number(editData.max_price) || 0,
            duration_hours: Number(editData.duration_hours) || 0,
            max_guests: Number(editData.max_guests) || 0,
            additional_guest_price: Number(editData.additional_guest_price) || 0,
            display_order: Number(editData.display_order) || 0,
            features: editData.features.split(',').map(f => f.trim()).filter(Boolean)
        };
        const { error } = await supabase
            .from("packages")
            .update(payload)
            .eq("id", id);
        setSaving(false);
        if (error) {
            alert(error.message);
            return;
        }
        setEditingId(null);
        setEditData(null);
        fetchPackages();
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditData(null);
        resetForm();
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this package?")) return;
        const { error } = await supabase.from("packages").delete().eq("id", id);
        if (error) {
            alert(error.message);
        } else {
            fetchPackages();
        }
    };

    const handleReorder = async (id, direction) => {
        const pkg = packages.find(p => p.id === id);
        if (!pkg) return;

        const targetOrder = pkg.display_order + (direction === 'up' ? -1 : 1);
        const targetPkg = packages.find(p => p.display_order === targetOrder);
        if (!targetPkg) return;

        const { error } = await supabase
            .from("packages")
            .update({ display_order: targetOrder })
            .eq("id", id);
        if (error) return alert(error.message);

        await supabase
            .from("packages")
            .update({ display_order: pkg.display_order })
            .eq("id", targetPkg.id);

        fetchPackages();
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            base_price: '',
            min_price: '',
            max_price: '',
            duration_hours: '',
            check_in_time: '',
            check_out_time: '',
            max_guests: '',
            additional_guest_price: '',
            features: [],
            is_active: true,
            display_order: packages.length
        });
    };

    return (
        <MainLayout>
            <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
                <div className="mx-auto max-w-7xl space-y-6">
                    <div className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-2xl backdrop-blur sm:rounded-[2rem] md:p-8">
                        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div className="max-w-2xl">
                                <p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">
                                    Admin Dashboard
                                </p>
                                <h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">
                                    Manage Packages
                                </h1>
                                <p className="mt-3 max-w-xl text-sm leading-6 text-base-content/75 md:text-base">
                                    Manage room packages, pricing, and availability for reservations.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <button onClick={() => navigate(-1)} className="btn btn-black rounded-full">
                                    Back
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Add/Edit Package Form */}
                    <div className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-xl backdrop-blur sm:rounded-[2rem] md:p-8">
                        <h2 className="text-xl font-bold mb-6">{editingId ? 'Edit Package' : 'Add New Package'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Package Name</span></label>
                                    <input type="text" name="name" className="input input-bordered w-full" value={formData.name} onChange={handleChange} required />
                                </div>
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Description</span></label>
                                    <input type="text" name="description" className="input input-bordered w-full" value={formData.description} onChange={handleChange} />
                                </div>
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Base Price (₱)</span></label>
                                    <input type="number" name="base_price" step="1" className="input input-bordered w-full" value={formData.base_price} onChange={handleChange} required />
                                </div>
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Min Price (₱)</span></label>
                                    <input type="number" name="min_price" step="1" className="input input-bordered w-full" value={formData.min_price} onChange={handleChange} required />
                                </div>
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Max Price (₱)</span></label>
                                    <input type="number" name="max_price" step="1" className="input input-bordered w-full" value={formData.max_price} onChange={handleChange} required />
                                </div>
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Duration (Hours)</span></label>
                                    <input type="number" name="duration_hours" className="input input-bordered w-full" value={formData.duration_hours} onChange={handleChange} required />
                                </div>
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Check-in Time</span></label>
                                    <input type="time" name="check_in_time" className="input input-bordered w-full" value={formData.check_in_time} onChange={handleChange} required />
                                </div>
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Check-out Time</span></label>
                                    <input type="time" name="check_out_time" className="input input-bordered w-full" value={formData.check_out_time} onChange={handleChange} required />
                                </div>
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Max Guests</span></label>
                                    <input type="number" name="max_guests" className="input input-bordered w-full" value={formData.max_guests} onChange={handleChange} required />
                                </div>
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Additional Guest Price (₱)</span></label>
                                    <input type="number" name="additional_guest_price" step="1" className="input input-bordered w-full" value={formData.additional_guest_price} onChange={handleChange} required />
                                </div>
                                <div className="form-control md:col-span-2 lg:col-span-3">
                                    <label className="label"><span className="label-text">Features (comma separated)</span></label>
                                    <input type="text" name="features" className="input input-bordered w-full" value={formData.features?.join(', ') || ''} onChange={handleChange} placeholder="e.g., Check In: 9:00 AM, Check Out: 6:00 PM, Good for 20 Pax" />
                                </div>
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Display Order</span></label>
                                    <input type="number" name="display_order" className="input input-bordered w-full" value={formData.display_order} onChange={handleChange} />
                                </div>
                                <div className="form-control">
                                    <label className="label cursor-pointer flex items-center gap-2">
                                        <input type="checkbox" name="is_active" className="checkbox checkbox-primary" checked={formData.is_active} onChange={handleChange} />
                                        <span className="label-text">Active</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button type="submit" className="btn btn-black rounded-full">
                                    {editingId ? 'Update Package' : 'Add Package'}
                                </button>
                                {editingId && (
                                    <button type="button" onClick={cancelEdit} className="btn btn-ghost rounded-full">
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Packages List */}
                    <div className="rounded-[1.5rem] border border-black/5 bg-white/70 p-6 shadow-xl backdrop-blur sm:rounded-[2rem] md:p-8">
                        <h2 className="text-xl font-bold mb-4">All Packages</h2>
                        {loading ? (
                            <div className="flex items-center justify-center h-32"><span className="loading loading-spinner loading-lg"></span></div>
                        ) : packages.length === 0 ? (
                            <div className="p-12 text-center border-2 border-dashed border-base-300 rounded-3xl opacity-50">No packages found. Add one above.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table w-full">
                                    <thead>
                                        <tr>
                                            <th>Order</th>
                                            <th>Name</th>
                                            <th>Price Range</th>
                                            <th>Duration</th>
                                            <th>Check-in/out</th>
                                            <th>Max Guests</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                            {packages.map((pkg) => (
                                                <tr key={pkg.id} className={editingId === pkg.id ? 'bg-warning/10' : ''}>
                                                    {editingId === pkg.id && editData ? (
                                                        <>
                                                            <td><input type="number" name="display_order" value={editData.display_order} onChange={handleEditChange} className="input input-bordered input-sm w-20" /></td>
                                                            <td><input type="text" name="name" value={editData.name} onChange={handleEditChange} className="input input-bordered input-sm w-full" required /></td>
                                                            <td>
                                                                <div className="flex flex-col gap-1">
                                                                    <input type="number" name="min_price" value={editData.min_price} onChange={handleEditChange} className="input input-bordered input-sm w-28" placeholder="Min" />
                                                                    <input type="number" name="max_price" value={editData.max_price} onChange={handleEditChange} className="input input-bordered input-sm w-28" placeholder="Max" />
                                                                </div>
                                                            </td>
                                                            <td><input type="number" name="duration_hours" value={editData.duration_hours} onChange={handleEditChange} className="input input-bordered input-sm w-20" /></td>
                                                            <td>
                                                                <div className="flex flex-col gap-1">
                                                                    <input type="time" name="check_in_time" value={editData.check_in_time} onChange={handleEditChange} className="input input-bordered input-sm" />
                                                                    <input type="time" name="check_out_time" value={editData.check_out_time} onChange={handleEditChange} className="input input-bordered input-sm" />
                                                                </div>
                                                            </td>
                                                            <td><input type="number" name="max_guests" value={editData.max_guests} onChange={handleEditChange} className="input input-bordered input-sm w-20" /></td>
                                                            <td>
                                                                <label className="flex items-center gap-2">
                                                                    <input type="checkbox" name="is_active" checked={editData.is_active} onChange={handleEditChange} className="checkbox checkbox-sm checkbox-primary" />
                                                                    {editData.is_active ? 'Active' : 'Inactive'}
                                                                </label>
                                                            </td>
                                                            <td>
                                                                <div className="flex items-center gap-1">
                                                                    <button type="button" onClick={() => handleSaveEdit(pkg.id)} disabled={saving} className="btn btn-ghost btn-sm btn-circle text-success" title="Save"><FiSave /></button>
                                                                    <button type="button" onClick={cancelEdit} disabled={saving} className="btn btn-ghost btn-sm btn-circle text-error" title="Cancel"><FiX /></button>
                                                                </div>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="font-medium">{pkg.display_order}</td>
                                                            <td>{pkg.name}</td>
                                                            <td>₱{Number(pkg.min_price).toLocaleString()} - ₱{Number(pkg.max_price).toLocaleString()}</td>
                                                            <td>{pkg.duration_hours} hrs</td>
                                                            <td>{pkg.check_in_time?.slice(0,5)} / {pkg.check_out_time?.slice(0,5)}</td>
                                                            <td>{pkg.max_guests}</td>
                                                            <td>
                                                                <span className={`badge ${pkg.is_active ? 'badge-success' : 'badge-error'}`}>
                                                                    {pkg.is_active ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <div className="flex items-center gap-2">
                                                                    <button onClick={() => handleEdit(pkg)} className="btn btn-ghost btn-sm btn-circle" title="Edit"><FiEdit2 /></button>
                                                                    <button onClick={() => handleReorder(pkg.id, 'up')} className="btn btn-ghost btn-sm btn-circle" title="Move Up" disabled={pkg.display_order === 0}><FiArrowUp /></button>
                                                                    <button onClick={() => handleReorder(pkg.id, 'down')} className="btn btn-ghost btn-sm btn-circle" title="Move Down"><FiArrowDown /></button>
                                                                    <button onClick={() => handleDelete(pkg.id)} className="btn btn-ghost btn-sm btn-circle text-error" title="Delete"><FiTrash2 /></button>
                                                                </div>
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default ManagePackages;