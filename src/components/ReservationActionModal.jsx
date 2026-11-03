import React, { useCallback, useState } from "react";
import { FiAlertCircle, FiBell, FiCalendar, FiCheckCircle, FiChevronLeft, FiCreditCard, FiX, FiXCircle } from "react-icons/fi";

const ReservationActionModal = ({
	isOpen,
	onClose,
	reservation,
	action,
	onConfirm,
	loading,
}) => {
	const [denialReason, setDenialReason] = useState("");

	const handleConfirm = useCallback(() => {
		if (action === "denied" && !denialReason.trim()) {
			return;
		}
		onConfirm(denialReason.trim());
	}, [action, denialReason, onConfirm]);

	const [actionLabel, actionVerb, actionColor, icon, warning] = (() => {
		switch (action) {
			case "confirmed":
				return [
					"Accept Reservation",
					"accept",
					"btn-success text-white",
					<FiCheckCircle className="w-6 h-6 text-white" />,
					null,
				];
			case "denied":
				return [
					"Deny Reservation",
					"deny",
					"btn-error text-white",
					<FiXCircle className="w-6 h-6 text-white" />,
					null,
				];
			case "cancelled":
				return [
					"Cancel Reservation",
					"cancel",
					"btn-warning text-white",
					<FiAlertCircle className="w-6 h-6 text-white" />,
					"Cancelling will trigger a security-deposit refund if a PayMongo payment was recorded.",
				];
			default:
				return ["Action", "act", "btn-primary text-white", <FiBell className="w-6 h-6 text-white" />, null];
		}
	})();

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
			role="dialog"
			aria-modal="true"
			aria-label={actionLabel}
		>
			<div
				className="absolute inset-0"
				aria-hidden="true"
				onClick={onClose}
			/>

			<div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
				<div className={`p-5 flex items-center gap-3 border-b border-black/5 ${
					action === "confirmed"
						? "bg-emerald-50 border-emerald-200"
						: action === "denied"
							? "bg-rose-50 border-rose-200"
							: "bg-amber-50 border-amber-200"
				}`}>
					<div className={`rounded-lg p-2 ${
						action === "confirmed"
							? "bg-emerald-100 text-emerald-700"
							: action === "denied"
								? "bg-rose-100 text-rose-700"
								: "bg-amber-100 text-amber-700"
					}`}>
						{icon}
					</div>
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
							Reservation Action
						</p>
						<h2 className="text-lg font-black text-slate-900 leading-tight">{actionLabel}</h2>
					</div>
				</div>

				<div className="p-6 flex-1 overflow-y-auto">
					{warning && (
						<div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
							<div className="flex items-start gap-3">
								<FiAlertCircle className="mt-0.5 shrink-0 text-amber-700" />
								<p className="text-sm text-amber-900/80 leading-relaxed">{warning}</p>
							</div>
						</div>
					)}

					<div className="rounded-xl border border-black/5 bg-slate-50/50 p-4">
						<p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-3">
							Reservation Details
						</p>
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<FiCalendar className="w-4 h-4 text-slate-400 shrink-0" />
								<div className="flex-1 min-w-0">
									<p className="text-sm font-semibold text-slate-900 truncate">
										{reservation?.profiles?.firstname || ""} {reservation?.profiles?.lastname || ""} {reservation?.guest_name || ""}
									</p>
									<p className="text-xs text-slate-500">{reservation?.room_type || "—"}</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<span className="w-4 h-4 text-slate-400 shrink-0">📅</span>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-semibold text-slate-900">{reservation?.check_in || "—"}</p>
									{reservation?.check_out && (
										<p className="text-xs text-slate-500">until {reservation.check_out}</p>
									)}
								</div>
							</div>
							<div className="flex items-center gap-3">
								<FiCreditCard className="w-4 h-4 text-slate-400 shrink-0" />
								<div className="flex-1 min-w-0">
									<p className="text-sm font-semibold text-slate-900">
										₱{Number(reservation?.total_price || 0).toLocaleString()}
									</p>
									<p className="text-xs text-slate-500">Total booking amount</p>
								</div>
							</div>
						</div>
					</div>

					{action === "denied" && (
						<div className="mt-6 space-y-2">
							<p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
								Denial Reason (optional)
							</p>
							<textarea
								value={denialReason}
								onChange={(event) => setDenialReason(event.target.value)}
								placeholder="Why are you denying this reservation?..."
								className="w-full rounded-xl border border-black/10 bg-white p-3 text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-y"
								rows={3}
							/>
						</div>
					)}
				</div>

				<div className="p-5 border-t border-black/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/30">
					<button
						type="button"
						onClick={onClose}
						className="btn btn-ghost btn-sm rounded-full text-slate-600 hover:bg-slate-200 flex-shrink-0"
					>
						<FiX className="w-4 h-4 mr-1 sm:mr-0 hidden sm:inline" />
						Cancel
					</button>
					<button
						type="button"
						onClick={handleConfirm}
						disabled={loading || (action === "denied" && !denialReason.trim())}
						className={`btn btn-sm rounded-full ${actionColor} flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${loading ? "pointer-events-none" : ""}`}
					>
						{loading ? (
							<span className="loading loading-spinner loading-sm text-white"></span>
						) : action === "denied" ? (
							<><FiXCircle className="w-4 h-4 mr-1" /> {actionVerb} Reservation</>
						) : (
							<>{action.charAt(0).toUpperCase() + action.slice(1)} Reservation</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
};

export default ReservationActionModal;
