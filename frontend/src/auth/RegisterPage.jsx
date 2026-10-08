import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertCircle, Loader2 } from 'lucide-react';

import { useAuth } from '../context/AuthContext.jsx';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

// Zod Schema strictly matched with Laravel's register validation rules
const registerSchema = z
  .object({
    name: z.string().min(1, 'Full name is required').max(255),
    email: z
      .string()
      .min(1, 'Email address is required')
      .email('Please enter a valid email address')
      .max(255),
    unit: z.string().min(1, 'Unit is required').max(255),
    division: z.string().min(1, 'Division is required').max(255),
    designation: z.string().min(1, 'Designation is required').max(255),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long'),
    password_confirmation: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  });

export default function RegisterPage() {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();
  const [generalError, setGeneralError] = useState(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      unit: '',
      division: '',
      designation: '',
      password: '',
      password_confirmation: '',
    },
  });

  const onSubmit = async (data) => {
    setGeneralError(null);
    try {
      await registerAuth(data);
      navigate('/');
    } catch (err) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        // Map Laravel 422 validation errors to specific fields (e.g. unique email)
        const backendErrors = err.response.data.errors;
        Object.keys(backendErrors).forEach((field) => {
          setError(field, {
            type: 'server',
            message: backendErrors[field][0],
          });
        });
      } else {
        // Fallback for non-validation server/network errors
        setGeneralError(
          err.response?.data?.error ||
            err.response?.data?.message ||
            'Registration failed. Please try again.'
        );
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 py-8">
      <Card className="w-full max-w-lg shadow-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Create Account</CardTitle>
          <CardDescription>
            Enter your details below to register a new user account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Top-level Alert for System/Network Failure */}
          {generalError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Registration Failed</AlertTitle>
              <AlertDescription>{generalError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                {...register('name')}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs font-medium text-destructive mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                {...register('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-xs font-medium text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Unit & Division Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  type="text"
                  placeholder="e.g. IT Operations"
                  {...register('unit')}
                  aria-invalid={!!errors.unit}
                />
                {errors.unit && (
                  <p className="text-xs font-medium text-destructive mt-1">
                    {errors.unit.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="division">Division</Label>
                <Input
                  id="division"
                  type="text"
                  placeholder="e.g. Technology"
                  {...register('division')}
                  aria-invalid={!!errors.division}
                />
                {errors.division && (
                  <p className="text-xs font-medium text-destructive mt-1">
                    {errors.division.message}
                  </p>
                )}
              </div>
            </div>

            {/* Designation */}
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                type="text"
                placeholder="e.g. System Administrator"
                {...register('designation')}
                aria-invalid={!!errors.designation}
              />
              {errors.designation && (
                <p className="text-xs font-medium text-destructive mt-1">
                  {errors.designation.message}
                </p>
              )}
            </div>

            {/* Password Inputs Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  aria-invalid={!!errors.password}
                />
                {errors.password && (
                  <p className="text-xs font-medium text-destructive mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password_confirmation">Confirm Password</Label>
                <Input
                  id="password_confirmation"
                  type="password"
                  {...register('password_confirmation')}
                  aria-invalid={!!errors.password_confirmation}
                />
                {errors.password_confirmation && (
                  <p className="text-xs font-medium text-destructive mt-1">
                    {errors.password_confirmation.message}
                  </p>
                )}
              </div>
            </div>

            {/* Primary Action Button */}
            <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Register'
              )}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Account Access
              </span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}