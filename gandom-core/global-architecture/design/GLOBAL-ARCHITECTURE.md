# GANDOM GLOBAL EXECUTION ARCHITECTURE

## 1. Client
Android APK/AAB and Web clients.

## 2. Edge
DNS, CDN, TLS, WAF and global routing.

## 3. Application
Horizontally scalable stateless application instances.

## 4. Data
Database cluster, cache, message processing, object storage and search/index services.

## 5. Reliability
Health checks, automatic recovery, backups, monitoring and audit evidence.

## 6. Deployment
Source -> CI/CD -> immutable build -> deployment -> health verification.

## 7. Scale
No fixed capacity is assumed.
Capacity is established experimentally through controlled load testing.

## 8. Development boundary
Termux is development/control infrastructure only.
End users do not require Termux, Node.js, Gradle or Android SDK.

## 9. Evidence rule
Every production PASS requires executable evidence.
