# HTTP API

Base path: `/api`. Requests and responses use JSON. Failures return `{ "error": "Readable message" }` and an appropriate status. A successful mutation generally returns 200 with an object. Cookies authenticate the browser.

All unsafe methods require:

```http
Content-Type: application/json
X-Newsline-Client: web
```

Send `{}` for bodyless mutations. Cross-origin browser requests are rejected. Do not use this header as authentication; protected endpoints also require a valid session cookie and server-side role/ownership checks.

## Public and account endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Health and app version |
| GET | `/meta` | Categories, countries, supported language and demo flag |
| GET | `/auth/me` | Current public user or `null` |
| POST | `/auth/register` | `{name,email,password}`; creates reader and session |
| POST | `/auth/login` | `{email,password}`; starts session |
| POST | `/auth/logout` | Ends current session |
| POST | `/auth/forgot` | `{email}`; demo-only local reset outbox |
| POST | `/auth/reset` | `{token,password}`; single-use password recovery |
| PATCH | `/me` | Update own profile, interests and preferences |
| POST | `/me/password` | `{current_password,password}`; revoke other sessions |
| GET | `/me/export` | Export current user's profile and related data |

`PATCH /me` accepts `name`, `bio`, `country`, `language`, `topics`, `theme`, `font_size`, `notifications`, and `onboarded`. Supported themes: `light`, `dark`, `sepia`. Text size: 14–28. Topics must be from `/meta`; only English is supported. Email and role cannot be changed through this endpoint.

## Stories and interaction

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/articles` | Paginated published stories |
| GET | `/articles/:id` | Full published story, or authorized draft/review preview |
| POST | `/articles/:id/read` | Record signed-in read and history |
| PUT / DELETE | `/articles/:id/bookmark` | Save/update collection or remove bookmark |
| PUT / DELETE | `/articles/:id/like` | Add/remove appreciation |
| GET | `/articles/:id/comments` | Story comments with author names |
| POST | `/articles/:id/comments` | `{body,parent_id?}`; add comment/reply |
| DELETE | `/comments/:id` | Delete own comment/replies; admin may moderate |
| POST | `/articles` | Create story subject to role checks |
| PATCH | `/articles/:id` | Edit/review/publish an authorized story |
| DELETE | `/articles/:id` | Delete own story; admin may delete any |
| POST | `/uploads` | `{data:"data:image/png;base64,..."}`; upload cover |

Feed parameters: `q`, `category`, `publisher`, `feed=all|foryou|following`, `sort=latest|trending`, `page`, `limit`. Default page size is 12; maximum is 48. Pagination values are clamped to positive integers. `following` needs sign-in. `foryou` uses stored interests when available. Search covers headline, summary and body; wildcard characters are escaped.

List result:

```json
{"items":[],"total":0,"page":1,"limit":12}
```

Story detail result is `{ "article": { ... } }`. Publisher and author information are included. List responses omit full article bodies. Bookmarks are unique per user/story and `PUT` accepts `{ "collection_id": null }` or a collection owned by the current user.

Article input:

```json
{
  "title": "A perspective worth sharing",
  "excerpt": "A short introduction of at least twenty characters.",
  "body": "Full story text of at least eighty characters. Use blank lines between paragraphs for readable formatting.",
  "category": "World",
  "publisher_id": 1,
  "image": "/images/city.webp",
  "status": "draft"
}
```

Headline: 8–180 characters; summary: 20–400; body: 80–50,000. States: `draft`, `review`, `published`, `archived`. Readers may set only draft/review and cannot edit published stories. Uploads accept PNG/JPEG/WebP data URLs, at most 2 MB decoded, with signature validation. Cover references must be a bundled image or a generated upload path.

## Publishers, reading lists and notifications

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/publishers` | All publishers, counts and current follow state |
| PUT / DELETE | `/publishers/:id/follow` | Follow or unfollow |
| GET | `/collections` | Own collections and published bookmark counts |
| POST | `/collections` | `{name}`; create private collection |
| PATCH | `/collections/:id` | `{name}`; rename own collection |
| DELETE | `/collections/:id` | Delete collection, keeping bookmarks unfiled |
| GET | `/bookmarks?collection=:id` | Own bookmarks, optionally filtered |
| GET | `/history` | Last 100 recently read stories |
| DELETE | `/history` | Clear own read history |
| GET | `/notifications` | Last 100 notifications and unread count |
| PATCH | `/notifications` | Mark all own notifications read |
| GET | `/studio` | Own stories and summary counts |
| GET | `/studio?review=true` | Submitted review queue for editors/admins |

## Administration

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin` | Users, story overview and counts |
| PATCH | `/admin/users/:id` | `{role}`; change another user's role and revoke their sessions |
| PATCH | `/admin/articles/:id` | `{status:"archived"|"published"}`; moderate a story |

## Error statuses

400: validation; 401: sign-in required/invalid credentials; 403: forbidden role/origin/client header; 404: missing or inaccessible item; 409: duplicate email/collection; 413: upload/body too large; 415: wrong content type; 429: rate limit; 503: build unavailable or production password recovery not configured.

The integration test suite exercises real HTTP requests against temporary SQLite databases. See `tests/integration.test.mjs` for request examples and authorization assertions.
