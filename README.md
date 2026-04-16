# @fzed51/nest-lib

Collection de librairies utilitaires pour projets NestJS.

## Installation

```bash
npm install @fzed51/nest-lib
# ou
yarn add @fzed51/nest-lib
```

## Modules

### `PersistenceManager`

Gestionnaire de persistance fichier pour stocker des données sérialisables de manière sécurisée. Chaque entrée est horodatée et protégée par un checksum SHA-256.

Le type des données est associé à chaque clé via les génériques des méthodes, ce qui permet à une même instance de gérer des données de types différents.

```ts
import { PersistenceManager } from '@fzed51/nest-lib';

const manager = new PersistenceManager({ storageDir: './data' });

// Stocker
await manager.store<User>('user:1', { id: 1, name: 'Alice' });

// Récupérer
const user = await manager.retrieve<User>('user:1'); // User | null

// Récupérer avec métadonnées (timestamp, checksum)
const stored = await manager.retrieveStoredData<User>('user:1');

// Vérifier l'existence
const exists = await manager.exists('user:1'); // boolean

// Lister les clés
const keys = await manager.listKeys(); // string[]

// Supprimer
await manager.remove('user:1'); // true | false

// Nettoyer les entrées expirées (> 7 jours)
const removed = await manager.cleanup(7 * 24 * 60 * 60 * 1000);
```

#### Options

| Option       | Type     | Défaut      | Description                         |
| ------------ | -------- | ----------- | ----------------------------------- |
| `storageDir` | `string` | `./storage` | Répertoire de stockage des fichiers |

#### Contraintes sur les clés

Les clés doivent être non vides et ne contenir que des caractères alphanumériques, `.`, `-` ou `_`.

---

### Utilitaires

#### `toBoolean(value)`

Convertit une valeur quelconque en booléen.

```ts
import { toBoolean } from '@fzed51/nest-lib';

toBoolean('true');  // true
toBoolean('oui');   // true
toBoolean('yes');   // true
toBoolean('1');     // true
toBoolean('false'); // false
toBoolean(0);       // false
toBoolean(null);    // false
```

#### `joinpath(path, ...childs)`

Concatène des segments de chemin URL en évitant les doubles slashes.

```ts
import { joinpath } from '@fzed51/nest-lib';

joinpath('https://example.com/', '/api', '/users'); // 'https://example.com/api/users'
```

#### `joinParams(url, params)`

Ajoute des paramètres de requête à une URL.

```ts
import { joinParams } from '@fzed51/nest-lib';

joinParams('https://example.com/api/users', { page: 1, limit: 20 });
// 'https://example.com/api/users?page=1&limit=20'
```

## Peer dependencies

- `@nestjs/common` ^11.0.0
- `@nestjs/core` ^11.0.0

