import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    division: '',
    designation: '',
    email: '',
    password: '',
    password_confirmation: '',
  });

  // Error States
  const [generalError, setGeneralError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Universal change handler to update state and clear field-specific errors as user types
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));

    if (fieldErrors[id]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setGeneralError(null);
    setFieldErrors({});

    // Client-side confirmation check
    if (formData.password !== formData.password_confirmation) {
      setFieldErrors({
        password_confirmation: ['Passwords do not match.'],
      });
      setSubmitting(false);
      return;
    }

    try {
      await register(formData);
      navigate('/');
    } catch (err) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        // Capture Laravel 422 validation errors object
        setFieldErrors(err.response.data.errors);
      } else {
        // Fallback for non-validation errors (500, network error, 401, etc.)
        setGeneralError(
          err.response?.data?.error ||
            err.response?.data?.message ||
            'Registration failed. Please try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Helper component to render field errors cleanly
  const renderFieldError = (fieldName) => {
    if (!fieldErrors[fieldName]) return null;
    return (
      <p className="text-xs font-medium text-destructive mt-1">
        {fieldErrors[fieldName][0]}
      </p>
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 py-8">
      <Card className="w-full max-w-lg shadow-md">
        {/* Structural Layout Header */}
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Create Account</CardTitle>
          <CardDescription>
            Enter your details below to register a new user account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Top-level Feedback Alert for Processing/Auth Errors */}
          {generalError && (
            <Alert variant="destructive">
              <AlertTitle>Registration Failed</AlertTitle>
              <AlertDescription>{generalError}</AlertDescription>
            </Alert>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                required
                value={formData.name}
                onChange={handleChange}
                aria-invalid={!!fieldErrors.name}
              />
              {renderFieldError('name')}
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                required
                value={formData.email}
                onChange={handleChange}
                aria-invalid={!!fieldErrors.email}
              />
              {renderFieldError('email')}
            </div>

            {/* Unit & Division Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  type="text"
                  placeholder="e.g. IT Operations"
                  required
                  value={formData.unit}
                  onChange={handleChange}
                  aria-invalid={!!fieldErrors.unit}
                />
                {renderFieldError('unit')}
              </div>

              <div className="space-y-2">
                <Label htmlFor="division">Division</Label>
                <Input
                  id="division"
                  type="text"
                  placeholder="e.g. Technology"
                  required
                  value={formData.division}
                  onChange={handleChange}
                  aria-invalid={!!fieldErrors.division}
                />
                {renderFieldError('division')}
              </div>
            </div>

            {/* Designation */}
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                type="text"
                placeholder="e.g. System Administrator"
                required
                value={formData.designation}
                onChange={handleChange}
                aria-invalid={!!fieldErrors.designation}
              />
              {renderFieldError('designation')}
            </div>

            {/* Password Inputs Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  aria-invalid={!!fieldErrors.password}
                />
                {renderFieldError('password')}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password_confirmation">Confirm Password</Label>
                <Input
                  id="password_confirmation"
                  type="password"
                  required
                  value={formData.password_confirmation}
                  onChange={handleChange}
                  aria-invalid={!!fieldErrors.password_confirmation}
                />
                {renderFieldError('password_confirmation')}
              </div>
            </div>

            {/* Primary Action Button */}
            <Button type="submit" className="w-full mt-2" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Register'}
            </Button>
          </form>

          {/* Separator for Section Break */}
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

        {/* Structural Layout Footer */}
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