# Tâches Bill

## Composable `useDebounce`
- [x] Création du composable `useDebounce<T>(source: Ref<T>, delay = 300)` dans `frontend/src/composables/useDebounce.ts`
  - Retourne `debouncedValue`, `isPending`, `cancel()`, `flush()`
  - Fast-path : si la valeur est une chaîne vide ou whitespace, la mise à jour est immédiate (pas de timer)
  - Watcher configuré avec `{ flush: 'sync' }` pour un déclenchement synchrone (requis pour les tests avec fake timers)
  - Nettoyage automatique via `onUnmounted(cancel)`

## Tests `useDebounce`
- [x] 18 tests dans `frontend/src/composables/useDebounce.test.ts`
  - Helper `setupDebounce()` : monte un composant wrapper minimal et expose `source`, `debouncedValue`, `isPending`
  - Utilisation de `vi.useFakeTimers()` + `vi.advanceTimersByTime()` pour le contrôle des timers
  - Cas couverts : état initial, délai, frappes rapides (dedup), fast-path chaîne vide, `isPending`, `cancel()`, `flush()`, nettoyage au démontage

## Tests `CatalogPage` — filtres & recherche
- [x] 18 tests dans `frontend/src/pages/CatalogPage.test.ts`
  - Helper `makePage(items, total, page)` : génère une réponse paginée avec `links.next`/`links.prev` corrects selon la page courante
  - `globalThis.fetch` mocké avec `vi.fn()` ; store Pinia + router injectés via plugins
  - **Bloc "type filter"** : paramètre `type=FILM/SERIES/BOOK` présent dans l'URL, absent pour "All", classes CSS actives sur les chips, remise à `page=1` lors d'un changement de filtre
  - **Bloc "search bar"** : debounce 300 ms respecté (fake timers), chaîne vide déclenche immédiatement, état vide et bannière d'erreur affichés

## Page `AddMediaPage`
- [x] Formulaire Carbon complet dans `frontend/src/pages/AddMediaPage.vue`
  - Champs : Titre (requis), Type dropdown (requis), Auteur/Réalisateur, Année de sortie (entier → ISO `YYYY-01-01T00:00:00.000Z`), Description (textarea + compteur de caractères)
  - **Tag tokenizer** : confirmation par `Enter` ou virgule, suppression du dernier tag par `Backspace`, commit au `blur`
  - **Platform checkboxes** : apparence personnalisée (`appearance: none`, coche manuelle via `::after`)
  - Soumission : `POST /api/media` avec bearer token ; bouton désactivé tant que titre + type sont vides ; icône spinner pendant l'envoi
  - Annulation → navigation vers `{ name: 'Catalog' }`
- [x] Route ajoutée dans `frontend/src/router/index.ts` : `{ path: 'catalog/new', name: 'AddMedia', meta: { requiresAuth: true } }`

## Page `MediaDetailPage`
- [x] Remplacement du stub par une implémentation complète dans `frontend/src/pages/MediaDetailPage.vue`
  - Layout deux colonnes 38 % / 62 % (empilées sur mobile)
  - Colonne gauche : poster coloré par type (`TYPE_COLOR` / `TYPE_ICON`), ratio 2:3, lien optionnel "Visit source"
  - Colonne droite : titre (font-weight 300, 2.625 rem), badge de type, description, grille de métadonnées (Release / Genre / Availability), section "Add to collection"
  - **Add to collection** : récupère `GET /api/collections?pageSize=50`, select Carbon + bouton "Add", `POST /api/collections/:id/media { mediaId, position: 0 }`
  - Collections existantes affichées depuis `media.collections` (gestion des deux shapes : `c.collection?.name ?? c.name`)
  - États : spinner de chargement, erreur (Retry + Back), message spécifique 404

## Page `HomePage` — Dashboard
- [x] Implémentation complète dans `frontend/src/pages/HomePage.vue` avec `meta.fullWidth: true`
  - Layout trois colonnes : sidebar gauche + contenu principal + panneau d'invitations droit
  - **Stats cards** depuis `GET /api/stats` : `collectionsOwned`, `totalMedia`, `pendingCount` (point rouge pulsant `.ping-dot`)
  - **Carrousel** : `stats.recentItems` + carte CTA "Discover More"
  - **Panneau d'invitations** : `useInvitationsStore`, Accept / Decline appellent `respondToInvitation(collectionId, accept)` et retirent l'invitation localement

## Bouton "Add media" dans `CatalogPage`
- [x] Bouton primaire bleu dans la toolbar de `CatalogPage.vue`
  - Navigue vers `{ name: 'AddMedia' }` au clic
  - Styles `.add-media-btn` : hauteur 34 px, `background: #0f62fe`, sans border-radius

## Sidebar rétractable — `HomePage`
- [x] Toggle de sidebar dans `frontend/src/pages/HomePage.vue`
  - `const isSidebarCollapsed = ref(false)`
  - Bouton `.sidebar-toggle` avec icône `chevron_left` / `chevron_right`
  - Classe conditionnelle `dash-sidebar--collapsed` sur `<aside>`
  - Transition CSS `width 0.2s ease` ; labels enveloppés dans `<span class="sidebar-label">` qui passent à `opacity: 0; width: 0` en état rétracté
  - Attributs `title` sur chaque lien pour tooltip en mode rétracté

## Sidebar rétractable — `CatalogPage`
- [x] Même pattern appliqué dans `frontend/src/pages/CatalogPage.vue`
  - Largeur rétractée : 48 px ; largeur normale : 256 px
  - `overflow: hidden` sur le `<aside>` pour masquer les labels sans saut de mise en page
  - `.sidebar-toggle` : 28 × 28 px, sans border-radius (Carbon flat)
  - Padding des `.sidebar-item` réduit en mode rétracté pour centrer les icônes
