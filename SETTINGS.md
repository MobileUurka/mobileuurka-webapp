# Settings (Frontend)

Full reference: [`../mobileuurka-backend-v2/documentation/SETTINGS_AND_ACCOUNT.md`](../mobileuurka-backend-v2/documentation/SETTINGS_AND_ACCOUNT.md)

## Tabs

### Account
- Edit name / phone (instant save)
- Delete account — 30-day grace, then anonymization (clinical data kept with name snapshot)
- **Owners:** must schedule org deletion first (Organization tab)

### Organization (owners only)
- Edit display name & contact (slug is read-only)
- Unlink hospitals
- **Delete organization** — pauses org immediately, 30-day grace, emails owner + admin@mobileuurka.com

## Data & names on records

Clinical saves store `editor_name` (snapshot). Inactive users show a dotted underline + tooltip:

- Deactivated → "This user is no longer active"
- Removed after 30 days → name from snapshot + "account was removed" tooltip

## API service

```typescript
import { settingsService } from './services/settingsService';

await settingsService.getAccount();
await settingsService.updateAccount({ firstName, lastName, phone });
await settingsService.requestDeletion(password);
await settingsService.requestOrgDeletion(password, orgNameExact);
await settingsService.cancelDeletion(token);
await settingsService.cancelOrgDeletion(token);
```

## Email cancel links

| Link | Opens |
|------|--------|
| `/auth?cancelDeletion=...` | Cancel account deletion |
| `/auth?cancelOrgDeletion=...` | Resume paused organization |
