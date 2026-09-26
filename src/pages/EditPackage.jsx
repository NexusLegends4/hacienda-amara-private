import React, { useState, useEffect, useContext } from "react";
import MainLayout from "../layouts/MainLayout";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { SessionContext } from "../contexts/SessionContext";
import { FiEdit2, FiArrowRight } from "react-icons/fi";

const emptyForm = {
    name: "",
    description: "",
    base_price: "",
    min_price: "",
    max_price: "",
    duration_hours: "",
    check_in_time: "",
    check_out_time: "",
    max_guests: "",
    additional_guest_price: "",
    features: "",
    is_active: true,
    display_order: 0,
};

const EditPackage = () => {
    const { packageId } = useParams();
    const navigate = useNavigate();
    const { session, profile } = useContext(SessionContext);
    const [packageData, setPackageData] = useState(null);
    const [packagesList, setPackagesList] = useState([]);
    const [formData, setFormData] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState("");

    const isAdmin = session && profile?.role === "admin";

    const loadPackage = async (id) => {
        setLoading(true);
        setLoadError("");
        const { data, error } = await supabase
            .from("packages")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            setLoadError(error.message);
            setPackageData(null);
        } else {
            setPackageData(data);
            setFormData({
                name: data.name || "",
                description: data.description || "",
                base_price: data.base_price ?? "",
                min_price: data.min_price ?? "",
                max_price: data.max_price ?? "",
                duration_hours: data.duration_hours ?? "",
                check_in_time: data.check_in_time?.slice(0, 5) || "",
                check_out_time: data.check_out_time?.slice(0, 5) || "",
                max_guests: data.max_guests ?? "",
                additional_guest_price: data.additional_guest_price ?? "",
                features: data.features?.join(", ") || "",
                is_active: data.is_active ?? true,
                display_order: data.display_order ?? 0,
            });
        }
        setLoading(false);
    };

    const loadPackagesList = async () => {
        setLoading(true);
        setLoadError("");
        const { data, error } = await supabase
            .from("packages")
            .select("id, name, base_price, max_price")
            .order("display_order", { ascending: true });

        if (error) {
            setLoadError(error.message);
            setPackagesList([]);
        } else {
            setPackagesList(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (!session) return;
        if (!profile) return;
        if (profile.role !== "admin") {
            navigate("/", { replace: true });
            return;
        }
        if (packageId) {
            loadPackage(packageId);
        } else {
            loadPackagesList();
        }
    }, [packageId, session, profile, navigate]);

    const handleChange = (event) => {
        const { name, value, type } = event.target;
        setFormData((current) => ({
            ...current,
            [name]: type === "checkbox"
                ? event.target.checked
                : type === "number"
                    ? (value === "" ? "" : Number(value))
                    : value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!packageId) return;

        const payload = {
            ...formData,
            base_price: Number(formData.base_price) || 0,
            min_price: Number(formData.min_price) || 0,
            max_price: Number(formData.max_price) || 0,
            duration_hours: Number(formData.duration_hours) || 0,
            max_guests: Number(formData.max_guests) || 0,
            additional_guest_price: Number(formData.additional_guest_price) || 0,
            display_order: Number(formData.display_order) || 0,
            features: String(formData.features)
                .split(",")
                .map((feature) => feature.trim())
                .filter(Boolean),
        };

        setSaving(true);
        const { error } = await supabase
            .from("packages")
            .update(payload)
            .eq("id", packageId);
        setSaving(false);

        if (error) {
            alert(error.message);
            return;
        }

        navigate("/manage-packages");
    };

    if (!session) {
        return (
            <MainLayout>
                <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
                    <div className="mx-auto max-w-3xl rounded-[1.5rem] border border-black/5 bg-white/75 p-6 text-center shadow-2xl backdrop-blur sm:rounded-[2rem] md:p-8">
                        <h1 className="text-2xl font-black text-base-content">Admin access required</h1>
                        <p className="mt-3 text-sm leading-6 text-base-content/70">Please log in with an administrator account to edit packages.</p>
                        <Link to="/log-in" className="btn btn-black mt-6 rounded-full">Log In</Link>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!profile) {
        return (
            <MainLayout>
                <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
                    <div className="mx-auto max-w-5xl rounded-[2rem] border border-black/5 bg-white/75 p-6 shadow-2xl backdrop-blur-xl md:p-8">Checking access...</div>
                </div>
            </MainLayout>
        );
    }

    if (profile.role !== "admin") {
        return (
            <MainLayout>
                <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
                    <div className="mx-auto max-w-3xl rounded-[1.5rem] border border-black/5 bg-white/75 p-6 text-center shadow-2xl backdrop-blur sm:rounded-[2rem] md:p-8">
                        <h1 className="text-2xl font-black text-base-content">Access restricted</h1>
                        <p className="mt-3 text-sm leading-6 text-base-content/70">This page is available only to administrators.</p>
                        <Link to="/" className="btn btn-black mt-6 rounded-full">Back Home</Link>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (loading) {
        return (
            <MainLayout>
                <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
                    <div className="mx-auto max-w-5xl rounded-[2rem] border border-black/5 bg-white/75 p-6 shadow-2xl backdrop-blur-xl md:p-8">
                        <div className="flex h-32 items-center justify-center"><span className="loading loading-spinner loading-lg"></span></div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (loadError) {
        return (
            <MainLayout>
                <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
                    <div className="mx-auto max-w-3xl rounded-[1.5rem] border border-error bg-error/5 p-6 text-center shadow-xl">
                        <h1 className="text-2xl font-black text-error">Unable to load package</h1>
                        <p className="mt-3 text-sm text-error/80">{loadError}</p>
                        <button type="button" onClick={() => navigate("/manage-packages")} className="btn btn-error mt-6 rounded-full text-white">Back to Packages</button>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!packageId) {
        return (
            <MainLayout>
                <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
                    <div className="mx-auto max-w-5xl rounded-[2rem] border border-black/5 bg-white/75 p-6 shadow-2xl backdrop-blur-xl md:p-8">
                        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                            <div className="max-w-2xl">
                                <p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">Edit Package</p>
                                <h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">Select a package to edit</h1>
                                <p className="mt-3 max-w-xl text-sm leading-6 text-base-content/75 md:text-base">Choose a room package from the list below to modify its details.</p>
                            </div>
                            <button type="button" onClick={() => navigate("/manage-packages")} className="btn btn-black rounded-full">Back</button>
                        </div>

                        {packagesList.length === 0 ? (
                            <div className="p-12 text-center border-2 border-dashed border-base-300 rounded-3xl opacity-50">No packages found. Add one in Manage Packages first.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table w-full">
                                    <thead>
                                        <tr><th>#</th><th>Name</th><th>Price Range</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {packagesList.map((pkg, index) => (
                                            <tr key={pkg.id}>
                                                <td className="font-medium">{index + 1}</td>
                                                <td>{pkg.name}</td>
                                                <td>₱{Number(pkg.base_price).toLocaleString()} - ₱{Number(pkg.max_price).toLocaleString()}</td>
                                                <td>
                                                    <button type="button" onClick={() => navigate(`/edit-package/${pkg.id}`)} className="btn btn-ghost btn-sm btn-circle" title="Edit">
                                                        <FiEdit2 /><FiArrowRight className="ml-1" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#fffaf0] via-[#fff5e6] to-[#f8ecd8] px-3 py-4 sm:px-4 sm:py-6 md:px-6">
                <div className="mx-auto max-w-5xl rounded-[2rem] border border-black/5 bg-white/75 p-6 shadow-2xl backdrop-blur-xl md:p-8">
                    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/55">Edit Package</p>
                            <h1 className="mt-3 text-3xl font-black tracking-tight text-base-content md:text-4xl">Update package details</h1>
                            <p className="mt-3 max-w-xl text-sm leading-6 text-base-content/75 md:text-base">Modify the pricing, schedule, and features for this room package.</p>
                        </div>
                        <button type="button" onClick={() => navigate("/manage-packages")} className="btn btn-black rounded-full">Back</button>
                    </div>

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
                                <input type="number" name="base_price" step="1" min="0" className="input input-bordered w-full" value={formData.base_price} onChange={handleChange} required />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">Min Price (₱)</span></label>
                                <input type="number" name="min_price" step="1" min="0" className="input input-bordered w-full" value={formData.min_price} onChange={handleChange} required />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">Max Price (₱)</span></label>
                                <input type="number" name="max_price" step="1" min="0" className="input input-bordered w-full" value={formData.max_price} onChange={handleChange} required />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">Duration (Hours)</span></label>
                                <input type="number" name="duration_hours" min="1" className="input input-bordered w-full" value={formData.duration_hours} onChange={handleChange} required />
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
                                <input type="number" name="max_guests" min="1" className="input input-bordered w-full" value={formData.max_guests} onChange={handleChange} required />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">Additional Guest Price (₱)</span></label>
                                <input type="number" name="additional_guest_price" step="1" min="0" className="input input-bordered w-full" value={formData.additional_guest_price} onChange={handleChange} required />
                            </div>
                            <div className="form-control md:col-span-2 lg:col-span-3">
                                <label className="label"><span className="label-text">Features (comma separated)</span></label>
                                <input type="text" name="features" className="input input-bordered w-full" value={formData.features} onChange={handleChange} placeholder="e.g., Check In: 9:00 AM, Check Out: 6:00 PM, Good for 20 Pax" />
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
                            <button type="submit" disabled={saving} className="btn btn-black rounded-full">
                                {saving ? <><span className="loading loading-spinner loading-sm"></span> Saving...</> : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </MainLayout>
    );
};

export default EditPackage;
