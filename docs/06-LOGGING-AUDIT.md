# Logging & Audit

## Logging Strategy

### Structured Logging (pino)
- **Format**: JSON in production, pretty-printed in development
- **Levels**: trace, debug, info, warn, error, fatal
- **Default level**: `info` (configurable via `LOG_LEVEL`)

### Request Logging (pino-http)
- Every HTTP request is logged with a unique request ID
- Sensitive headers are redacted (Authorization, Cookie, Set-Cookie)
- Use `req.log` in route handlers for request-scoped logging

### Correlation IDs
- Every request gets a unique correlation ID (`x-correlation-id` header or auto-generated UUID)
- The correlation ID is propagated through all log entries for that request
- Returned in the response header `x-correlation-id`

### Log Categories

| Category          | Logger   | Purpose                                    |
|-------------------|----------|--------------------------------------------|
| App logs          | `logger` | Application lifecycle, startup, shutdown   |
| Request logs      | `req.log`| HTTP request/response logging              |
| Audit events      | DB table | Business-critical actions (create, update, delete, approve) |
| Security events   | DB table | Auth failures, permission denials, config violations |
| Integration errors| `logger` | External API failures (Graph, AI, etc.)    |

### Rules
- Never use `console.log` in server code — always use pino
- Never log sensitive data (passwords, tokens, PII) in cleartext
- Always include context (userId, resourceId, action) in audit events
- Errors must include stack traces in development, sanitized messages in production

## Audit Events

### Database Table: `audit_events`

| Column          | Type      | Description                              |
|-----------------|-----------|------------------------------------------|
| id              | serial PK | Auto-increment ID                        |
| event_type      | text      | Category: content, auth, admin, system   |
| action          | text      | Specific action: create, update, delete  |
| actor_id        | text      | User/principal who performed the action  |
| resource_type   | text      | Type of resource affected                |
| resource_id     | text      | ID of the resource affected              |
| details         | jsonb     | Additional event-specific data           |
| correlation_id  | text      | Request correlation ID                   |
| ip_address      | text      | Client IP address                        |
| created_at      | timestamp | When the event occurred                  |

### Event Types
- `content` — page/revision create, update, delete, publish
- `auth` — login, logout, permission denied, role change
- `admin` — settings change, template change, config change
- `system` — startup, shutdown, migration, health check failure

### Usage

```typescript
import { auditService } from "./lib/audit";

await auditService.log({
  eventType: "content",
  action: "create",
  actorId: "user-123",
  resourceType: "content_node",
  resourceId: "node-456",
  details: { title: "New Process" },
  correlationId: req.id,
  ipAddress: req.ip,
});
```
