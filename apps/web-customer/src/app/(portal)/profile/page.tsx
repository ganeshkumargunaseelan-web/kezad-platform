'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, Mail, Phone, MapPin, CreditCard, Globe, User, Shield, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, formatDate } from '@kezad/ui';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';

interface CustomerContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  isPrimary: boolean;
}

interface CustomerData {
  id: string;
  companyName: string;
  companyCode: string;
  industryType: string | null;
  tradeLicenseNo: string | null;
  vatRegistrationNo: string | null;
  isActive: boolean;
  crmStatus: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingCountry: string;
  contacts: CustomerContact[];
  user?: { email: string; isActive: boolean; lastLoginAt: string | null; createdAt: string };
}

function InfoRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      {icon && <div className="text-gray-400 mt-0.5">{icon}</div>}
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 mt-0.5">{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const customerId = user?.customerId;

  const { data, isLoading } = useQuery<{ data: CustomerData }>({
    queryKey: ['customer-profile', customerId],
    queryFn: () => api.get(`/customers/${customerId}`).then((r) => r.data),
    enabled: !!customerId,
  });

  const customer = data?.data;
  const primaryContact = customer?.contacts.find((c) => c.isPrimary) ?? customer?.contacts[0];

  if (!customerId) {
    return (
      <div className="text-center py-16">
        <User className="h-12 w-12 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Profile not available</p>
        <p className="text-sm text-gray-400">Unable to load company profile. Please contact support.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-16">
        <Building2 className="h-12 w-12 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-white border-b px-8 py-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{customer.companyName}</h1>
              <Badge variant={customer.isActive ? 'success' : 'secondary'}>{customer.isActive ? 'Active' : 'Inactive'}</Badge>
              {customer.crmStatus && <Badge variant="secondary">{customer.crmStatus}</Badge>}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {customer.companyCode}
              {customer.industryType && <span> · {customer.industryType.replace(/_/g, ' ')}</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Company Details */}
        <Card>
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" /> Company Details
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-2">
            <InfoRow label="Company Name" value={customer.companyName} icon={<Building2 className="h-4 w-4" />} />
            <InfoRow label="Company Code" value={<span className="font-mono">{customer.companyCode}</span>} />
            <InfoRow label="Industry" value={customer.industryType?.replace(/_/g, ' ')} icon={<Globe className="h-4 w-4" />} />
            <InfoRow
              label="Trade License"
              value={customer.tradeLicenseNo ?? 'Not provided'}
              icon={<CreditCard className="h-4 w-4" />}
            />
            <InfoRow
              label="VAT Registration"
              value={customer.vatRegistrationNo ?? 'Not provided'}
              icon={<CreditCard className="h-4 w-4" />}
            />
          </CardContent>
        </Card>

        {/* Primary Contact */}
        <Card>
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" /> Primary Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-2">
            {primaryContact ? (
              <>
                <InfoRow
                  label="Name"
                  value={`${primaryContact.firstName} ${primaryContact.lastName}`}
                  icon={<User className="h-4 w-4" />}
                />
                <InfoRow label="Job Title" value={primaryContact.jobTitle} />
                <InfoRow label="Email" value={<a href={`mailto:${primaryContact.email}`} className="text-primary hover:underline">{primaryContact.email}</a>} icon={<Mail className="h-4 w-4" />} />
                <InfoRow label="Phone" value={primaryContact.phone} icon={<Phone className="h-4 w-4" />} />
              </>
            ) : (
              <div className="py-4 text-sm text-gray-400 text-center">No contact on file</div>
            )}
            {/* Billing Address */}
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-gray-500 mb-1">Billing Address</p>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  {[customer.billingAddress, customer.billingCity, customer.billingCountry].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portal Account */}
        <Card>
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-400" /> Portal Account
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-2">
            <InfoRow label="Portal Email" value={user?.email} icon={<Mail className="h-4 w-4" />} />
            <InfoRow label="Account Status" value={<Badge variant="success">Active</Badge>} />
            {customer.user && (
              <>
                <InfoRow
                  label="Last Login"
                  value={customer.user.lastLoginAt ? formatDate(customer.user.lastLoginAt) : 'N/A'}
                  icon={<Clock className="h-4 w-4" />}
                />
                <InfoRow label="Account Created" value={formatDate(customer.user.createdAt)} />
              </>
            )}
          </CardContent>
        </Card>

        {/* All Contacts */}
        {customer.contacts.length > 1 && (
          <Card className="col-span-1 md:col-span-2 xl:col-span-3">
            <CardHeader className="px-6 py-4 border-b">
              <CardTitle className="text-sm font-semibold text-gray-700">All Contacts ({customer.contacts.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {customer.contacts.map((c) => (
                  <div key={c.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-600">{c.firstName.charAt(0)}{c.lastName.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-gray-500">{c.jobTitle ?? 'Contact'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-700">{c.email}</p>
                      {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                    </div>
                    {c.isPrimary && <Badge variant="success">Primary</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
