# Mapbox Integration Setup

This app uses Mapbox Static Images API to generate maps for the brochure PDF.

## Environment Variables

The following environment variable is required:

```
VITE_MAPBOX_TOKEN=your_mapbox_public_token_here
```

## Local Development

1. Copy `.env.example` to `.env`
2. Replace `your_mapbox_token_here` with your actual Mapbox public token
3. Run `pnpm dev`

## Netlify Deployment

To deploy with Mapbox integration:

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add a new variable:
   - **Key**: `VITE_MAPBOX_TOKEN`
   - **Value**: Your Mapbox public token (starts with `pk.`)
4. Redeploy your site

## Token Security

The Mapbox token used is a **public token** which is safe to expose in client-side code. However, you should:

1. Restrict the token to your Netlify domain:
   - Go to https://account.mapbox.com/access-tokens/
   - Click on your token
   - Add URL restriction: `https://your-site.netlify.app/*`

2. Monitor usage at https://account.mapbox.com/

## Free Tier Limits

- 50,000 static image requests per month (free)
- This app caches the map with brochure setup, so typical usage is 1-2 API calls per group

## How It Works

1. When users generate a brochure PDF, the app:
   - Collects GPS coordinates from all POIs
   - Calculates optimal map center and zoom level
   - Generates a Mapbox Static Image URL with numbered markers
   - Fetches the map image
   - Caches it in the brochure setup (IndexedDB)
   - Embeds the cached image in the PDF

2. The map is only regenerated when brochure setup is created or updated.

This minimizes API calls and ensures fast PDF generation.
