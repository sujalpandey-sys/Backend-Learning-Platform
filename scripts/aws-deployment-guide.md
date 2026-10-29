# AWS Production Deployment Guide: ECS Fargate, ALB, RDS & ElastiCache

This document details the complete production architecture, deployment roadmap, and infrastructure considerations for deploying the **Backend Learning Platform API** to Amazon Web Services (AWS).

---

## 1. High-Level Architecture Overview

```
                                  [ Internet / Clients ]
                                             │
                                      (HTTPS / TLS 443)
                                             ▼
                                 [ Route 53 DNS Record ]
                                             │
                                             ▼
                               [ AWS Application Load Balancer ]
                                (AWS Certificate Manager SSL)
                                             │
                                     (HTTP Port 8000)
                                             ▼
                       [ AWS VPC: Private Application Subnets ]
                      ┌──────────────────────────────────────┐
                      │    AWS ECS Fargate Cluster           │
                      │    ┌───────────────┐ ┌─────────────┐ │
                      │    │ Task Replica 1│ │Task Replica2│ │
                      │    └───────┬───────┘ └──────┬──────┘ │
                      └────────────┼────────────────┼────────┘
                                   │                │
            ┌──────────────────────┴────────────────┴──────────────────────┐
            ▼                                                              ▼
   [ Amazon RDS PostgreSQL ]                                    [ Amazon ElastiCache Redis ]
   (Multi-AZ, Encrypted, Private Subnet)                         (Cluster Mode / Replication Group)
```

---

## 2. Infrastructure Components

### 2.1 Compute: Amazon ECS with AWS Fargate
- **Why Fargate?** Serverless container compute eliminates EC2 instance patching, OS hardening, and cluster sizing maintenance.
- **CPU/Memory Specs:** Start with `0.5 vCPU` and `1024 MB RAM` per container task, scaling horizontally based on CPU/Memory thresholds (e.g. scale up when average CPU > 70%).
- **Multi-AZ Availability:** Deploy tasks across at least two Availability Zones (AZs) behind an Application Load Balancer.

### 2.2 Relational Database: Amazon RDS PostgreSQL
- **SQLite vs. PostgreSQL:** SQLite relies on a single file lock. While sufficient for local development and unit tests, horizontal scaling with multiple concurrent ECS container replicas requires a network-accessible, ACID-compliant RDBMS.
- **Recommendation:** Amazon RDS PostgreSQL (v16.x) with Multi-AZ deployment for automated failover, automated point-in-time recovery, and storage autoscaling.
- **Connection pooling:** In high-concurrency environments, use **AWS RDS Proxy** to manage and multiplex database connections from container tasks.

### 2.3 Caching: Amazon ElastiCache for Redis
- Managed Redis cluster configured in private subnets.
- Enables query result caching, sub-millisecond read response times, and automated cache key invalidation on write/update/delete operations.

---

## 3. Container Lifecycle & Image Registry (Amazon ECR)

### 3.1 Setup ECR Repository
```bash
aws ecr create-repository \
    --repository-name backend-learning-platform \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256
```

### 3.2 Building and Tagging Immutable Images
Never deploy mutable tags like `:latest` to production. Use the Git commit SHA or semantic version tag:

```bash
# Authenticate Docker with Amazon ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build production image
export COMMIT_SHA=$(git rev-parse --short HEAD)
docker build -t backend-learning-platform:$COMMIT_SHA .

# Tag for Amazon ECR
docker tag backend-learning-platform:$COMMIT_SHA <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/backend-learning-platform:$COMMIT_SHA

# Push image
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/backend-learning-platform:$COMMIT_SHA
```

---

## 4. Secret Management & Environment Configuration

**Security Rule:** Never store plaintext passwords or JWT signing keys in Docker images or Git repositories.

Use **AWS Secrets Manager** or **AWS Systems Manager (SSM) Parameter Store**:

```bash
aws secretsmanager create-secret \
    --name /production/backend-learning-platform/jwt-secret \
    --description "Cryptographically secure production JWT signing key" \
    --secret-string "$(openssl rand -hex 32)"

aws secretsmanager create-secret \
    --name /production/backend-learning-platform/database-url \
    --description "PostgreSQL connection string with credentials" \
    --secret-string "postgresql+psycopg2://appuser:SecretPassword123@rds-endpoint.us-east-1.rds.amazonaws.com:5432/taskdb"
```

In the ECS Task Definition, reference secrets directly:
```json
{
  "name": "JWT_SECRET_KEY",
  "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:/production/backend-learning-platform/jwt-secret"
},
{
  "name": "DATABASE_URL",
  "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:/production/backend-learning-platform/database-url"
}
```

---

## 5. Networking and Security Groups

Apply least-privilege firewall rules:
1. **ALB Security Group:**
   - Inbound: Port 443 (HTTPS) from `0.0.0.0/0`.
   - Inbound: Port 80 (HTTP) redirected to 443.
   - Outbound: Port 8000 to ECS Container Tasks Security Group only.
2. **ECS Tasks Security Group:**
   - Inbound: Port 8000 only from ALB Security Group.
   - Outbound: Port 5432 to RDS Security Group; Port 6379 to Redis Security Group; Port 443 to AWS API endpoints (SSM/SecretsManager/CloudWatch).
3. **RDS PostgreSQL Security Group:**
   - Inbound: Port 5432 only from ECS Tasks Security Group.
   - Outbound: None.

---

## 6. Health Checks, Monitoring & Observability

- **ALB Target Group Health Check:**
  - Path: `/health/ready` (or `/health/live`)
  - Healthy threshold: 2
  - Unhealthy threshold: 3
  - Interval: 15 seconds
  - Timeout: 5 seconds
  - Success code: 200
- **CloudWatch Logs:**
  - Tasks stream structured JSON logs to `/ecs/backend-learning-platform`.
  - Create CloudWatch Metric Filters for HTTP status codes >= 500 and trigger SNS alerts.

---

## 7. Database Migrations in Production CI/CD

**Migration Strategy:**
1. Run migrations before new task rollout using a one-off standalone ECS task:
   ```bash
   aws ecs run-task \
       --cluster production-cluster \
       --task-definition backend-learning-platform-migration \
       --overrides '{"containerOverrides": [{"name": "migration", "command": ["alembic", "upgrade", "head"]}]}'
   ```
2. Once the migration task exits with status code 0, trigger the rolling deployment of the web tasks.
3. Design schema changes to be backwards-compatible (expand/contract pattern) so running containers do not break during mid-deployment transitions.

---

## 8. Rollback and Disaster Recovery

- **Instant Rollback:** Revert ECS Service to previous Task Definition revision:
  ```bash
  aws ecs update-service \
      --cluster production-cluster \
      --service api-service \
      --task-definition backend-learning-platform:<PREVIOUS_REVISION>
  ```
- **Database Backup:** Amazon RDS automated snapshots take daily snapshots with 35-day retention. Perform manual snapshot before major schema migrations.

---

## 9. Cost Optimization & Cleanup

For non-production learning environments:
- Use AWS Fargate Spot instances for development/staging (up to 70% cost savings).
- Use single-AZ `db.t4g.micro` for learning experiments.
- Tear down unneeded resources:
  ```bash
  aws ecs delete-service --cluster dev-cluster --service api-service --force
  aws rds delete-db-instance --db-instance-identifier dev-db --skip-final-snapshot
  ```

