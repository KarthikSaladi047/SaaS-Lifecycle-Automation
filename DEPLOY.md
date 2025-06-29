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
