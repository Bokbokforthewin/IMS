import React, { useState, useEffect } from 'react';
import api from "../../api/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, UserPen, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function EditUserInfo({ user, open, onOpenChange, onUserUpdated }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    unit: '',
    division: '',
    designation: '',
    is_head: false,
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Populate form state when user prop changes or modal opens
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        unit: user.unit || '',
        division: user.division || '',
        designation: user.designation || '',
        is_head: Boolean(user.is_head),
        password: '', // Kept empty unless reset is needed
      });
      setError(null);
      setSuccessMsg('');
    }
  }, [user, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked) => {
    setFormData((prev) => ({ ...prev, is_head: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg('');

    const payload = { ...formData };
    if (!payload.password) {
      delete payload.password;
    }

    try {
      // Use your api client with /v1/users matching your fetchUsers call
      const response = await api.put(`/v1/users/${user.id}`, payload);

      setSuccessMsg('User information updated successfully!');

      if (onUserUpdated) {
        onUserUpdated(response.data?.user || response.data);
      }

      setTimeout(() => {
        onOpenChange(false);
      }, 1200);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to update user information.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserPen className="h-5 w-5 text-primary" />
            Edit User Information
          </DialogTitle>
          <DialogDescription>
            Update profile details, unit/division placement, and designations for {user?.name}.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. jdoe@organization.gov"
              required
            />
          </div>

          {/* Division & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="division">Division</Label>
              <Input
                id="division"
                name="division"
                value={formData.division}
                onChange={handleChange}
                placeholder="e.g. Administrative"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                placeholder="e.g. Supply / Asset"
              />
            </div>
          </div>

          {/* Designation */}
          <div className="space-y-1.5">
            <Label htmlFor="designation">Designation / Position</Label>
            <Input
              id="designation"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              placeholder="e.g. Supply Officer II"
            />
          </div>

          {/* Password Reset (Optional) */}
          <div className="space-y-1.5 pt-1">
            <Label htmlFor="password">Reset Password (Optional)</Label>
            <Input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Leave blank to keep existing password"
            />
          </div>

          {/* Is Head Checkbox */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="is_head"
              checked={formData.is_head}
              onCheckedChange={handleCheckboxChange}
            />
            <Label
              htmlFor="is_head"
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Designate as Head of Division / Unit
            </Label>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}