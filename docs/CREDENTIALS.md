# Third-Party Credentials Setup Guide

This document provides step-by-step instructions for configuring all third-party services required by Gray Duck.

---

## 1. Clerk Auth

Clerk handles user authentication and session management.

### Creating a Clerk Application

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) and sign in or create an account.
2. Click **Add Application**.
3. Enter a name (e.g., "Gray Duck").
4. Select the sign-in methods you want to support (Email, Google, etc.).
5. Click **Create Application**.

### Getting API Keys

1. In the Clerk Dashboard, navigate to **API Keys** in the sidebar.
2. Copy the **Publishable Key** and **Secret Key**.

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Setting Callback URLs

1. In the Clerk Dashboard, go to **API Keys** -> **Authorized origins**.
   - **Development**: `http://localhost:3000`
   - **Production**: Add your Vercel deployment URL.
2. Under **API Keys** -> **Redirect URLs**, set:
   - **After sign-in**: `/dashboard`
   - **After sign-up**: `/dashboard`

### Webhook Signing Secret

If you need Clerk webhooks (e.g., to sync user data to Neon):

1. In the Clerk Dashboard, go to **Webhooks**.
2. Click **Add Endpoint**.
3. Set the endpoint URL to `https://your-domain.com/api/webhooks/clerk`.
4. Subscribe to events (e.g., `user.created`, `user.updated`).
5. After creation, copy the **Signing Secret** into your environment:

```env
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
```

---

## 2. Google Gemini API

Gemini provides AI-powered photo analysis and story generation.

### Enabling the API

1. Go to the [Google AI Studio](https://makersuite.google.com/app/apikey) or the [Google Cloud Console](https://console.cloud.google.com).
2. Create a new project or select an existing one.
3. Navigate to **APIs & Services** -> **Library**.
4. Search for **Generative Language API** (or **Vertex AI API** depending on usage).
5. Click **Enable**.

### Creating an API Key

1. In the Google Cloud Console, go to **APIs & Services** -> **Credentials**.
2. Click **Create Credentials** -> **API Key**.
3. Copy the generated key.

```env
GEMINI_API_KEY=AIzaSy...
```

### Setting API Restrictions (Recommended)

1. In the Credentials page, click the edit icon on your API key.
2. Under **API restrictions**, select **Generative Language API** (or **Vertex AI API**).
3. Under **Application restrictions**, restrict to your Vercel deployment's IP or HTTP referrers.
4. Click **Save**.

---

## 3. Google Maps JavaScript API

The Maps API powers the interactive map with clustered animal markers.

### Enabling the Maps JavaScript API

1. Go to the [Google Cloud Console](https://console.cloud.google.com).
2. With the same project used for Gemini (or a separate one):
3. Navigate to **APIs & Services** -> **Library**.
4. Search for **Maps JavaScript API**.
5. Click **Enable**.

### Creating a Restricted API Key

1. Go to **APIs & Services** -> **Credentials**.
2. Click **Create Credentials** -> **API Key**.
3. Copy the generated key.
4. Click the edit icon on the key to apply restrictions:
   - **Application restrictions**: Select **HTTP referrers (web sites)**.
   - Add your domains:
     - `http://localhost:3000/*` (development)
     - `https://your-domain.vercel.app/*` (production)
   - **API restrictions**: Select **Restrict key** and choose **Maps JavaScript API**.
5. Click **Save**.

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

---

## 4. Neon Postgres

Neon provides a serverless PostgreSQL database with connection pooling.

### Creating a Database Instance

1. Go to [console.neon.tech](https://console.neon.tech) and sign in or create an account.
2. Click **Create Project**.
3. Enter a project name (e.g., "gray-duck").
4. Select your region (preferably close to your Vercel deployment region).
5. Click **Create**.

### Getting Connection Strings

1. In the Neon console, select your project.
2. Go to **Connection Details** in the dashboard.
3. Copy both connection strings:

| Type   | Description                                   | Example                                     |
| ------ | --------------------------------------------- | ------------------------------------------- |
| Pooled | Used by Drizzle ORM with `?pgbouncer=true`    | `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?pgbouncer=true` |
| Direct | Direct (unpooled) for migrations and long-running queries | `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb` |

```env
DATABASE_URL=postgresql://[user]:[password]@[host]/[dbname]?pgbouncer=true
DIRECT_URL=postgresql://[user]:[password]@[host]/[dbname]
```

4. In the Neon dashboard, you can also navigate to **Settings** -> **IP Allow** to optionally restrict access to your Vercel deployment's IP range.

---

## 5. Vercel Blob

Vercel Blob stores the animal photos uploaded through the capture flow.

### Creating a Blob Store

1. Go to [vercel.com](https://vercel.com) and select your project.
2. Navigate to **Storage** in the project dashboard.
3. Click **Create Database** -> **Blob**.
4. Select a region (preferably matching your Vercel deployment region).
5. Click **Create**.

### Getting the Read/Write Token

1. In the Storage tab, click on your Blob store.
2. Copy the **Read & Write Token** from the dashboard.

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

### OIDC Auth Note

When deploying on Vercel, prefer **OIDC token-based authentication** over long-lived tokens. OIDC is supported natively by `@vercel/blob` and does not require storing static secrets in environment variables. However, for local development and CI/CD, you will still need the `BLOB_READ_WRITE_TOKEN` environment variable.

---

## Summary: Environment Variables

| Variable                           | Required       | Description                              |
| ---------------------------------- | -------------- | ---------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes            | Clerk publishable key (public, client-side) |
| `CLERK_SECRET_KEY`                  | Yes            | Clerk secret key (server-side only)       |
| `DATABASE_URL`                      | Yes            | Neon pooled connection string             |
| `DIRECT_URL`                        | Yes            | Neon direct connection string             |
| `GEMINI_API_KEY`                    | Yes            | Google Gemini API key                     |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`   | Yes            | Google Maps JavaScript API key (client-side) |
| `BLOB_READ_WRITE_TOKEN`             | Yes            | Vercel Blob read/write token              |
