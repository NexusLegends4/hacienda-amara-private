import Input from "../components/Form/Input";
import MainLayout from "../layouts/MainLayout";
import SendIcon from "../components/icons/SendIcon";
import { supabase } from "../utils/supabase";
import { useEffect, useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SessionContext } from "../contexts/SessionContext.jsx";
// 1. IMPORT DOMPurify
import DOMPurify from "dompurify";

const PROFILE_BACKGROUND_IMAGE = "https://scontent.fmnl9-3.fna.fbcdn.net/v/t39.30808-6/498621173_122130914540749963_238405466557103005_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=2a1932&_nc_eui2=AeFbSN8TdpWfyxBZrWSC_FxAelQG7z5WU_J6VAbvPlZT8jlKAoCsk3Ai6CCiD2DZT9WadKTyFNCeB9LrzyNCNd5Y&_nc_ohc=3fUFjvEWuogQ7kNvwGcc91D&_nc_oc=AdqW5AtIaFMzg06ui5Ap82t7gnoS1cVIpqdK9kLYl26gtnBuR1eF_lBVnI676gapmrw&_nc_zt=23&_nc_ht=scontent.fmnl9-3.fna&_nc_gid=V7ltjqr7MS5-BehPpo8N3w&_nc_ss=7a3a8&oh=00_Af0M5UyjzO6ZNJ52ZYpiN649-3b-MYBsd5wWJjFB-CaBrA&oe=69DE7687";

const SignUp = () => {
    const { session } = useContext(SessionContext);
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (session) navigate("/");
    }, [session, navigate]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(event.target);

        // 2. SANITIZE INPUTS HERE
        // We clean the strings to prevent malicious HTML/Scripts from entering your database
        const signupForm = {
            firstname: DOMPurify.sanitize(formData.get("firstname")),
            lastname: DOMPurify.sanitize(formData.get("lastname")),
            email: DOMPurify.sanitize(formData.get("email")).trim(),
            password: formData.get("password"), // Do NOT sanitize passwords as it may alter special characters
        };

		// Stronger security: Prevent weak passwords at the source
		if (signupForm.password.length < 8) {
			alert("Password must be at least 8 characters.");
			setIsSubmitting(false);
			return;
		}

        // 3. USE THE SANITIZED DATA
        const { data: signUpData, error: signUpError } =
            await supabase.auth.signUp({
                email: signupForm.email,
                password: signupForm.password,
            });

        if (signUpError) {
            alert(signUpError.message);
            setIsSubmitting(false);
            return;
        }

        if (signUpData?.user) {
            window.dispatchEvent(new Event("hacienda-confetti"));

            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .insert([{
                    id: signUpData.user.id,
                    firstname: signupForm.firstname,
                    lastname: signupForm.lastname,
                    email: signupForm.email,
                }])
                .select()
                .single();

            if (profileError) {
                alert(profileError.message);
                setIsSubmitting(false);
                return;
            }

            if (profileData) {
                alert("Registration successful! Please check your email for verification.");
                navigate("/log-in");
            }
        }
        setIsSubmitting(false);
    };

    return (
        <MainLayout>
            {/* ... rest of your existing JSX UI ... */}
            <div className="relative left-1/2 right-1/2 -mx-[50vw] min-h-screen w-screen overflow-hidden px-4 py-12">
                <div
                    className="absolute inset-0 scale-110 bg-cover bg-center bg-no-repeat blur-2xl"
                    style={{
                        backgroundImage: `url("${PROFILE_BACKGROUND_IMAGE}")`,
                        backgroundPosition: "left center",
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#6b4b2a]/35 via-[#9a6a3c]/20 to-[#f8e8d2]/60" />

                <div className="relative mx-auto flex min-h-[75vh] w-full max-w-2xl items-center justify-center">
                    <div className="w-full rounded-[2rem] border border-white/30 bg-white/40 p-9 text-slate-900 shadow-2xl backdrop-blur-xl md:p-12">
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
                            Sign Up
                        </h1>
						<div className="mt-3 space-y-1 text-sm text-slate-700 md:text-base">
							<p>Create your account. Please enter your details.</p>
						</div>

                        <form onSubmit={handleSubmit} className="mt-8">
                            <Input name="firstname" label="Firstname" type="text" />
                            <Input name="lastname" label="Lastname" type="text" />
                            <Input name="email" label="Email" type="email" />
                            <Input name="password" label="Password" type="password" />

                            <button 
                                disabled={isSubmitting}
                                className="btn btn-black mt-6 h-12 min-h-12 w-full rounded-full px-6 text-sm md:text-base"
                            >
                                {isSubmitting ? <span className="loading loading-spinner"></span> : <SendIcon className="text-base" />}
                                {isSubmitting ? " Creating account..." : " Sign Up"}
                            </button>

							<div className="mt-6 border-t border-black/10 pt-4 text-center text-sm text-slate-700 md:text-base">
								<span>Already have an account? </span>
								<Link
									to="/log-in"
									className="font-semibold text-primary underline-offset-4 hover:underline"
								>
									Log In
								</Link>
							</div>
                        </form>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default SignUp;