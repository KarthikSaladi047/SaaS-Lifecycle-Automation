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
- Tags all region owners whose regions will expire in **5 days** or **1 day**
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

## 🚀 How to Deploy PCD Manager

### Clone the project

```
git clone https://github.com/KarthikSaladi-pf9/pcd_manager_hackathon.git
cd pcd_manager_hackathon
```

---

### Build and Push Docker Image

```
docker build -t yourusername/pcd-manager:1.1.1 .
docker push yourusername/pcd-manager:1.1.1
```

---

### Create K8s Secret for Environment Variables

```
kubectl create secret generic pcd-manager-env-secret \
  --from-literal=GOOGLE_CLIENT_ID=xxx \
  --from-literal=GOOGLE_CLIENT_SECRET=xxx \
  --from-literal=NEXTAUTH_URL=https://pcd-manager.yourdomain.com \
  --from-literal=NEXTAUTH_SECRET=some-random-string \
  --from-literal=SLACK_BOT_TOKEN=xoxb-xxx
```

---

### Create Secret for Bork Tokens

```
kubectl create secret generic bork-token-secret \
  --from-literal=qa-bork-token=xxx \
  --from-literal=staging-bork-token=yyy
  --from-literal=dev-bork-token=yyy
```

---

### Kubernetes Deployment

```
# pcd-manager-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pcd-manager
spec:
  replicas: 1
  selector:
    matchLabels:
      app: pcd-manager
  template:
    metadata:
      labels:
        app: pcd-manager
    spec:
      containers:
        - name: pcd-manager
          image: yourusername/pcd-manager:latest
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: pcd-manager-env-secret
          volumeMounts:
            - name: bork-token
              mountPath: /var/run/secrets/platform9
              readOnly: true
      volumes:
        - name: bork-token
          secret:
            secretName: bork-token-secret
```

```
kubectl apply -f pcd-manager-deployment.yaml
```

---

### Service

```
# pcd-manager-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: pcd-manager
spec:
  selector:
    app: pcd-manager
  ports:
    - port: 80
      targetPort: 3000
```

```
kubectl apply -f pcd-manager-service.yaml
```

---

## Ingress with HTTPS via Let’s Encrypt

```
# pcd-manager-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: pcd-manager
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts:
        - pcd-manager.yourdomain.com
      secretName: pcd-manager-tls
  rules:
    - host: pcd-manager.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: pcd-manager
                port:
                  number: 80
```

```
kubectl apply -f pcd-manager-ingress.yaml
```

---

## 📬 Contact

For issues, questions or feature requests, contact `ssaladi@platform9.com`
