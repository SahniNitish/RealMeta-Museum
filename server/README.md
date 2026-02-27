Setup

1. Copy `.env.example` to `.env` and fill values.
2. Start MongoDB locally or provide a cloud URI.
3. Run `npm run dev` to start the API at `http://localhost:4000`.

Routes

- `POST /api/admin/upload` field: `image` → stores file in `/uploads` and creates draft artwork.
- `POST /api/admin/:id/finalize` → save metadata.
- `GET /api/artworks` and `GET /api/artworks/:id` → public fetch.


