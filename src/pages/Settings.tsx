
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IoLogOutOutline } from 'react-icons/io5';
import { FiAlertTriangle } from 'react-icons/fi';
import { settingsService, type AccountSettings, type OrgWithHospitals, type OrgSubscription } from '../services/settingsService';
import { paymentService, type PaymentPlan } from '../services/paymentServices';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authServices';
import OrgAuditTrailViewer from '../components/OrgAuditTrailViewer';

type Tab = 'account' | 'organization' | 'audit';

function getErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: string }).message === 'string') {
        return (err as { message: string }).message;
    }
    if (err instanceof Error) return err.message;
    return fallback;
}

function Settings() {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();

    const [activeTab, setActiveTab] = useState<Tab>('account');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [account, setAccount] = useState<AccountSettings | null>(null);
    const [org, setOrg] = useState<OrgWithHospitals | null>(null);

    const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '' });
    const [orgForm, setOrgForm] = useState({
        name: '', type: '', address: '', phone: '', email: '', licenseNumber: '',
    });
    const [deletePassword, setDeletePassword] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [orgDeletePassword, setOrgDeletePassword] = useState('');
    const [orgDeleteConfirm, setOrgDeleteConfirm] = useState('');
    const [showOrgDeleteConfirm, setShowOrgDeleteConfirm] = useState(false);
    const [subscription, setSubscription] = useState<OrgSubscription | null>(null);
    const [plans, setPlans] = useState<PaymentPlan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
    const [payPhone, setPayPhone] = useState('');
    const [planChanging, setPlanChanging] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await settingsService.getAccount();
            if (res.success) {
                setAccount(res.data);
                setProfileForm({
                    firstName: res.data.user.firstName ?? '',
                    lastName: res.data.user.lastName ?? '',
                    phone: res.data.user.phone ?? '',
                });
                if (res.data.organization) {
                    setOrgForm({
                        name: res.data.organization.name ?? '',
                        type: res.data.organization.type ?? '',
                        address: res.data.organization.address ?? '',
                        phone: res.data.organization.phone ?? '',
                        email: res.data.organization.email ?? '',
                        licenseNumber: res.data.organization.licenseNumber ?? '',
                    });
                }
            }

            if (res.data?.isOrgOwner) {
                const orgRes = await settingsService.getMyOrganization();
                if (orgRes.success) {
                    setOrg(orgRes.data.organization);
                    setSubscription(orgRes.data.subscription ?? null);
                    if (orgRes.data.subscription?.planName) {
                        setSelectedPlanId(orgRes.data.subscription.planName);
                    }
                }
            }
        } catch (err: unknown) {
            showError(getErrorMessage(err, 'Failed to load settings'));
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        paymentService.getPlans().then(setPlans);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('tab') === 'organization') {
            setActiveTab('organization');
        }
        const plan = params.get('plan');
        const sessionId = params.get('session_id');
        if (params.get('planChange') === 'success' && plan && sessionId) {
            settingsService.confirmSubscriptionChange({ planId: plan, stripeSessionId: sessionId })
                .then((res) => {
                    showSuccess(res.message ?? 'Subscription updated');
                    load();
                })
                .catch((err: unknown) => showError(getErrorMessage(err, 'Failed to confirm plan change')))
                .finally(() => window.history.replaceState({}, '', window.location.pathname));
        }
    }, [load, showError, showSuccess]);

    const handleChangePlan = async () => {
        const orgId = account?.organization?.id;
        if (!selectedPlanId || !orgId) {
            showError('Select a plan');
            return;
        }
        if (selectedPlanId === subscription?.planName) {
            showError('Select a different plan to change your subscription');
            return;
        }
        if (paymentMethod === 'mpesa' && !payPhone.trim()) {
            showError('Enter your M-Pesa phone number');
            return;
        }

        setPlanChanging(true);
        try {
            const plan = plans.find(p => p.id === selectedPlanId);
            const res = await paymentService.processPayment({
                planId: selectedPlanId,
                paymentMethod,
                phoneNumber: paymentMethod === 'mpesa' ? payPhone.trim() : undefined,
                guestEmail: user?.email,
                organizationId: orgId,
                returnTo: 'settings',
                features: plan?.features,
                userData: {
                    email: user?.email ?? '',
                    firstName: user?.firstName ?? profileForm.firstName,
                    lastName: user?.lastName ?? profileForm.lastName,
                    phoneNumber: profileForm.phone,
                    organizationId: orgId,
                },
            });

            if (!res.success || !res.data) {
                throw new Error(res.message || 'Payment failed');
            }

            if (res.data.provider === 'stripe' && res.data.stripeUrl) {
                window.location.href = res.data.stripeUrl;
                return;
            }

            const merchantRequestId = res.data.merchantRequestId;
            if (!merchantRequestId) {
                throw new Error('Payment reference missing');
            }

            const poll = await paymentService.pollPaymentStatus(merchantRequestId);
            if (!poll.success) {
                throw new Error(poll.message || 'Payment was not completed');
            }

            const confirm = await settingsService.confirmSubscriptionChange({
                planId: selectedPlanId,
                merchantRequestId,
            });
            showSuccess(confirm.message ?? 'Subscription updated');
            await load();
        } catch (err: unknown) {
            showError(getErrorMessage(err, 'Failed to change subscription plan'));
        } finally {
            setPlanChanging(false);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const res = await settingsService.updateAccount(profileForm);
            showSuccess(res.message ?? 'Profile saved');
            await load();
        } catch (err: unknown) {
            showError(getErrorMessage(err, 'Failed to save profile'));
        } finally {
            setSaving(false);
        }
    };

    const handleSaveOrg = async () => {
        if (!orgForm.name.trim()) {
            showError('Organization name is required');
            return;
        }
        setSaving(true);
        try {
            const res = await settingsService.updateMyOrganization(orgForm);
            showSuccess(res.message ?? 'Organization updated');
            setOrg(res.data.organization);
            const stored = authService.getOrganization();
            if (stored) {
                authService.setOrganization({ ...stored, name: res.data.organization.name });
            }
        } catch (err: unknown) {
            showError(getErrorMessage(err, 'Failed to update organization'));
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveHospital = async (hospitalId: string, hospitalName: string) => {
        if (!window.confirm(`Remove "${hospitalName}" from your organization? Patients linked to this hospital name will not be deleted.`)) {
            return;
        }
        try {
            const res = await settingsService.removeHospital(hospitalId);
            showSuccess(res.message);
            const orgRes = await settingsService.getMyOrganization();
            if (orgRes.success) setOrg(orgRes.data.organization);
        } catch (err: unknown) {
            showError(getErrorMessage(err, 'Failed to remove hospital'));
        }
    };

    const handleRequestDeletion = async () => {
        if (!deletePassword) {
            showError('Enter your password to confirm');
            return;
        }
        setSaving(true);
        try {
            const res = await settingsService.requestDeletion(deletePassword);
            showSuccess(res.message);
            setShowDeleteConfirm(false);
            setDeletePassword('');
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/auth';
        } catch (err: unknown) {
            showError(getErrorMessage(err, 'Failed to schedule account deletion'));
        } finally {
            setSaving(false);
        }
    };

    const isOrgOwner = account?.isOrgOwner ?? false;
    const orgDeletionPending = account?.organization?.deletion?.state === 'pending'
        || org?.deletion?.state === 'pending';
    const requiresTransfer = account?.accountDeletionPolicy?.requiresTransfer ?? false;
    const canDeleteAccount = !isOrgOwner
        || orgDeletionPending
        || (account?.accountDeletionPolicy?.canDeleteWithoutOrgDeletion ?? false);

    const formatPlanName = (planName: string) =>
        planName.charAt(0).toUpperCase() + planName.slice(1);

    const initials = useMemo(() => {
        const first = profileForm.firstName || user?.firstName;
        const last = profileForm.lastName || user?.lastName;
        if (first && last) {
            return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
        }
        if (user?.name) {
            return user.name.split(' ').map((n: string) => n.charAt(0).toUpperCase()).slice(0, 2).join('');
        }
        return user?.email?.charAt(0).toUpperCase() ?? '';
    }, [profileForm.firstName, profileForm.lastName, user]);

    const handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
        authService.logout().catch((error) => {
            console.warn('Background logout cleanup failed (tokens may expire naturally):', error);
        });
    };

    const handleRequestOrgDeletion = async () => {
        const orgName = orgForm.name.trim();
        if (!orgDeletePassword || orgDeleteConfirm.trim() !== orgName) {
            showError(`Enter your password and type the organization name exactly: ${orgName}`);
            return;
        }
        setSaving(true);
        try {
            const res = await settingsService.requestOrgDeletion(orgDeletePassword, orgDeleteConfirm.trim());
            showSuccess(res.message);
            setShowOrgDeleteConfirm(false);
            setOrgDeletePassword('');
            setOrgDeleteConfirm('');
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/auth';
        } catch (err: unknown) {
            showError(getErrorMessage(err, 'Failed to schedule organization deletion'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Loading settings…
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col pt-4 px-4 sm:pt-6 sm:px-6 bg-white overflow-hidden">
            <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 shrink-0">
                <div className="text-lg sm:text-[1.3em] font-medium">Settings</div>
                <div className="flex items-center gap-3 justify-end">
                    <div className="hidden lg:flex w-10 aspect-square rounded-full bg-[#008540] text-sm text-white items-center justify-center">
                        {initials}
                    </div>
                    <IoLogOutOutline
                        onClick={handleLogout}
                        size={26}
                        className="hidden md:flextext-[#aca287] cursor-pointer"
                    />
                </div>
            </div>

            <div className="flex gap-1 border-b border-gray-100 mb-6 shrink-0">
                <button
                    onClick={() => setActiveTab('account')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${activeTab === 'account' ? 'border-[#008540] text-gray-900' : 'border-transparent text-gray-500'
                        }`}
                >
                    Account
                </button>
                {isOrgOwner && (
                    <button
                        onClick={() => setActiveTab('organization')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${activeTab === 'organization' ? 'border-[#008540] text-gray-900' : 'border-transparent text-gray-500'
                            }`}
                    >
                        Organization
                    </button>
                )}
                {isOrgOwner && (
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${activeTab === 'audit' ? 'border-[#008540] text-gray-900' : 'border-transparent text-gray-500'
                            }`}
                    >
                        Audit Trail
                    </button>
                )}
            </div>

            {activeTab !== "audit" &&
                <div className="flex-1 overflow-y-auto max-w-2xl pb-10">
                    {activeTab === 'account' && (
                        <div className="space-y-8">
                            <section className="space-y-4">
                                <h2 className="text-sm font-semibold text-gray-800">Profile</h2>
                                <p className="text-xs text-gray-400">{user?.email}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className="text-xs text-gray-500">First name</span>
                                        <input
                                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#008540]"
                                            value={profileForm.firstName}
                                            onChange={e => setProfileForm(f => ({ ...f, firstName: e.target.value }))}
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-xs text-gray-500">Last name</span>
                                        <input
                                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#008540]"
                                            value={profileForm.lastName}
                                            onChange={e => setProfileForm(f => ({ ...f, lastName: e.target.value }))}
                                        />
                                    </label>
                                    <label className="block sm:col-span-2">
                                        <span className="text-xs text-gray-500">Phone</span>
                                        <input
                                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#008540]"
                                            value={profileForm.phone}
                                            onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                                        />
                                    </label>
                                </div>
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={saving}
                                    className="px-4 py-2 bg-[#008540] text-white rounded-lg text-sm font-medium hover:bg-[#007235] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Saving…' : 'Save profile'}
                                </button>
                            </section>

                            <section className="border border-red-100 rounded-xl p-5 bg-red-50/40 space-y-3">
                                <div className="flex items-center gap-2 text-red-700 font-medium text-sm">
                                    <FiAlertTriangle /> Danger zone
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Delete your account. You will be signed out immediately. After 30 days your
                                    personal details are anonymized — clinical records keep your saved name snapshot.
                                    {isOrgOwner && !orgDeletionPending && requiresTransfer && (
                                        <> As the only organization owner, transfer ownership to another admin first, or schedule organization deletion.</>
                                    )}
                                    {isOrgOwner && !orgDeletionPending && !requiresTransfer && (
                                        <> Another organization owner exists — you can delete your personal account without deleting the organization.</>
                                    )}
                                </p>
                                {isOrgOwner && !orgDeletionPending && requiresTransfer && (
                                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                        Transfer ownership to another organization owner before deleting your account,
                                        or schedule organization deletion on the Organization tab.
                                    </p>
                                )}
                                {!showDeleteConfirm ? (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        disabled={isOrgOwner && !orgDeletionPending && !canDeleteAccount}
                                        className="border border-red-300 text-red-600 rounded-lg px-4 py-2 text-sm hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Delete my account
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        <label className="block">
                                            <span className="text-xs text-gray-600">Confirm with your password</span>
                                            <input
                                                type="password"
                                                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                                value={deletePassword}
                                                onChange={e => setDeletePassword(e.target.value)}
                                                placeholder="Your password"
                                            />
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleRequestDeletion}
                                                disabled={saving}
                                                className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                                            >
                                                {saving ? 'Scheduling…' : 'Confirm deletion'}
                                            </button>
                                            <button
                                                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}
                                                className="border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>
                    )}

                    {activeTab === 'organization' && isOrgOwner && (
                        <div className="space-y-8">
                            <section className="space-y-4">
                                <h2 className="text-sm font-semibold text-gray-800">Subscription</h2>
                                <p className="text-xs text-gray-400">
                                    Your plan is linked to this organization (not your personal account).
                                </p>
                                {subscription ? (
                                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-1">
                                        <p className="text-sm font-medium text-gray-800">
                                            Current plan: {formatPlanName(subscription.planName)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {subscription.currency} {subscription.amount}/month · Status: {subscription.status}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400">No subscription record found for this organization.</p>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {plans.map(plan => (
                                        <button
                                            key={plan.id}
                                            type="button"
                                            onClick={() => setSelectedPlanId(plan.id)}
                                            className={`text-left border rounded-xl p-4 transition ${selectedPlanId === plan.id
                                                ? 'border-[#008540] bg-[#008540]/5'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <p className="text-sm font-medium text-gray-800">{plan.name}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {plan.currency} {plan.price}/{plan.interval}
                                            </p>
                                            {subscription?.planName === plan.id && (
                                                <p className="text-xs text-[#008540] mt-2">Current</p>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex flex-wrap gap-3 items-end">
                                    <label className="block">
                                        <span className="text-xs text-gray-500 pr-5">Payment method</span>
                                        <select
                                            className="mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                                            value={paymentMethod}
                                            onChange={e => setPaymentMethod(e.target.value as 'mpesa' | 'card')}
                                        >
                                            <option value="mpesa">M-Pesa</option>
                                            <option value="card">Card</option>
                                        </select>
                                    </label>
                                    {paymentMethod === 'mpesa' && (
                                        <label className="block flex-1 min-w-[200px]">
                                            <span className="text-xs text-gray-500">M-Pesa phone</span>
                                            <input
                                                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                                value={payPhone}
                                                onChange={e => setPayPhone(e.target.value)}
                                                placeholder="2547XXXXXXXX"
                                            />
                                        </label>
                                    )}
                                </div>

                                <button
                                    onClick={handleChangePlan}
                                    disabled={planChanging || !selectedPlanId || selectedPlanId === subscription?.planName}
                                    className="px-4 py-2 bg-[#008540] text-white rounded-lg text-sm font-medium hover:bg-[#007235] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {planChanging ? 'Processing…' : 'Change plan'}
                                </button>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-sm font-semibold text-gray-800">Organization details</h2>
                                <p className="text-xs text-gray-400">
                                    Display name can be changed. Internal ID (slug): <code className="bg-gray-100 px-1 rounded">{org?.slug ?? account?.organization?.slug}</code> — cannot be renamed.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className="block sm:col-span-2">
                                        <span className="text-xs text-gray-500">Organization name</span>
                                        <input
                                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#008540]"
                                            value={orgForm.name}
                                            onChange={e => setOrgForm(f => ({ ...f, name: e.target.value }))}
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-xs text-gray-500">Phone</span>
                                        <input
                                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                            value={orgForm.phone}
                                            onChange={e => setOrgForm(f => ({ ...f, phone: e.target.value }))}
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-xs text-gray-500">Email</span>
                                        <input
                                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                            value={orgForm.email}
                                            onChange={e => setOrgForm(f => ({ ...f, email: e.target.value }))}
                                        />
                                    </label>
                                    <label className="block sm:col-span-2">
                                        <span className="text-xs text-gray-500">Address</span>
                                        <input
                                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                            value={orgForm.address}
                                            onChange={e => setOrgForm(f => ({ ...f, address: e.target.value }))}
                                        />
                                    </label>
                                    <label className="block sm:col-span-2">
                                        <span className="text-xs text-gray-500">License number</span>
                                        <input
                                            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                            value={orgForm.licenseNumber}
                                            onChange={e => setOrgForm(f => ({ ...f, licenseNumber: e.target.value }))}
                                        />
                                    </label>
                                </div>
                                <button
                                    onClick={handleSaveOrg}
                                    disabled={saving}
                                    className="px-4 py-2 bg-[#008540] text-white rounded-lg text-sm font-medium hover:bg-[#007235] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Saving…' : 'Save organization'}
                                </button>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-sm font-semibold text-gray-800">Linked hospitals</h2>
                                <p className="text-xs text-gray-400">
                                    Remove a hospital from your organization. To add hospitals, use the Hospital page.
                                </p>
                                {(org?.hospitals ?? []).length === 0 ? (
                                    <p className="text-sm text-gray-400 py-4">No hospitals linked.</p>
                                ) : (
                                    <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                                        {(org?.hospitals ?? []).map(h => (
                                            <li key={h.id} className="flex items-center justify-between px-4 py-3 bg-white">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">{h.name}</p>
                                                    {h.city && <p className="text-xs text-gray-400">{h.city}</p>}
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveHospital(h.id, h.name)}
                                                    className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5"
                                                >
                                                    Remove
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            <section className="border border-red-100 rounded-xl p-5 bg-red-50/40 space-y-3">
                                <div className="flex items-center gap-2 text-red-700 font-medium text-sm">
                                    <FiAlertTriangle /> Delete organization
                                </div>
                                {orgDeletionPending ? (
                                    <p className="text-xs text-red-700">
                                        This organization is <strong>paused</strong>. All staff are locked out.
                                        Permanent deletion is scheduled for{' '}
                                        {new Date(
                                            account?.organization?.deletion?.scheduledPurgeAt
                                            ?? org?.deletion?.scheduledPurgeAt
                                            ?? '',
                                        ).toLocaleDateString()}.
                                        Check your email for a link to resume.
                                    </p>
                                ) : (
                                    <>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            Pauses the organization immediately (no one can sign in). After 30 days all
                                            data is permanently deleted. An email is sent to you and to MobileUurka support.
                                            You must delete the org before deleting your personal account.
                                        </p>
                                        {!showOrgDeleteConfirm ? (
                                            <button
                                                onClick={() => setShowOrgDeleteConfirm(true)}
                                                className="border border-red-300 text-red-600 rounded-lg px-4 py-2 text-sm hover:bg-red-50"
                                            >
                                                Delete organization
                                            </button>
                                        ) : (
                                            <div className="space-y-3">
                                                <label className="block">
                                                    <span className="text-xs text-gray-600">Password</span>
                                                    <input
                                                        type="password"
                                                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                                        value={orgDeletePassword}
                                                        onChange={e => setOrgDeletePassword(e.target.value)}
                                                    />
                                                </label>
                                                <label className="block">
                                                    <span className="text-xs text-gray-600">
                                                        Type organization name to confirm: <strong>{orgForm.name}</strong>
                                                    </span>
                                                    <input
                                                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                                        value={orgDeleteConfirm}
                                                        onChange={e => setOrgDeleteConfirm(e.target.value)}
                                                        placeholder={orgForm.name}
                                                    />
                                                </label>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleRequestOrgDeletion}
                                                        disabled={saving}
                                                        className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                                                    >
                                                        {saving ? 'Scheduling…' : 'Confirm org deletion'}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setShowOrgDeleteConfirm(false);
                                                            setOrgDeletePassword('');
                                                            setOrgDeleteConfirm('');
                                                        }}
                                                        className="border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </section>
                        </div>
                    )}
                </div>
            }
            {activeTab === 'audit' && isOrgOwner && (
                <div className='w-full overflow-y-auto pb-10'>
                    <OrgAuditTrailViewer organizationId={account?.organization?.id ?? ''} />
                </div>

            )}
        </div>
    );
}

export default Settings;
