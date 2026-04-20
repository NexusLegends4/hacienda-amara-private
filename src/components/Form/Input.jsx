import React, { useState } from "react";
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";

const Input = ({ label, type, placeholder, name, defaultValue }) => {
	const [showPassword, setShowPassword] = useState(false);
	const isPasswordInput = type === "password";
	const inputType = isPasswordInput && showPassword ? "text" : type;

	return (
		<fieldset className="fieldset">
			<legend className="fieldset-legend">{label}</legend>
			<div className="relative">
				{/* Password fields can be toggled without affecting other inputs. */}
				<input
					name={name}
					type={inputType}
					className={
						isPasswordInput
							? "input input-bordered w-full pr-14"
							: "input input-bordered w-full"
					}
					placeholder={placeholder}
					defaultValue={defaultValue}
				/>
				{isPasswordInput && (
					<button
						type="button"
						onClick={() => setShowPassword((prev) => !prev)}
						className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-base-200 text-base-content shadow-sm transition hover:bg-base-300 hover:text-black"
						aria-label={showPassword ? "Hide password" : "Show password"}
					>
						{showPassword ? (
							<IoEyeOffOutline className="text-2xl" />
						) : (
							<IoEyeOutline className="text-2xl" />
						)}
					</button>
				)}
			</div>
		</fieldset>
	);
};

export default Input;
