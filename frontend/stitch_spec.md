# Stitch Mocks Generation Specification

This document provides the high-fidelity UI design specification and generation prompts for the **Watchlist Service** frontend. 
The designs are engineered as a cohesive hybrid: blending the **visual content presentation of Netflix**, the **editorial layouts of Apple Books**, and the **organizational links and metadata blocks of Obsidian**, all packaged under the strict constraints of the **IBM Carbon Design System** (flat geometry, 0px border-radius, IBM Plex Sans typography, 1px hairlines, and IBM Blue accents).

- **Stitch Project ID:** `13602201452151720592`
- **Stitch Design System Asset:** `assets/6405064033329347764`

---

## Global Design Rules (Strict IBM Carbon & Concept Mix)

1. **Geometry & Borders**: `{rounded.none}` (0px corners) on everything—buttons, text fields, cards, and image frames. Separation of elements is achieved using 1px gray hairlines (`#e0e0e0`) and changes in background surfaces (`#ffffff` canvas vs `#f4f4f4` surface-1).
2. **Color Palette**: Pure white canvas background (`#ffffff`), alternate panels in light gray (`#f4f4f4`), primary accents in IBM Blue (`#0f62fe`), text in charcoal (`#161616`), and muted subtext in gray (`#525252`).
3. **Typography**: **IBM Plex Sans** for all labels. Large page headlines must use weight **300** (Light) to establish an authoritative, premium editorial tone.
4. **Netflix Aspect**: Media grids show content with clean aspect-ratio containers (portraits for books, posters for movies/shows), badges indicating availability platforms (e.g., "Netflix", "Prime", "Physical"), and priority watch statuses.
5. **Apple Books Aspect**: Editorial spacing, high-contrast text hierarchy, progress tracking states ("Want to Read/Watch", "In Progress", "Completed"), and clean category section rows.
6. **Obsidian Aspect**: Technical metadata sidebars showing collection files/links, bidirectional connections (e.g., "Linked in 3 Collections"), and customizable flat tag pills in sentence-case.

---

## Screen Directory & Generation Prompts

### 1. Landing Page (Public Marketing)
* **Description**: A premium, clean landing page introducing the cross-platform media watchlist service.
* **Netflix/Books/Obsidian Blend**: Large typography-driven hero grid introducing the concept, a horizontal carousel of "Trending Public Collections", and section highlights explaining collaborative editing (Obsidian-like file permissions) and multi-media tracking (Netflix/Books).
* **Endpoints**: None (public read-only preview).
* **Stitch Generation Prompt**:
  > Generate a desktop landing page for a collaborative media watchlist platform called "Watchlist Service" following the IBM Carbon design system. White canvas background, flat geometry (0px rounded corners on all cards and buttons). Top nav contains a minimalist logo, nav items in sentence case, and a primary blue button labeled "Sign in". Hero section features a weight-300 display headline "All your movies, books, and articles in one place" with a subhead and a blue primary button "Create free account". Below, show a section with a 1px border grid displaying 3 featured card columns for "Track Platform Availability" (Netflix, Apple Books logo placeholders), "Real-time Collaboration" (sharing permissions table), and "Interlinked Tagging" ( Obsidian-style tags like "sci-fi", "non-fiction"). Muted dark-gray footer.

---

### 2. Login Page
* **Description**: Simple unauthenticated login form.
* **Netflix/Books/Obsidian Blend**: Obsidian-like minimalist layout. Flat centered form box with hairline borders.
* **Endpoints**: `POST /api/auth/login`
* **Stitch Generation Prompt**:
  > Generate a minimalist, desktop login page. White canvas background. In the center, a flat rectangular form container with a 1px gray border and 32px internal padding. Display title "Log in to your library" in Plex Sans 300, 32px. Two text inputs on light gray (#f4f4f4) backgrounds with 0px rounded corners and a bottom hairline rule: "Email address" and "Password". Include a checkmark for "Remember this device" and a text link "Forgot password?" in IBM Blue. A flat solid IBM Blue primary button spanning full width, labeled "Log in". Underneath, a label "Don't have an account? Sign up" with "Sign up" styled as a blue link.

---

### 3. Registration Page
* **Description**: Registration form to create a new user profile.
* **Netflix/Books/Obsidian Blend**: Clean form inputs, side-panel with list of platform integrations.
* **Endpoints**: `POST /api/auth/register`
* **Stitch Generation Prompt**:
  > Generate a desktop signup page. Left column (40% width) is a light gray (#f4f4f4) panel displaying editorial text: a Plex Sans 300 headline "Build your media database." followed by three flat bullet rows with icons showing Netflix, Apple Books, and Obsidian connections. Right column (60% width) contains the registration form on white background: text inputs for "Username", "Email address", "Password", and "Confirm password". Inputs are flat rectangles on #f4f4f4 with bottom border rules. Flat solid IBM Blue primary button labeled "Create account".

---

### 4. Forgot Password Page
* **Description**: Allows requesting password reset emails.
* **Endpoints**: `POST /api/auth/forgot-password`
* **Stitch Generation Prompt**:
  > Generate a clean desktop password recovery screen. Flat rectangular container centered, 1px border. Plex Sans 300 header "Recover your credentials". Body text explaining the procedure. Text input field "Enter your email" (flat, gray #f4f4f4, bottom blue border focus line). IBM Blue primary button "Send reset instructions". Secondary ghost button "Back to login".

---

### 5. Reset Password Page
* **Description**: Change password with token from email.
* **Endpoints**: `POST /api/auth/reset-password`
* **Stitch Generation Prompt**:
  > Generate a desktop reset password screen. Centered flat box, 1px hairline border. Text inputs for "New password" and "Confirm password" (flat, gray background, bottom rule). Full-width primary button in blue: "Update password". Success notification indicator in success-green banner above the form if validation passes.

---

### 6. User Dashboard (Authenticated Home)
* **Description**: Central hub for logged-in users.
* **Netflix/Books/Obsidian Blend**: Netflix-style carousel rows of "Recently Added Items" and "Active Watchlists", Apple Books-style status counters, and an Obsidian-style right sidebar showing active notifications and incoming collection invitations.
* **Endpoints**: `GET /api/auth/me`, `GET /api/collections/invitations`
* **Stitch Generation Prompt**:
  > Generate a desktop user dashboard. White canvas background. Top sticky nav bar with logo, Search input, and user avatar. Left sidebar navigation containing "Dashboard", "My Collections", "Media Catalog", "Statistics", and "Settings". Main panel contains: 1) Three flat statistic counters in a row with 1px border: "Active Watchlists" (large number), "Items Tracked", "Pending Invites" (badge in red). 2) A row header "Continue Watching/Reading" with a horizontal carousel of flat cards showing movie poster and book cover placeholders with bottom progress bars. 3) A right sidebar showing "Pending Invitations" from other users with flat IBM Blue "Accept" and charcoal "Decline" buttons. Flat geometry, Plex Sans, no shadows.

---

### 7. My Collections Page
* **Description**: Lists all collections created by or shared with the user.
* **Netflix/Books/Obsidian Blend**: Apple Books style horizontal category tabs. Obsidian-style metadata table showing ownership, collaborate permissions, and item counts.
* **Endpoints**: `GET /api/collections`
* **Stitch Generation Prompt**:
  > Generate a desktop collections list screen. Left navigation panel. Main content contains a display headline "My Collections" (Plex Sans 300, 42px). Below the title, a flat horizontal tab strip: "All Collections", "Owned by me", "Shared with me", and "Public". Right-aligned "+ Create Collection" primary blue button. Below, a grid of flat watchlist cards with 1px hairline borders. Each card contains: Collection Name, short description, sentence-case tag pills (e.g., "movies", "to-read"), a count of items (e.g., "14 items"), and a small user icon group showing members. Hovered card has a light gray background (#f4f4f4) and no shadow.

---

### 8. Collection Detail Page (Private Watchlist View)
* **Description**: Inside a collection, listing the linked media, with permission-based controls.
* **Netflix/Books/Obsidian Blend**: Netflix poster grid with custom drag-and-drop order handle icons. Obsidian-style right panel showing collection details: date created, visibility settings, list of members with roles (Owner, Collaborator, Reader), and bidirectional collection links.
* **Endpoints**: `GET /api/collections/{collectionId}`, `GET /api/collections/{collectionId}/media`, `GET /api/collections/{collectionId}/members`
* **Stitch Generation Prompt**:
  > Generate a desktop collection detail screen. Display title "Sci-Fi Classics" (Plex Sans 300, 42px) with tag "Private" in a small gray chip. 12-column grid: left 8 columns show the media list in a table layout with fields: drag-handle icon, title (e.g. "Dune"), type (Movie/Book), position, and date added. Includes "+ Add Media" button at the top of the list. Right 4 columns are structured like an Obsidian side inspector with a 1px left border, showing: "Owner: Alice", "Visibility: Private (editable)", "Collaborators: Bob (Collaborator), Charlie (Reader)", and "Manage Members" tertiary blue link. Flat geometry, IBM Plex Sans, no shadows.

---

### 9. Manage Collection Members (Modal View)
* **Description**: Modal dialog for inviting members and editing permissions.
* **Endpoints**: `POST /api/collections/{collectionId}/members`, `GET /api/collections/{collectionId}/members`, `PATCH /api/collections/{collectionId}/members/{memberId}`
* **Stitch Generation Prompt**:
  > Generate a centered modal popup on top of the collection screen. The modal is a flat container on white canvas, 1px dark hairline border. Headline "Invite Collaborators" in 24px. Below is a form: a text input "User email" (flat, gray #f4f4f4) and a dropdown menu with 0px corners showing roles "Collaborator (Can view and edit)" and "Reader (Can view only)". Primary blue CTA "Send invitation". Below the form, list existing members in a table showing email, role badge, and a "Remove" button in red-60 text.

---

### 10. Global Media Catalog
* **Description**: Master listing of all media tracked in the system.
* **Netflix/Books/Obsidian Blend**: Netflix visual media cards (book covers, movie poster frames) arranged in rows, with a comprehensive Apple Books filter menu and an Obsidian-like inline search input.
* **Endpoints**: `GET /api/media`
* **Stitch Generation Prompt**:
  > Generate a desktop global media catalog page. Top search bar with a flat search input field and a "Filter by" tag bar (sentence-case pills: "Movies", "Shows", "Books", "Articles"). Main area is a dense 4-up media card grid. Each card has a flat poster/cover image placeholder (0px corners), title, author/director (e.g., "Denis Villeneuve"), release year, and availability icon list (e.g., Netflix icon, Apple Books icon). Hovering on a card displays an inline ghost button "+ Add to Watchlist". Clean flat borders, IBM Plex Sans.

---

### 11. Media Detail Page
* **Description**: In-depth view of a movie, book, or article.
* **Netflix/Books/Obsidian Blend**: Apple Books clean editorial typography page layout. Netflix poster aspect ratio. Obsidian metadata block linking to all user collections containing this media.
* **Endpoints**: `GET /api/media/{mediaId}`
* **Stitch Generation Prompt**:
  > Generate a desktop media detail page. Split 2-column layout: left column contains a large flat cover image placeholder (aspect ratio 2:3, no rounded corners). Right column contains: 1) Title "Neuromancer" (Plex Sans 300, 42px) with author "William Gibson" and type chip "Book". 2) Synopsis paragraph. 3) Metadata grid: "Release: 1984", "Genre: Cyberpunk", "Availability: Apple Books, Physical". 4) An action container with a dropdown "Add to collection..." and a flat IBM Blue button "+ Add". 5) A list of "Collections you own that contain this item" showing links with tiny collection folder icons.

---

### 12. Create/Edit Media Form
* **Description**: Interface to add a new movie, show, or book to the catalog.
* **Endpoints**: `POST /api/media`, `PATCH /api/media/{mediaId}`
* **Stitch Generation Prompt**:
  > Generate a desktop form page titled "Add new media to catalog". White background, flat containers. Form inputs arranged in columns: "Title", "Type" (dropdown menu), "Author/Director", "Release Year", "Genres/Tags" (text input with tag tokens), and "Availability/Platform" (checkboxes for Netflix, Amazon Prime, Apple Books, Spotify). Inputs are flat rectangles on #f4f4f4. Solid IBM Blue button "Create media item" and ghost button "Cancel".

---

### 13. Inbox / Invitations Page
* **Description**: Lists incoming invitations to join other watchlists.
* **Netflix/Books/Obsidian Blend**: Apple Books style inbox list. Obsidian file-sharing info panel.
* **Endpoints**: `GET /api/collections/invitations`, `POST /api/collections/{collectionId}/invitations/respond`
* **Stitch Generation Prompt**:
  > Generate a desktop inbox screen. Main content shows headline "Pending Invitations" (Plex Sans 300, 42px). List of flat invitation rows with 1px bottom borders. Each row shows: Sender email, Collection Name (as a blue link), role offered (chip showing "COLLABORATOR" or "READER"), and date received. Action buttons on the right: a flat primary blue button "Accept" and a flat charcoal button "Decline".

---

### 14. Statistics Dashboard
* **Description**: User statistics and analytics on their collection habits.
* **Netflix/Books/Obsidian Blend**: Netflix viewing metrics, Apple Books library stats, and Obsidian link network summary, displayed on clean flat IBM Carbon style charts.
* **Endpoints**: None (computes client-side from collections/media stores).
* **Stitch Generation Prompt**:
  > Generate a desktop statistics page. Title "Library Analytics" (Plex Sans 300, 42px). Grid layout containing 4 flat cards with 1px gray borders: 1) "Media Distribution" showing a flat pie chart (using IBM primary blue, success green, warning yellow, and charcoal sectors) breaking down Movies vs Books vs Articles. 2) "Active Genres" showing a horizontal bar graph of genres. 3) "Collection Connections" showing a network summary count (e.g. "Avg. 3.4 links per item"). 4) "Platform Coverage" showing percentage of list available on Netflix vs Prime vs Books.

---

### 15. User Profile Settings
* **Description**: Account settings form for editing credentials and user info.
* **Endpoints**: `GET /api/users/me`, `PATCH /api/users/me`
* **Stitch Generation Prompt**:
  > Generate a desktop settings page. Left sidebar navigation active on "Profile Settings". Main container has headline "Account Settings" (Plex Sans 300, 42px). Form sections divided by 1px rules: 1) Profile information (Username input, Email address input). 2) Security (Change password fields). 3) Integration preferences (Toggle switches for syncing with Netflix and Apple Books APIs). All buttons are flat, inputs use square geometry. Primary blue button "Save changes".
