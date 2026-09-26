import React from "react";

const Card = ({ children, className = "" }) => {
	return (
		// Reusable elevated card wrapper for forms and content panels.
		<div className={`card bg-base-100 w-full shadow-xl border border-gray-200 ${className}`}>
			<div className="card-body">{children}</div>
		</div>
	);
};

export default Card;
