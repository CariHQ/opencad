/**
 * Plugin publisher panel.
 *
 * Three modes depending on the signed-in user's publisher state:
 *   1. Not a publisher yet → register form (display name + contact email).
 *      On submit we create a stub Stripe Connect Express account and
 *      persist the publisher row.
 *   2. Registered but not onboarded with Stripe → onboarding-url link.
 *      Only matters for paid plugins; free-plugin publishers can skip.
 *   3. Registered → submit-a-plugin form. Inline manifest fields + a
 *      file picker for the JS bundle. On submit we:
 *        a. POST /plugins with the manifest (moderation_status=pending)
 *        b. POST /plugins/:id/bundle with the file (SRI hash + storage)
 *      The plugin appears in the admin queue for review and shows up
 *      in the public catalogue after approval.
 *
 * Admin users also see a Moderation Queue section with Approve / Reject
 * actions and a Revoke button per plugin.
 */
import React, { useEffect, useState } from 'react';
import {
  registerPublisher,
  getPublisher,
  getOnboardingUrl,
  submitPlugin,
  uploadBundle,
  adminListQueue,
  adminSetModeration,
  adminRevoke,
  type Publisher,
  type Plugin,
  type PluginPermission,
} from '../lib/marketplaceApi';

// ── Publisher registration ───────────────────────────────────────────────────

interface PublisherRegisterProps {
  initialEmail?: string;
  onRegistered: (p: Publisher) => void;
}

function PublisherRegister({ initialEmail, onRegistered }: PublisherRegisterProps): React.ReactElement {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const p = await registerPublisher({ displayName: displayName.trim(), contactEmail: email.trim() });
      onRegistered(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="publisher-form" onSubmit={(e) => void handleSubmit(e)}>
      <h4 className="section-title">Become a plugin publisher</h4>
      <p className="publisher-intro">
        Publish plugins to the OpenCAD marketplace. Free to publish. 70/30 revenue split on paid plugins.
      </p>
      <label className="publisher-field">
        <span>Display name</span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Acme Architects"
          required
          disabled={submitting}
        />
      </label>
      <label className="publisher-field">
        <span>Contact email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={submitting}
        />
      </label>
      {error && <div className="publisher-error">{error}</div>}
      <button type="submit" className="btn-install" disabled={submitting}>
        {submitting ? 'Registering…' : 'Register as publisher'}
      </button>
    </form>
  );
}

// ── Submit a plugin ──────────────────────────────────────────────────────────

const ALL_PERMISSIONS: PluginPermission[] = ['document', 'ui', 'network', 'storage'];
const CATEGORIES = ['examples', 'modeling', 'structural', 'analysis', 'documentation', 'import-export', 'misc'];

interface SubmitPluginFormProps {
  publisher: Publisher;
}

function SubmitPluginForm({ publisher }: SubmitPluginFormProps): React.ReactElement {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [category, setCategory] = useState('misc');
  const [permissions, setPermissions] = useState<PluginPermission[]>(['ui']);
  const [priceCents, setPriceCents] = useState(0);
  const [bundleFile, setBundleFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const togglePerm = (p: PluginPermission): void => {
    setPermissions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      // 1. Submit the manifest row (moderation_status = pending).
      const plugin = await submitPlugin({
        id: id.trim(),
        name: name.trim(),
        description: description.trim(),
        version: version.trim(),
        category,
        entrypoint: 'pending://upload', // overwritten by the bundle step below
        permissions,
        priceCents,
      });
      // 2. Upload the bundle (server hashes it and rewrites entrypoint).
      if (bundleFile) {
        await uploadBundle(plugin.id, bundleFile);
      }
      setSuccess(`Submitted "${plugin.name}" v${plugin.version}. It will appear in the catalogue once OpenCAD approves it.`);
      setId('');
      setName('');
      setDescription('');
      setVersion('1.0.0');
      setCategory('misc');
      setPermissions(['ui']);
      setPriceCents(0);
      setBundleFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit plugin');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="publisher-form" onSubmit={(e) => void handleSubmit(e)}>
      <h4 className="section-title">Submit a plugin</h4>
      <p className="publisher-intro">
        Signed in as <strong>{publisher.displayName || publisher.contactEmail}</strong>.
      </p>
      <label className="publisher-field">
        <span>ID (URL-safe slug, e.g. "my-plugin")</span>
        <input
          type="text"
          value={id}
          onChange={(e) => setId(e.target.value.replace(/[^a-z0-9-]/g, ''))}
          required
          disabled={submitting}
        />
      </label>
      <label className="publisher-field">
        <span>Name</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={submitting} />
      </label>
      <label className="publisher-field">
        <span>Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={submitting}
        />
      </label>
      <div className="publisher-field-row">
        <label className="publisher-field">
          <span>Version</span>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0.0"
            required
            disabled={submitting}
          />
        </label>
        <label className="publisher-field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={submitting}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="publisher-field">
          <span>Price (cents)</span>
          <input
            type="number"
            min={0}
            step={100}
            value={priceCents}
            onChange={(e) => setPriceCents(Number.parseInt(e.target.value, 10) || 0)}
            disabled={submitting}
          />
        </label>
      </div>
      <fieldset className="publisher-perms">
        <legend>Permissions</legend>
        {ALL_PERMISSIONS.map((p) => (
          <label key={p} className="publisher-perm-check">
            <input
              type="checkbox"
              checked={permissions.includes(p)}
              onChange={() => togglePerm(p)}
              disabled={submitting}
            />
            <span>{p}</span>
          </label>
        ))}
      </fieldset>
      <label className="publisher-field">
        <span>Bundle (.js)</span>
        <input
          type="file"
          accept="text/javascript,application/javascript,.js"
          onChange={(e) => setBundleFile(e.target.files?.[0] ?? null)}
          required
          disabled={submitting}
        />
      </label>
      {error && <div className="publisher-error">{error}</div>}
      {success && <div className="publisher-success">{success}</div>}
      <button type="submit" className="btn-install" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit for review'}
      </button>
    </form>
  );
}

// ── Admin moderation queue ───────────────────────────────────────────────────

function ModerationQueue(): React.ReactElement {
  const [queue, setQueue] = useState<Plugin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = React.useCallback(async (): Promise<void> => {
    try {
      const q = await adminListQueue();
      setQueue(q);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const approve = async (id: string): Promise<void> => {
    setBusy(id);
    try {
      await adminSetModeration(id, 'approved');
      await refresh();
    } finally { setBusy(null); }
  };
  const reject = async (id: string): Promise<void> => {
    const notes = window.prompt('Rejection notes (sent to publisher, optional):') ?? undefined;
    setBusy(id);
    try {
      await adminSetModeration(id, 'rejected', notes);
      await refresh();
    } finally { setBusy(null); }
  };
  const revoke = async (id: string): Promise<void> => {
    const reason = window.prompt('Kill-switch reason (shown to users on next load):') ?? undefined;
    setBusy(id);
    try {
      await adminRevoke(id, true, reason);
      await refresh();
    } finally { setBusy(null); }
  };

  // If the admin endpoint 404s for this user, they aren't an admin —
  // silently render nothing instead of a scary error banner.
  if (error) return <></>;
  if (!queue) return <></>;
  if (queue.length === 0) return <></>;

  return (
    <div className="publisher-queue">
      <h4 className="section-title">Moderation queue</h4>
      <p className="publisher-intro">Plugins awaiting review.</p>
      {queue.map((p) => (
        <div key={p.id} className="marketplace-item">
          <div className="item-info">
            <span className="item-name">{p.name}</span>
            <span className="item-desc">{p.description}</span>
            <span className="item-meta">
              v{p.version} · by {p.author} · {p.category}
            </span>
          </div>
          <div className="item-actions">
            <button
              className="btn-install"
              disabled={busy === p.id}
              onClick={() => void approve(p.id)}
            >
              Approve
            </button>
            <button
              className="btn-uninstall"
              disabled={busy === p.id}
              onClick={() => void reject(p.id)}
            >
              Reject
            </button>
            <button
              className="btn-uninstall"
              disabled={busy === p.id}
              onClick={() => void revoke(p.id)}
              title="Kill-switch: installed clients auto-uninstall"
            >
              Revoke
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

interface PluginPublisherPanelProps {
  /** Used to prefill the contact email on registration. */
  userEmail?: string;
}

export function PluginPublisherPanel({ userEmail }: PluginPublisherPanelProps): React.ReactElement {
  const [publisher, setPublisher] = useState<Publisher | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setPublisher(await getPublisher());
      } catch {
        setPublisher(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!publisher || publisher.stripeOnboarded) return;
    (async () => {
      try {
        const { url } = await getOnboardingUrl();
        setOnboardingUrl(url);
      } catch {
        setOnboardingUrl(null);
      }
    })();
  }, [publisher]);

  if (loading) return <div className="publisher-loading">Loading publisher status…</div>;

  return (
    <div className="publisher-panel">
      {!publisher ? (
        <PublisherRegister initialEmail={userEmail} onRegistered={setPublisher} />
      ) : (
        <>
          {!publisher.stripeOnboarded && onboardingUrl && !onboardingUrl.startsWith('about:blank') && (
            <div className="publisher-stripe-notice">
              <span>
                To receive payouts for paid plugins, complete Stripe onboarding.
              </span>
              <a className="btn-install" href={onboardingUrl} target="_blank" rel="noreferrer">
                Complete Stripe onboarding
              </a>
            </div>
          )}
          <SubmitPluginForm publisher={publisher} />
          <ModerationQueue />
        </>
      )}
    </div>
  );
}
