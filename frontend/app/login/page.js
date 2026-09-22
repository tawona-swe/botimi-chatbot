'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import toast from 'react-hot-toast';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';

const loginSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login, loginWithGoogleCredential } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    try {
      await login(data.email, data.password);
      router.push('/dashboard');
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err.message || 'Login failed');
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
    <div className="h-screen overflow-hidden grid grid-cols-1 lg:grid-cols-20 bg-background">
      {/* LEFT — LOGIN FORM */}
      <div className="lg:col-span-9 relative flex items-center justify-center px-8 lg:px-16 xl:px-24 py-8 bg-background overflow-hidden">
        {/* Left-side decoration */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary opacity-[0.08] blur-[100px]" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-secondary opacity-[0.08] blur-[100px]" />
        </div>

        <div className="relative z-10 w-full max-w-md space-y-6">
          {/* Brand + Heading */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <span className="relative inline-block text-lg font-bold text-primary" style={{ fontFamily: '"Outfit", sans-serif' }}>
                botimi
                <span className="absolute rounded-full bg-tertiary" style={{ width: "5px", height: "5px", top: "-2px", right: "-7px" }} />
              </span>
            </Link>
            <h1 className="text-3xl font-bold text-on-surface">Welcome back</h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Enter your credentials to access your account
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-on-surface-variant mb-1.5">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                <input
                  type="email"
                  {...register('email')}
                  placeholder="you@example.com"
                  className="w-full border border-outline-variant rounded-xl py-3 pr-4 pl-11 text-sm text-on-surface bg-surface-container-lowest placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-error flex items-center gap-1">
                  <span>•</span> {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-on-surface-variant mb-1.5">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="Enter your password"
                  className="w-full border border-outline-variant rounded-xl py-3 pr-12 pl-11 text-sm text-on-surface bg-surface-container-lowest placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                <p className="mt-1.5 text-xs text-error flex items-center gap-1">
                  <span>•</span> {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-on-primary py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-outline-variant" />
              <span className="text-xs text-on-surface-variant/70 font-medium">or continue with</span>
              <div className="flex-1 h-px bg-outline-variant" />
            </div>

            <GoogleAuthButton
              text="signin_with"
              onCredential={handleGoogleCredential}
            />

            <p className="text-center text-sm text-on-surface-variant">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                Sign up
              </Link>
            </p>
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

          <h2 className="text-4xl font-semibold leading-tight text-white delay-1 animate-fade-in-up">
            AI Chatbots
            <br />
            <span className="font-light">for Your Business</span>
          </h2>

          <p className="mt-4 text-gray-300 text-sm delay-2 animate-fade-in-up">
            Deploy smart, context-aware AI chatbots trained on your data.
          </p>
        </div>
      </div>
    </div>
  );
}
