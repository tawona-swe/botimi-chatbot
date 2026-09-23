'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import toast from 'react-hot-toast';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import CurveScrollThumb from '@/components/auth/CurveScrollThumb';

const registerSchema = yup.object({
  name: yup.string().min(2, 'Name too short').required('Name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'At least 6 characters').required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm your password'),
});

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const panelRef = useRef(null);
  const router = useRouter();
  const { signup, loginWithGoogleCredential } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    try {
      await signup(data.email, data.password, '', data.name, '');
      toast.success('Welcome to botimi!');
      router.push('/onboarding');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    }
  };

  const handleGoogleCredential = async (credential) => {
    try {
      const data = await loginWithGoogleCredential(credential);
      router.push(data.isNewUser ? '/onboarding' : '/dashboard');
      toast.success('Signed in with Google!');
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed');
    }
  };

  return (
    <div className="min-h-screen lg:h-screen grid grid-cols-1 lg:grid-cols-20 bg-background">
      {/* LEFT — REGISTER FORM */}
      <div
        ref={panelRef}
        className="lg:col-span-9 relative grid place-items-center px-8 lg:px-16 xl:px-24 py-12 lg:py-10 bg-background overflow-x-hidden lg:overflow-y-auto curve-scroll-container"
      >
        {/* Left-side decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary opacity-[0.08] blur-[100px]" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-secondary opacity-[0.08] blur-[100px]" />
        </div>

        <CurveScrollThumb containerRef={panelRef} radius={100} />

        <div className="relative z-10 w-full max-w-md space-y-6 bg-surface-container/70 backdrop-blur-sm border border-outline-variant/50 rounded-3xl p-8 shadow-[0_8px_32px_rgba(74,26,138,0.12)]">
          {/* Brand + Heading */}
          <div className="animate-fade-in-up delay-0">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <span className="relative inline-block text-base font-bold text-primary" style={{ fontFamily: '"Outfit", sans-serif' }}>
                botimi
                <span className="absolute rounded-full bg-tertiary" style={{ width: "4px", height: "4px", top: "-1px", right: "-6px" }} />
              </span>
            </Link>
            <h1 className="text-2xl font-bold text-on-surface">Create your account</h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          <form className="space-y-4 animate-fade-in-up delay-1" onSubmit={handleSubmit(onSubmit)}>
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Full name</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                <input
                  type="text"
                  {...register('name')}
                  placeholder="John Doe"
                  className="w-full border border-outline-variant rounded-xl py-2.5 pr-4 pl-11 text-sm text-on-surface bg-surface-container-lowest placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-xs text-error flex items-center gap-1">
                  <span>•</span> {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                <input
                  type="email"
                  {...register('email')}
                  placeholder="you@example.com"
                  className="w-full border border-outline-variant rounded-xl py-2.5 pr-4 pl-11 text-sm text-on-surface bg-surface-container-lowest placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-error flex items-center gap-1">
                  <span>•</span> {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="Create a strong password"
                  className="w-full border border-outline-variant rounded-xl py-2.5 pr-12 pl-11 text-sm text-on-surface bg-surface-container-lowest placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-error flex items-center gap-1">
                  <span>•</span> {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Confirm password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  placeholder="Repeat your password"
                  className="w-full border border-outline-variant rounded-xl py-2.5 pr-12 pl-11 text-sm text-on-surface bg-surface-container-lowest placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-error flex items-center gap-1">
                  <span>•</span> {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-on-primary py-2.5 rounded-xl text-sm font-bold shadow-[0_8px_24px_rgba(74,26,138,0.25)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>

            <p className="text-center text-xs text-on-surface-variant/70">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="underline hover:text-primary transition-colors">Terms &amp; Conditions</Link>
              {' '}and{' '}
              <Link href="/privacy" className="underline hover:text-primary transition-colors">Privacy Policy</Link>.
            </p>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-outline-variant" />
              <span className="text-xs text-on-surface-variant/70 font-medium">or continue with</span>
              <div className="flex-1 h-px bg-outline-variant" />
            </div>

            <GoogleAuthButton
              text="signup_with"
              onCredential={handleGoogleCredential}
            />
          </form>
        </div>
      </div>

      {/* RIGHT — BRAND PANEL */}
      <div className="lg:col-span-11 hidden lg:flex relative overflow-hidden items-center justify-center bg-[#210724] text-white rounded-bl-[100px] shadow-[-4px_0_24px_rgba(74,26,138,0.3)]">
        {/* Vector decorations — purple brand blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-primary opacity-25 blur-[100px] animate-float" />
          <div className="absolute -top-10 left-32 w-80 h-80 rounded-full bg-secondary opacity-20 blur-[80px] animate-float-reverse" />
          <div className="absolute bottom-0 -right-10 w-[30rem] h-[30rem] rounded-full bg-primary opacity-20 blur-[120px] animate-float-slow" />
          <div className="absolute top-[15%] left-[12%] w-3 h-3 rounded-full bg-white/10 animate-float-slow" />
          <div className="absolute bottom-[20%] right-[15%] w-2.5 h-2.5 rounded-full bg-tertiary/25 animate-float-reverse" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-md text-left px-10 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-8">
            <span className="relative inline-block text-2xl font-bold text-white" style={{ fontFamily: '"Outfit", sans-serif' }}>
              botimi
              <span className="absolute rounded-full bg-tertiary" style={{ width: "6px", height: "6px", top: "-2px", right: "-9px" }} />
            </span>
          </div>
          <h2 className="text-3xl font-bold leading-tight delay-1 animate-fade-in-up">
            Your AI chat platform
          </h2>
          <p className="mt-4 text-gray-300 leading-relaxed delay-2 animate-fade-in-up">
            Create intelligent chatbots trained on your content. Automate support,
            capture leads, and engage visitors 24/7.
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 delay-1 animate-fade-in-up">
              <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold text-white">
                1
              </div>
              <span className="text-sm text-gray-300">Train on your data</span>
            </div>
            <div className="flex items-center gap-3 delay-2 animate-fade-in-up">
              <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold text-white">
                2
              </div>
              <span className="text-sm text-gray-300">Embed on your site</span>
            </div>
            <div className="flex items-center gap-3 delay-3 animate-fade-in-up">
              <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold text-white">
                3
              </div>
              <span className="text-sm text-gray-300">Let AI handle conversations</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
