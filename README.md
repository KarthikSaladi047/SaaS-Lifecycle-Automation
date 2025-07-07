# PCD Manager

## Overview

**PCD Manager** is a Next.js application that helps Platform9 teams manage Private Cloud Director (PCDs) across multiple environments. It provides visibility and control over Infra and workload regions, their metadata, lease cycles, and task states. The app is intended for use by internal teams with OAuth-based Google login and Slack integration.

---

## 🔐 Authentication

- **Google OAuth Login** is used (via `next-auth`).
- Login is restricted to allowed Google accounts.

---

## 📊 Home Page Features (`/home`)

### ✅ View All Regions

- Fetches and displays a list of all regions across selected environments.
- Each region is grouped by customer shortname.
- Real-time updates with chart URLs, lease info, tags, etc.

### 🔍 Search

- Quickly search and filter regions by FQDN, owner, tags, etc.

### 🔄 Reset Task Status

- You can reset the `task_state` of any region to `ready` via API.

### 🏷️ Add / Remove Tags

- Add descriptive tags to regions to indicate ownership, purpose, or status.
- Remove tags when no longer needed.

---

## 🛠 Control Panel Features (`/control-panel`)

### 🚀 Create Infra Region

- Creates a new customer and a root region (infra region).
- Sets owner, lease date, chart URL, and other metadata.

### ➕ Add Region to PCD

- Adds new workload regions under an existing PCD (customer).
- Uses same metadata structure as Infra regions.

### ❌ Delete Regions

- Fires a request to delete a region.
- If it's an Infra region, also deletes the customer.

### 🔁 Update Lease

- Updates the `lease_date` and increments the `lease_counter`.
- Can include optional notes.

### 🔗 Navigate to Tempus Upgrade Page

- Provides links to the correct Tempus page for initiating a region upgrade.

---

## 🧹 Cleanup API

A scheduled API endpoint is available for:

### 1. 🗑 Auto-deleting Expired Regions

- Fetches all regions from Bork.
- Compares each region's `lease_date` to current date
- Automatically triggers deletion for expired regions

### 2. 📣 Slack Notifications for Expiring Regions

- Sends **Slack batch messages** to a dedicated channel [pcd-lease-notices](https://platform9.slack.com/archives/C0935NGUC6B)
- Tags all region owners whose regions will expire in **7 days** or **1 day**
- Message includes a table with:

  - FQDN
  - Owner email
  - Lease Date

---

## 🔧 Tech Stack

- **Frontend:** Next.js (App Router)
- **Backend APIs:** `/app/api` with full TypeScript support
- **OAuth:** next-auth with Google provider
- **Slack:** Slack Web API for notifications
- **Dockerized:** Single image with `standalone` output for optimal deployment

---

## 📂 Folder Structure (Partial)

```
/app
  /api           # All backend API routes
  /utils         # Slack, etc.
  /components    # UI components
  /constants     # Environment config
  /types         # Shared TS types
  /home          # home page
  /control-panel # control panel page
```

---

🚀 Deployment Summary

Docker build & push

K8s deployment with volume-mounted secrets

HTTPS via Let's Encrypt

Ingress and Service YAMLs provided. Check out [k8s-config](https://github.com/KarthikSaladi047/SaaS-Lifecycle-Automation/blob/main/k8s-config/pcd-manager.yaml).

---

## 📬 Contact

For issues, questions or feature requests, contact `karthiksaladi047@gamil.com`
