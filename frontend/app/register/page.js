'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import toast from 'react-hot-toast';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';

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
  const router = useRouter();
  const { loginWithGoogleCredential } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Registration failed');
      toast.success('Account created! Please log in.');
      router.push('/login');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    }
  };

  const handleGoogleCredential = async (credential) => {
    try {
      await loginWithGoogleCredential(credential);
      router.push('/dashboard');
      toast.success('Signed in with Google!');
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed');
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-20 bg-white">
      {/* LEFT — REGISTER FORM */}
      <div className="lg:col-span-9 relative flex items-center justify-center px-8 lg:px-16 xl:px-24 py-6 bg-white overflow-hidden">
        {/* Subtle left-side decoration */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-[100px]" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-secondary/5 blur-[100px]" />
        </div>

        <div className="relative z-10 w-full max-w-md space-y-4">
          {/* Brand + Heading */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <span className="text-base font-bold text-primary">botimi</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
            <p className="mt-2 text-sm text-gray-500">
              Get started with botimi in just a few minutes
            </p>
          </div>

          <form className="space-y-2.5" onSubmit={handleSubmit(onSubmit)}>
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full name</label>
              <input
                type="text"
                {...register('name')}
                placeholder="John Doe"
                className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 bg-gray-50/50 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>•</span> {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                {...register('email')}
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 bg-gray-50/50 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>•</span> {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="Create a strong password"
                  className="w-full border border-gray-200 rounded-xl py-2.5 pr-12 pl-4 text-sm text-gray-900 bg-gray-50/50 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>•</span> {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  placeholder="Repeat your password"
                  className="w-full border border-gray-200 rounded-xl py-2.5 pr-12 pl-4 text-sm text-gray-900 bg-gray-50/50 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>•</span> {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-on-primary py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">or continue with</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <GoogleAuthButton
              text="signup_with"
              onCredential={handleGoogleCredential}
            />

            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                Sign in
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
          {/* Floating bubbles & dice */}
          <div className="absolute top-[12%] left-[15%] w-4 h-4 rounded-full bg-white/10 animate-float-slow" />
          <div className="absolute top-[30%] right-[20%] w-3 h-3 rounded-full bg-primary/20 animate-float-reverse" />
          <div className="absolute bottom-[25%] left-[10%] w-5 h-5 rounded-full bg-secondary/15 animate-float" />
          <div className="absolute top-[50%] left-[40%] w-2 h-2 rounded-full bg-white/8 animate-float-slow" />
          <div className="absolute top-[8%] right-[35%] w-6 h-6 rounded-lg bg-white/5 animate-float-reverse" />
          <div className="absolute bottom-[35%] right-[25%] w-4 h-4 rounded-lg bg-primary/15 animate-float-slow" />
          <div className="absolute top-[65%] right-[10%] w-3 h-3 rounded-lg bg-secondary/10 animate-float" />
          <div className="absolute bottom-[15%] left-[30%] w-5 h-5 rounded-full bg-white/6 animate-float-reverse" />
          <div className="absolute top-[20%] left-[60%] w-2 h-2 rounded-lg bg-primary/10 animate-float-slow" />
          <div className="absolute top-[75%] left-[20%] w-3 h-3 rounded-full bg-secondary/8 animate-float" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-md text-left px-10 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-2xl font-bold text-white">botimi</span>
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
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-primary">
                1
              </div>
              <span className="text-sm text-gray-300">Train on your data</span>
            </div>
            <div className="flex items-center gap-3 delay-2 animate-fade-in-up">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-primary">
                2
              </div>
              <span className="text-sm text-gray-300">Embed on your site</span>
            </div>
            <div className="flex items-center gap-3 delay-3 animate-fade-in-up">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-primary">
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
